// Payments (Flutterwave), with the server as the only authority.
//
// The browser may only ASK to pay for a thing ("this listing", "this promotion",
// "this page"). The server decides what it costs, who gets the money, and, once
// Flutterwave confirms the charge, creates the order / activates the promotion /
// unlocks the page, exactly once. Nothing the browser sends can change an amount
// or a payout account, and the browser can no longer create orders itself
// (firestore.rules forbids it).
//
// Money flow for a marketplace order: the buyer pays the listed price and
// Flutterwave routes the seller's share to the seller's subaccount automatically.
//
// If Firebase admin access or the Flutterwave key is missing the server REFUSES to
// start a payment: taking money it cannot record is the worst failure.

const crypto = require("crypto");

const FLW_BASE_URL = "https://api.flutterwave.com/v3";
const CURRENCY = "NAD";
const PAGE_KEYS = ["data", "statistics"];
const PAGE_PRICE = 5; // N$ per page (concept note)
const PROMOTION_RATE_PER_DAY = 30; // N$ per working day (concept note)
const MAX_QUANTITY = 1000; // units in one order

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const round2 = (n) => Math.round(n * 100) / 100;
const isId = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(s); // a Firestore id, never a path
const isEmail = (s) => typeof s === "string" && s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Mon-Fri days from start to end inclusive. Dates are YYYY-MM-DD; 0 when invalid. UTC so the answer never depends on the server's time zone. */
function countWorkingDays(startDate, endDate) {
  const ok = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  if (!ok(startDate) || !ok(endDate)) return 0;
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (end < start) return 0;
  let count = 0;
  for (let t = start; t <= end; t += 86400000) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function register(app, deps) {
  const {
    store,
    verifyToken,
    fetchImpl = globalThis.fetch,
    secretKey = "",
    secretHash = "",
    appBaseUrl = "http://localhost:3000",
    limiter,
    log = console,
    random = () => Math.random().toString(36).slice(2, 8),
    nowMs = Date.now,
  } = deps;

  const guard = limiter ? [limiter] : [];
  const ready = !!(store && verifyToken && secretKey);

  // ---- helpers ---------------------------------------------------------------
  const route = (handler) => async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.code, message: error.message });
      }
      log.error("[payments]", error);
      res.status(500).json({ error: "server_error", message: "Something went wrong on our side. Please try again." });
    }
  };

  const needsSetup = (req, res, next) =>
    ready
      ? next()
      : res.status(503).json({ error: "payments_not_ready", message: "Payments are being set up. Please try again soon." });

  const requireUser = route(async (req, res, next) => {
    const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!match) throw new HttpError(401, "sign_in_required", "Please sign in first.");
    try {
      req.user = await verifyToken(match[1]);
    } catch {
      throw new HttpError(401, "sign_in_required", "Your sign-in has expired. Please sign in again.");
    }
    next();
  });

  async function flw(path, { method = "GET", body } = {}) {
    let res;
    try {
      res = await fetchImpl(`${FLW_BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new HttpError(502, "payment_provider_unavailable", "The payment provider could not be reached. Please try again.");
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      // not JSON
    }
    return { ok: res.ok, data };
  }

  async function notify(userId, { title, body, link }) {
    if (!userId) return;
    try {
      await store.add("notifications", { userId, title, body, link, read: false, createdAt: store.now() });
    } catch (error) {
      log.warn("[payments] could not notify:", error.message);
    }
  }

  // ---- what is being bought, and what it costs: decided HERE --------------------
  async function priceOrder(user, body) {
    if (user.anonymous) throw new HttpError(403, "sign_in_required", "Please sign in with your account to buy.");
    if (!isId(body.listingId)) throw new HttpError(400, "bad_request", "Choose a listing to buy.");
    const quantity = body.quantity === undefined ? 1 : body.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new HttpError(400, "bad_quantity", `Choose a whole number of units from 1 to ${MAX_QUANTITY}.`);
    }
    const listing = await store.get(`marketPrices/${body.listingId}`);
    if (!listing) throw new HttpError(404, "listing_not_found", "That listing is no longer available.");
    const price = Number(listing.price);
    if (!Number.isFinite(price) || price <= 0) throw new HttpError(409, "listing_unpriced", "This listing has no valid price.");
    if (typeof listing.quantity === "number") {
      if (listing.quantity <= 0) throw new HttpError(409, "sold_out", "This listing is sold out.");
      if (quantity > listing.quantity) {
        throw new HttpError(409, "not_enough_stock", `Only ${listing.quantity} ${listing.quantity === 1 ? "is" : "are"} available.`);
      }
    }
    if (!listing.sellerId) throw new HttpError(409, "listing_unavailable", "This listing cannot be bought right now.");
    if (listing.sellerId === user.uid) throw new HttpError(400, "own_listing", "You can't buy your own listing.");

    // The payout account comes from the seller's own record, never from the browser.
    const seller = await store.get(`users/${listing.sellerId}`);
    const subaccount = seller && seller.flutterwaveSubaccountId;
    if (!subaccount) throw new HttpError(409, "seller_not_ready", `${listing.sellerName || "This seller"} hasn't set up online payment yet. Use \"Message seller\" on the listing to ask them to set it up.`);

    return {
      amount: round2(price * quantity),
      description: `${quantity > 1 ? `${quantity} x ` : ""}${listing.product || "Marketplace order"}`,
      subaccount,
      record: {
        listingId: body.listingId,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName || "",
        product: listing.product || "",
        quantity,
        unit: listing.unit || "",
        unitPrice: round2(price), // what one unit cost when it was bought, whatever the seller changes later
      },
    };
  }

  async function pricePromotion(user, body) {
    if (!isId(body.promotionId)) throw new HttpError(400, "bad_request", "Choose a promotion to pay for.");
    const promo = await store.get(`promotions/${body.promotionId}`);
    if (!promo) throw new HttpError(404, "promotion_not_found", "That promotion could not be found.");
    if (promo.farmerId !== user.uid) throw new HttpError(403, "not_yours", "That promotion belongs to someone else.");
    if (promo.status !== "pending_payment") throw new HttpError(409, "already_paid", "That promotion has already been paid for.");
    const days = countWorkingDays(promo.startDate, promo.endDate);
    if (days === 0) throw new HttpError(409, "bad_dates", "The promotion's dates cover no working days.");
    return {
      amount: round2(days * PROMOTION_RATE_PER_DAY),
      description: `Promotion: ${promo.productName || "product"} (${days} working day${days > 1 ? "s" : ""})`,
      record: { promotionId: body.promotionId, workingDays: days },
    };
  }

  function pricePageAccess(user, body) {
    if (!PAGE_KEYS.includes(body.pageKey)) throw new HttpError(400, "bad_request", "Unknown page.");
    return {
      amount: PAGE_PRICE,
      description: `${body.pageKey === "statistics" ? "Statistics" : "Data"} Dashboard access`,
      record: { pageKey: body.pageKey },
    };
  }

  // ---- POST /api/payments/initiate ---------------------------------------------
  app.post(
    "/api/payments/initiate",
    ...guard,
    needsSetup,
    requireUser,
    route(async (req, res) => {
      const body = req.body || {};
      const user = req.user;
      const kind = body.kind;

      let priced;
      if (kind === "order") priced = await priceOrder(user, body);
      else if (kind === "promotion") priced = await pricePromotion(user, body);
      else if (kind === "page_access") priced = pricePageAccess(user, body);
      else throw new HttpError(400, "bad_request", "Unknown payment type.");

      const email = isEmail(body.email) ? body.email : user.email;
      if (!isEmail(email)) throw new HttpError(400, "email_required", "An email address is needed for the receipt.");

      const txRef = `aaf-${nowMs()}-${random()}`;
      await store.set(`payments/${txRef}`, {
        kind,
        buyerId: user.uid,
        buyerName: user.name || user.email || "",
        amount: priced.amount,
        currency: CURRENCY,
        status: "pending",
        createdAt: store.now(),
        ...priced.record,
      });

      const payload = {
        tx_ref: txRef,
        amount: priced.amount,
        currency: CURRENCY,
        redirect_url: `${appBaseUrl}/payment-callback`,
        customer: { email, name: user.name || user.email || email },
        customizations: { title: "AfriAgriFed", description: priced.description },
        meta: { kind, buyerId: user.uid },
      };
      if (priced.subaccount) payload.subaccounts = [{ id: priced.subaccount }];

      const { data } = await flw("/payments", { method: "POST", body: payload });
      if (!data || data.status !== "success" || !data.data?.link) {
        await store.update(`payments/${txRef}`, { status: "failed" }).catch(() => {});
        throw new HttpError(502, "payment_start_failed", "Could not start the payment. Please try again.");
      }
      res.json({ link: data.data.link, txRef, amount: priced.amount });
    })
  );

  // ---- finalising a payment: used by the buyer's return page AND the webhook ----
  /**
   * Confirm a transaction with Flutterwave and, if it is genuine, do the thing it
   * paid for. Safe to run any number of times for the same transaction.
   */
  async function finalize(transactionId) {
    if (!/^\d{1,20}$/.test(String(transactionId))) return { verified: false, reason: "bad_transaction_id" };

    const { data } = await flw(`/transactions/${transactionId}/verify`);
    const tx = data && data.data;
    if (!data || data.status !== "success" || !tx || tx.status !== "successful") return { verified: false, reason: "not_successful" };

    const payment = typeof tx.tx_ref === "string" && tx.tx_ref.startsWith("aaf-") ? await store.get(`payments/${tx.tx_ref}`) : null;
    if (!payment) return { verified: false, reason: "unknown_reference" }; // not a payment we started

    // What Flutterwave actually charged must cover what WE priced.
    if (tx.currency !== payment.currency || !(Number(tx.amount) >= payment.amount)) {
      log.warn(`[payments] amount mismatch on ${tx.tx_ref}: charged ${tx.amount} ${tx.currency}, expected ${payment.amount} ${payment.currency}`);
      return { verified: false, reason: "amount_mismatch" };
    }

    const base = { verified: true, purpose: payment.kind, buyerId: payment.buyerId };
    if (payment.status === "completed") return { ...base, ...(payment.result || {}), already: true };

    let result = {};
    if (payment.kind === "order") {
      const orderId = `tx_${tx.id}`; // same transaction can never become two orders
      const quantity = payment.quantity || 1; // payments started before quantities existed
      const created = await store.create(`orders/${orderId}`, {
        buyerId: payment.buyerId,
        buyerName: payment.buyerName,
        sellerId: payment.sellerId,
        sellerName: payment.sellerName,
        product: payment.product,
        listingId: payment.listingId,
        quantity,
        unit: payment.unit || "",
        unitPrice: payment.unitPrice ?? payment.amount,
        stockApplied: false,
        oversold: false,
        amount: payment.amount,
        currency: payment.currency,
        transactionId: String(tx.id),
        txRef: tx.tx_ref,
        status: "paid",
        statusHistory: [{ status: "paid", by: payment.buyerId, at: nowMs(), note: "Payment received" }],
        createdAt: store.now(),
        updatedAt: store.now(),
      });
      const what = `${quantity > 1 ? `${quantity} x ` : ""}${payment.product}`;
      if (created) {
        await notify(payment.sellerId, {
          title: "New order",
          body: `${what} was just paid for. Confirm it to start fulfilment.`,
          link: "/track-orders",
        });
      }

      // Take the units off the listing, once. If another buyer got there first
      // there may be fewer left than were paid for: the order is kept (the buyer
      // has paid) and flagged so the seller can deal with it straight away.
      const stock = await store.reserveStock({ orderPath: `orders/${orderId}`, listingPath: `marketPrices/${payment.listingId}`, quantity });
      if (stock.applied && stock.oversold) {
        await notify(payment.sellerId, {
          title: "Order needs your attention",
          body: `Only ${stock.available} of ${what} were left when this order was paid, so it cannot be filled in full. Message the buyer from Orders to agree a partial delivery or a refund.`,
          link: "/track-orders",
        });
      }
      result = { orderId };
    } else if (payment.kind === "promotion") {
      await store.update(`promotions/${payment.promotionId}`, {
        status: "active",
        paidAmount: payment.amount,
        transactionId: String(tx.id),
      });
      result = { refId: payment.promotionId };
    } else if (payment.kind === "page_access") {
      await store.set(`pageAccess/${payment.buyerId}`, { [payment.pageKey]: true, updatedAt: store.now() }, { merge: true });
      result = { refId: payment.pageKey };
    } else {
      return { verified: false, reason: "unknown_kind" };
    }

    await store.update(`payments/${tx.tx_ref}`, { status: "completed", transactionId: String(tx.id), completedAt: store.now(), result });
    return { ...base, ...result };
  }

  // The buyer's return page asks this once Flutterwave redirects back.
  app.get(
    "/api/payments/verify/:transactionId",
    ...guard,
    needsSetup,
    requireUser,
    route(async (req, res) => {
      const outcome = await finalize(req.params.transactionId);
      // Only the person who paid may see the details of the payment.
      if (outcome.verified && outcome.buyerId !== req.user.uid) {
        throw new HttpError(403, "not_yours", "That payment belongs to someone else.");
      }
      const { buyerId, ...visible } = outcome; // eslint-disable-line no-unused-vars
      res.json(visible);
    })
  );

  // Flutterwave calls this when a payment succeeds, even if the buyer closed the
  // tab before returning to the site. Dashboard -> Settings -> Webhooks.
  app.post(
    "/api/payments/webhook",
    route(async (req, res) => {
      if (!secretHash || !safeEqual(req.headers["verif-hash"] || "", secretHash)) return res.status(401).end();
      if (!store) return res.status(503).end(); // Flutterwave retries later

      const event = req.body || {};
      const id = event.data && event.data.id;
      if (event.event === "charge.completed" && id) {
        await finalize(id); // an error here becomes a 500, so Flutterwave retries
      }
      res.status(200).end();
    })
  );

  // ---- bank list and seller payout setup -----------------------------------------
  app.get(
    "/api/payments/banks",
    ...guard,
    route(async (req, res) => {
      if (!secretKey) throw new HttpError(503, "payments_not_ready", "Payments are being set up. Please try again soon.");
      const country = /^[A-Za-z]{2}$/.test(req.query.country || "") ? req.query.country : "NA";
      const { data } = await flw(`/banks/${country}`);
      if (!data || data.status !== "success") throw new HttpError(400, "banks_unavailable", "Could not load the bank list.");
      res.json({ banks: data.data });
    })
  );

  // One-time setup per seller: creates the Flutterwave subaccount that receives their share.
  app.post(
    "/api/payments/subaccounts",
    ...guard,
    needsSetup,
    requireUser,
    route(async (req, res) => {
      const { businessName, accountBank, accountNumber } = req.body || {};
      if (!businessName || !accountBank || !accountNumber) {
        throw new HttpError(400, "bad_request", "Business name, bank and account number are required.");
      }
      if (req.user.anonymous) throw new HttpError(403, "sign_in_required", "Please sign in first.");

      const commissionRate = Number(deps.commissionRate) || 0.05;
      const { data } = await flw("/subaccounts", {
        method: "POST",
        body: {
          account_bank: accountBank,
          account_number: accountNumber,
          business_name: businessName,
          business_email: req.user.email,
          split_type: "percentage",
          split_value: 1 - commissionRate,
          meta: [{ metaname: "sellerId", metavalue: req.user.uid }],
        },
      });
      if (!data || data.status !== "success") throw new HttpError(400, "subaccount_failed", "Could not set up payouts. Check the bank details and try again.");

      // The caller's own record, written here so it can't be pointed at someone else's account.
      await store.set(`users/${req.user.uid}`, { flutterwaveSubaccountId: data.data.id }, { merge: true });
      res.json({ subaccountId: data.data.id });
    })
  );

  return { ready, finalize };
}

module.exports = { register, countWorkingDays, PAGE_PRICE, PROMOTION_RATE_PER_DAY, CURRENCY };
