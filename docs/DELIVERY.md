# Orders, delivery and tracking

How an order gets from a seller's farm to a buyer's door on AfriAgriFed, who does what, what
the server checks, and where the money side plugs in. Written 16 November 2026.

AfriAgriFed owns **no vehicles**. So every order can reach the buyer in one of three ways, and
the seller decides which ones they offer:

| Way | Who drives | Who is paid the delivery fee |
|---|---|---|
| **Collect** | the buyer fetches it from the seller | nobody (free) |
| **Seller delivers** | the seller, in their own vehicle | the seller (they set a base fee, a fee per km and a maximum distance) |
| **AfriAgriFed carrier** | a registered transporter from our network (bakkie, truck, car) | the carrier gets 85% (`PLATFORM_RATE.carrierShare`), AfriAgriFed keeps the rest |

## The journey of one order

```
 listing (seller)        basket / checkout (buyer)          order                   on the road              done
 ───────────────         ─────────────────────────          ─────                   ───────────              ────
 price, stock,    ──►    pick items from ONE seller  ──►   paid ──► confirmed ──► dispatched ──► in transit ──► delivered
 place on the map        choose collect / seller /          (seller has 24 h)    (ready)       (live map)      (handover code)
 how buyers can get it   carrier, drop a pin, pay                                                                 │
                                                                                          objection window 24 h ◄─┘
                                                                                          (72 h if no code was used)
```

1. **Post.** A listing has a price, stock, a pin on the map (its pick-up place) and
   `delivery: { collect, platform, own: { enabled, baseFee, perKm, maxKm } }`. A listing with no
   delivery settings (every older listing) is collection only, exactly as before.
2. **Basket.** Kept in the buyer's browser (`src/cart/cart.js`), grouped by seller, because one
   payment is one seller (one trip, one payout account). The basket re-checks price and stock when
   it is opened. Nothing about money is stored in it.
3. **Checkout** (`/checkout`). The browser sends only listing ids, quantities and an address. The
   **server** (`server/basket.js`) looks everything up, works out the fee (distance by road
   = straight line x 1.3, a bakkie at 55 km/h), refuses a fee that changed since the buyer saw it
   (`delivery_price_changed`), and starts the payment for items + fee.
4. **Paid → order.** When the payment is confirmed the server creates the order, takes the stock off
   (each listing once, even if the confirmation arrives twice), and creates the buyer's **6-digit
   handover code** (`orderSecrets/{id}`, readable by the buyer only).
5. **Seller accepts** (paid → confirmed) and marks it **ready** (→ dispatched). They have 24 hours
   to accept; after that the order is cancelled, the goods go back on sale and a refund is
   requested (the sweep, below).
6. **Carrier orders only:** the seller presses *Ask for a carrier* (ready time, a phone number, how to
   find them). A **job** appears on the Deliveries board (`/carrier`) of every approved carrier whose
   vehicle can take the load and whose regions fit. The first to press *Take this job* gets it
   (atomic: two carriers can never both win). Until then the job shows only rough places (about
   1 km) and no phone numbers; the exact addresses and phones open up for the carrier who took it.
7. **On the road.** The carrier (or the seller who delivers themselves) presses *I have collected
   the goods* / *Mark as in transit*; the order's page now shares their live position (the page
   must stay open; it asks the browser to keep the screen on). The buyer sees the vehicle on a map
   with distance and time left, and a notice when it is within 1 km and when it has arrived.
8. **Handover.** The buyer gives the 6-digit code to whoever hands over the goods; that person types
   it in. That is the buyer's "I have it" and completes the order (`delivered`). Five wrong codes
   lock the order for support. If the buyer cannot show the code (flat phone) the handover can be
   recorded **without** it, with a written reason; the buyer then has 72 hours instead of 24 to
   object. The buyer can also press *Confirm delivery* themselves.
9. **Objection window.** After delivery the buyer can report a problem until `releaseAt` (24 h after
   a code handover, 72 h after a handover without the code). Nothing is paid out before that.
   A reported problem freezes the order (`disputed`); support decides in the Admin Dashboard
   (*Problems reported by buyers*): pay the seller, or refund the buyer (the goods go back on sale).
10. **Cancelling.** The buyer can cancel until the seller accepts. The seller can decline (with a
    reason the buyer sees) until the order is dispatched. After that only support can cancel.

## Why it is built this way (the problems it answers)

| Problem | What the system does |
|---|---|
| A buyer says "never arrived" / a driver says "delivered" | The handover code is the proof. Without it the handover is marked unverified and the objection window is longer. |
| A seller never answers a paid order | Auto-cancel and refund after 24 h; stock restored. |
| Nobody wants a delivery job | Escalated to the seller and the Admin Dashboard after 6 h. |
| Two carriers grab one job | `updateIf` is atomic: one wins, the other gets `job_taken`. |
| A fake or unsafe driver | Carriers apply and an admin approves; they can be suspended; a carrier can't enlarge their vehicle class without a new approval (rules). |
| Privacy | The job shows only ~1 km-rounded places. Exact addresses and phones go to the buyer, the seller and the carrier who holds the job. The vehicle's route is deleted when the order ends. |
| Stock | One order may hold several listings; each is counted once; if another buyer got there first only that line is flagged as short. |
| No street addresses in Namibia | A pin on the map plus a description in words ("blue gate behind the garage") and a phone number. |
| Heavy loads | The load is estimated in kg from the units; it picks car / bakkie / truck; a load too heavy for one carrier asks the buyer to message the seller. |
| Spoilage | The buyer picks a day and morning/afternoon; the carrier sees it. A problem can be reported for 24 h. |
| Time zone | All dates are Namibian time (UTC+2, no daylight saving). |
| Old orders | Orders paid before this behave exactly like "the seller delivers" and keep working. |

## What the money side must do (for the person building payments / holding the payment)

The delivery code **never moves money**. Everywhere money should move it calls one function in
**`server/escrowHooks.js`**. Replace the bodies (they only write a `payoutStatus` field today); keep
the names, the moments and the return value (fields to save on the order). If a hook throws, the
delivery step has already happened, the error is logged and the sweep tries again.

| Hook | Moment | What it should do |
|---|---|---|
| `onDelivered(order)` | goods handed over (with or without code) | keep the money held; `order.releaseAt` is the earliest release |
| `onReleaseDue(order)` | `releaseAt` passed, no problem reported | pay the seller (and the carrier for `fulfilment.method === "platform"`: `carrierPay(fee)` is in `src/delivery/rules.js`) |
| `onCancelled(order, why)` | cancelled (`buyer`, `seller`, `support`, `seller_timeout`) | refund the buyer in full |
| `onDisputed(order)` | the buyer reported a problem | make sure nothing is paid out |
| `onResolved(order, outcome)` | support decided `release` or `refund` | pay the seller / refund the buyer |

Fields on an order that belong to this contract: `payoutStatus`, `releaseAt`, `releasedAt`,
`amount`, `itemsTotal`, `deliveryFee`, `fulfilment.method`. A payment for a platform delivery has the
fee inside `amount`; the fee belongs to AfriAgriFed, not the seller.

**Changes made inside `server/checkout.js`** (so they can be merged with the payment work):
`HttpError` moved to `server/httpError.js`; `priceOrder` now calls `priceBasket` (`server/basket.js`);
`finalize` builds the order with `delivery.buildOrderDoc`, creates the handover code and reserves
stock per item; `initiate` passes the seller's exact share (`transaction_charge_type:
"flat_subaccount"`) when there is a delivery fee. **That last part is written from Flutterwave's
split-payment docs and has not been run against Flutterwave: test it in their test mode.** The base
URL can be overridden with `FLW_BASE_URL` (only used by the local test backend).

**Until the payment is really held in escrow**, the existing Flutterwave split still pays the seller
immediately: the handover code, objection window and refunds only record intent.

## Timeouts (`LIMITS` in `src/delivery/rules.js`, run by `sweep()` in `server/delivery.js`)

| What | Default |
|---|---|
| Seller must accept a paid order | 24 h |
| A carrier job may wait for a carrier | 6 h, then escalated |
| Objection window after a code handover / after a handover without the code | 24 h / 72 h |
| Wrong handover codes before the order locks | 5 |
| Vehicle position saved no more often than | every 10 s |
| A position older than this is shown as "last seen" | 5 min |

The sweep runs inside the server every 10 minutes. A free outside timer (cron-job.org) can also call
`POST /api/delivery/sweep` with header `x-sweep-secret: <SWEEP_SECRET>`. Both are safe together.

## Prices (all in `src/delivery/rules.js`; change them there)

* AfriAgriFed carrier fee: `max(N$60, (N$35 + N$8 per km) x vehicle rate)`, rounded up to a whole
  dollar; rate 0.7 car/motorbike (up to 40 kg), 1.0 bakkie (up to 1 ton), 1.9 truck (up to 8 tons);
  not offered beyond 800 km. The carrier gets 85% of the fee.
* Seller's own fee: `baseFee + perKm x km`, with the seller's own maximum distance. When one basket
  holds several listings the strictest of their settings applies.
* These are starting numbers, not market research: check them with a few real transporters.

## Where things live

| | |
|---|---|
| Rules shared by site and server (fees, distance, vehicles, addresses, code) | `src/delivery/rules.js` |
| Basket pricing (server) | `server/basket.js` |
| Delivery routes, handover, cancel, dispute, sweep | `server/delivery.js` |
| The money plug-in point | `server/escrowHooks.js` |
| Order states and who may do what (site) | `src/orderStatus.js`, mirrored in `firestore.rules` |
| Checkout, basket, carrier page, order card | `src/Checkout.js`, `src/Cart.js`, `src/Carrier.js`, `src/delivery/OrderDelivery.js` |
| Admin (carriers, problems, stuck jobs) | `src/AdminDelivery.js` |
| Tests | `src/delivery/*.test.js`, `src/orderStatus*.test.js`, `src/cart/cart.test.js`, `npm run rules-check` |

Firestore collections added: `orderSecrets`, `deliveryJobs`, `deliveryPrivate`, `orderTracking`,
`disputes`, `carriers` (all written by the server only, except a person's own `carriers` application).

## Trying it all on your computer

```
npm run emulators        # terminal 1
npm run seed             # once (and again to reset the test orders)
npm run backend:local    # terminal 2: the backend with FAKE payments, nobody is charged
npm run start:local      # terminal 3: the website on http://localhost:3001
```

Test accounts (password `Test-AfriAgriFed-2026`): `buyer@`, `farmer@` (the seller), `carrier@` (an
approved carrier), `carrier2@` (waiting for approval), `admin@` (all `@aaf.test`). The seeded
orders are in every stage; **every seeded order's handover code is 123456**. After a re-seed, sign
out and in again (the seed resets the accounts' sessions).

## Not done yet (decisions and next steps)

* **Money:** the escrow itself (see above), carrier payouts (shown as "paid out by AfriAgriFed"; do
  them by hand at first from the *Done* list), and the Flutterwave flat-split check.
* **Carrier identity:** applications are checked by an admin by phone; there is no document upload
  yet (the Admin Dashboard text says what to ask for).
* **Tracking only works while the carrier's page is open.** A phone app that tracks in the background
  would need a native app; for now the page asks the browser to keep the screen awake and the buyer
  sees "last seen N minutes ago" when positions stop.
* **No SMS or WhatsApp:** buyers and carriers are told through the in-app bell only. Adding SMS
  needs a paid gateway or WhatsApp Business.
* **Road routing:** distance is a straight line x 1.3, not a routed road distance (the free routing
  servers are not meant for commercial traffic). It is good enough to price; a routing service can
  replace `roadKm` later.
* **Live animals and cold goods** have no special handling (permits, refrigeration): treat them as
  collect-only or arrange them by message until there are rules for them.
* **Ratings** for carriers and sellers after a delivery.
* **Legal text** (Terms, Refunds) must mention the handover code, the objection windows (24 h / 72 h),
  the 24 h acceptance rule and who is paid the delivery fee: have the lawyer add it.
