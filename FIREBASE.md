# Firebase setup: schema, admin access, and how to connect for real

I don't have Firebase credentials for this project (no service account key, no
`firebase login` session was available in this environment), so the schema
below is reverse-engineered from the app's code, not pulled live from your
Firestore console. `scripts/inspectDatabase.js` (added in this change) will
print the real, live version once you give it a service account key - see
"Connecting for real" below.

## Project

- Project ID: `afriagrifed-ebc30`
- Firestore + Realtime Database + Auth, all in the same Firebase project
  (`firebaseConfig.js`).

## Firestore collections

| Collection | Key | Written by | Notes |
|---|---|---|---|
| `users` | uid | Register.js | `userType`: farmer/consumer/institution, `accountStatus`, `documents`, `questionnaireData` |
| `admin` | uid | *(manual, legacy)* | Old admin flag scheme. Still checked for backward compatibility. |
| `admins` | lowercase email | AdminDashboard.js | **New.** `{ email, role: founder\|developer\|moderator, addedBy, addedAt, uid }` |
| `system/bootstrap` | — | AdminDashboard.js | Singleton doc `{ founderClaimed, claimedBy, claimedAt }` gating the one-time founder self-claim |
| `publicStats/summary` | — | AdminDashboard.js | PII-free aggregate counts, refreshed whenever an admin opens the dashboard, read by the public Data Dashboard |
| `marketPrices` | auto | MyListings.js (farmer) | **New write UI.** `{ product, price, unit, quantity, sellerId, sellerName, sellerSubaccountId }`, read by ConsumerDashboard's Marketplace tab |
| `institutionResearchArticles` | auto | InstitutionDashboard.js | `{ title, summary, category, sourceName, articleUrl, image, pdf, authorId, respondsToProblemId }` |
| `researchProblems` | auto | Research.js (farmer) | **New.** `{ title, description, farmerId, farmerName, status: open\|answered, answeredArticleId }` |
| `trainingPrograms` | auto | TrainingPrograms.js (institution) | **New.** `{ title, description, mode, location, startDate, institutionId }` |
| `internships` | auto | Internships.js (farmer/institution) | **New.** `{ type: offer\|request, status: open\|claimed\|approved\|closed, postedById, claimedById, approvedById }` |
| `promotions` | auto | Promotions.js (farmer) | **New.** `{ productName, description, imageUrl, startDate, endDate, farmerId }` |
| `notifications` | auto | notifications.js | **New.** `{ userId, title, body, link, read }` - the bell icon reads this |
| `telemetry` | auto | telemetry.js | **New.** `{ eventType, uid, email, meta, path, createdAt }` - powers the Admin Dashboard's activity charts |
| `orders` | auto | payments.js (after a verified Flutterwave charge) | **New.** `{ buyerId, sellerId, product, amount, transactionId, status }`. Read by MyOrders.js (buyer view) and MyListings.js's Recent Sales (seller view) |
| `demandRequests` | auto | DemandBoard.js (any signed-in user) | **New.** The concept note's "Chat board" - buyers post what they need, producers team up to meet it. `{ title, product, quantityNeeded, unit, deadline, notes, buyerId, buyerName, buyerType, status: open\|fulfilled }` |
| `demandRequests/{id}/pledges` | auto | DemandBoard.js (farmer/producer) | **New.** `{ farmerId, farmerName, quantity, note, createdAt }` - summed client-side against `quantityNeeded` for the progress bar |
| `demandRequests/{id}/messages` | auto | DemandBoard.js (any signed-in user) | **New.** `{ authorId, authorName, text, createdAt }` - per-post coordination thread, permanent (no update/delete) |

## Realtime Database

| Path | Written by | Notes |
|---|---|---|
| `posts` | ConsumerDashboard.js, TrainingPrograms.js | Community feed. Training program posts get auto-mirrored here. |
| `farmerVerification` | *(external/legacy)* | Read by adminBlock.js's verification queue |

## What was missing before this change

- **No security rules were tracked anywhere** (`firestore.rules` /
  `database.rules.json` didn't exist in the repo). That either means the
  project is still on Firebase's default test-mode rules (wide open, and
  they expire) or rules were hand-edited in the console with nothing to
  review or restore from. Both are added now - see "Deploying rules" below.
- Admin status only worked by uid, in a collection nobody had tooling to
  write to - functionally nobody could become an admin without someone
  manually creating a Firestore document by hand.
- No telemetry, no notifications, no way to answer "how many research
  articles have been published" without opening the console.

## Admin access control (founders & developers)

1. First admin (founder): sign in with the account that should be the
   founder, then visit `/admin/dashboard`. Because no admin exists yet,
   you'll see "Claim Founder Access" - click it. This writes `admins/<your
   email>` with `role: founder` and flips `system/bootstrap.founderClaimed`
   so the claim option disappears for everyone else from then on.
2. Adding developers/other founders: from `/admin/dashboard`, a founder can
   grant access to any email address directly (they don't need to have
   signed up yet - it resolves the first time they do).
3. Roles: `founder` (full access, can manage other admins), `developer`
   (full dashboard/telemetry access, cannot manage admins), `moderator`
   (reserved for a future cut-down verification-only role).
4. Prefer doing this without the UI (e.g. scripting several developers at
   once)? Use `scripts/seedAdmins.js` with a service account key.

## Deploying the rules

**Both `firestore.rules` and `database.rules.json` are deployed to the live
project** (`afriagrifed-ebc30`) via `firebase deploy --only
firestore:rules,database` - the app at https://afriagrifed-ebc30.web.app runs
against the same rules committed in this repo. If you change either file,
redeploy with:

```
firebase login   # one-time, opens a browser sign-in
firebase deploy --only firestore:rules,database --project afriagrifed-ebc30
```

or paste the file contents into Firebase Console -> Firestore Database /
Realtime Database -> Rules -> Publish.

**A real bug that shipped and was later fixed:** the `system/bootstrap`
singleton (gates the one-time founder self-claim) originally only had `allow
update`, with `allow create: if false`. Since that document never exists on a
fresh project, the very first founder claim's write is a *create*, not an
*update* - so it was hard-blocked no matter who tried it or whether the rest
of the rules were deployed correctly. Fixed by allowing `create` under the
same conditions as `update` (see `firestore.rules`). If you ever add another
singleton/bootstrap-style document, watch for this exact trap.

**One more one-time step after deploying new rules:** a `where` + `orderBy`
query on two different fields needs a Firestore composite index the first
time it runs - currently the notification bell (`where userId ==` +
`orderBy createdAt`), MyOrders.js (`where buyerId ==` + `orderBy createdAt`),
and MyListings.js's Recent Sales (`where sellerId ==` + `orderBy createdAt`).
Each one, the first time it runs, prints a direct "create it here" link to
the Firebase Console in the browser console - click it, click Create, wait a
minute for it to build. This is normal for any new where+orderBy combination,
not a bug. (DemandBoard.js's queries were deliberately kept to a single
`orderBy` with no `where`, so they don't need one.)

## Connecting for real (live inspection, bulk admin seeding)

1. Firebase Console -> Project Settings -> Service Accounts -> "Generate new
   private key". Save the downloaded file as `serviceAccountKey.json` in the
   project root (already in `.gitignore` - never commit it).
2. `npm install firebase-admin --save-dev`
3. `node scripts/inspectDatabase.js` - prints every real collection, how
   many documents are in it, and a sample document's field names.
4. `node scripts/seedAdmins.js` - edit the `ADMINS_TO_SEED` list first.

## Payments (online payment / commission split)

`server.js` now exposes Flutterwave-backed endpoints
(`/api/payments/subaccounts`, `/api/payments/initiate`,
`/api/payments/verify/:id`, `/api/payments/webhook`) that split every sale
automatically: the buyer pays the full price, Flutterwave routes the
platform's cut (`PLATFORM_COMMISSION_RATE`, defaults to 5% per the concept
note's financial model) and the rest to the seller's Flutterwave subaccount.

This is wired end-to-end (`payments.js`, the "Buy" button in the Marketplace
tab, `/payment-callback`) but **needs real Flutterwave API keys** to do
anything - copy `.env.example` to `.env` and fill in `FLW_SECRET_KEY` (get a
free test key from the Flutterwave dashboard to try it safely first).

Farmers now have a full self-service UI for this at `/my-listings`
(`MyListings.js`): a "Set up payouts" form (business name, bank picked from
a live `GET /api/payments/banks` list, account number) that calls
`POST /api/payments/subaccounts` once and stores the resulting
`flutterwaveSubaccountId` on `users/{uid}`, plus create/edit/delete for their
own `marketPrices` listings. A listing's "Buy" button on the consumer side
activates automatically once its `sellerSubaccountId` is set.
