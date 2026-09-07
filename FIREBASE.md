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

No Firebase CLI session was available here, so these are written to
`firestore.rules` and `database.rules.json` but not deployed. Either:

- Paste `firestore.rules` into Firebase Console -> Firestore Database ->
  Rules -> Publish, and `database.rules.json`'s contents into Realtime
  Database -> Rules -> Publish, or
- Run `npm install -g firebase-tools`, `firebase login`, `firebase deploy
  --only firestore:rules,database`.

**Confirmed live, not a guess:** I created a real test farmer account and tried
posting a marketplace listing end-to-end. Sign-up/sign-in and reading/writing
your own `users` doc already work on the live project (there's an existing
custom ruleset covering those). Writing to `admins`, `system`, and the new
`marketPrices` self-write rule all failed with "Missing or insufficient
permissions" - exactly as expected, because those rules only exist in this
repo's `firestore.rules` file, not on the live project yet. Once you deploy
this file, admin claiming, `/my-listings`, and payments all start working
with no code changes needed.

**One more one-time step after deploying rules:** a few queries need a
Firestore composite index the first time they run - the notification bell
(`where userId ==` + `orderBy createdAt`), MyOrders.js (`where buyerId ==` +
`orderBy createdAt`), and MyListings.js's Recent Sales (`where sellerId ==` +
`orderBy createdAt`). Each one, the first time it runs, prints a direct
"create it here" link to the Firebase Console in the browser console - click
it, click Create, wait a minute for it to build. This is normal for any new
where+orderBy query combination, not a bug.

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
