# AfriAgriFed: what to do before launch

Plain-language list of what **you** need to do, in order of importance. Items
marked 🔴 block a public launch; 🟡 should be done soon after; 🟢 is polish.
Technical detail is in `docs/FARMVIEW_PLAN.md` (build plan) and
`docs/DATA_SOURCES.md` (where every number on the map comes from).

## 1. Things that must work first 🔴

| # | Task | Why |
|---|------|-----|
| 0 | **Follow `docs/SETUP_GUIDE.pdf`.** It walks through every key, the Render hosting setup, and the final checks, step by step. The rows below are the summary. | |
| 1 | **Host the backend (`server.js`).** It handles Flutterwave payments and Cloudinary uploads and is not hosted anywhere today. Pick a host (Render, Railway, Fly.io, or similar), add the keys below as that host's *environment variables*, and note its URL. | Today the live site is built with `REACT_APP_API_URL=http://localhost:5000`, so payments and image uploads cannot work for real visitors. Orders only exist after a payment succeeds, so the Order Tracker stays empty until this is fixed. |
| 2 | **Rebuild the site pointing at that URL**: set `REACT_APP_API_URL=https://your-backend-url` in `.env`, run `npm run build`, then deploy. | The URL is baked into the website when it is built. |
| 3 | **Deploy the security rules**: `firebase deploy --only firestore:rules`. | Sellers cannot update orders and farmers cannot save farms until the new rules are live. The rules are written but have **not been tested in the Firebase emulator** (this machine has no Java), so test them once in a staging project first. |
| 4 | **Payments are now recorded by the server (built).** The backend prices every order from the listing, pays the seller's own account, verifies who is buying (Firebase sign-in) and creates the order exactly once from a confirmed Flutterwave transaction (via the buyer's return page *or* the webhook). Browsers can no longer create orders, activate promotions or unlock paid pages (`firestore.rules`). **You must add the Firebase admin key** (`FIREBASE_SERVICE_ACCOUNT_JSON`, see `docs/SETUP_GUIDE.pdf` 2.5); without it payments stay OFF. Deploy the backend first, then the website and rules together. | Stops fake orders, price tampering and payout redirection. Tested with fakes; **not yet run against real Flutterwave test mode and a real Firebase project** (do the test purchase in section 6). |
| 5 | **Test a full purchase with Flutterwave TEST keys**, then switch to live keys. | Money flow must be proven before real money moves. |

## 2. Licences and permissions 🔴

The map uses free public data. Free is not always the same as "allowed for a
business". Because AfriAgriFed takes a commission, it counts as commercial.

| Source | Today | What to do |
|---|---|---|
| **Open-Meteo** (all weather forecasts) | **Now routed through `server.js`**, which uses `OPEN_METEO_API_KEY` and its commercial address once set. Free tier is **non-commercial only** (I read their pricing page on 2 Oct 2026: 10,000 calls/day, no commercial use). | Buy a commercial plan (Standard = 1 million calls/month; prices are not published, ask info@open-meteo.com). Put the key in `OPEN_METEO_API_KEY`. |
| **EUMETSAT** (live satellite clouds and lightning) | Free for personal / non-commercial use; **other uses need EUMETSAT's authorisation**; credit "©EUMETSAT" is required. I could not open their licence page, so this comes from a search summary and must be confirmed. | Write to EUMETSAT (user helpdesk on eumetsat.int), describe the app, and ask for written permission for commercial display of Meteosat/MTG imagery. Until you have it, you can hide the satellite layers in `src/farmview/config.js`. |
| **Esri World Imagery** (satellite basemap) and **OpenStreetMap public tiles** | Used directly. OSM's tile servers are not meant for production traffic; Esri's imagery has its own terms for apps. | Use a paid/commercial tile provider for launch (MapTiler is the usual choice): create a key, restrict it to your website address, put it in `REACT_APP_MAPTILER_KEY`. I will wire it in once you have it. |
| **OpenStreetMap data** (the 14 region borders) | Allowed with credit. The credit is shown on the map. | Nothing, keep the credit visible. |
| **NASA data** (rainfall normals) | Public domain. | Nothing. |

## 3. Accounts and keys you need to create

Keep keys **only** in `D:\Desktop\afriagrfed-main\.env` on your computer, and in
your backend host's "environment variables" screen. **Never** paste them into
chat, source files, screenshots or Git. After editing `.env`, stop and restart
`npm start` / `node server.js`.

Only values starting with `REACT_APP_` end up inside the public website, so
never put a secret there.

| Key | What it switches on | Where to get it | Name in `.env` | Cost |
|---|---|---|---|---|
| Open-Meteo commercial key | Weather at launch | open-meteo.com → Pricing | `OPEN_METEO_API_KEY` | Paid (contact them) |
| Map tiles key | Production basemap | maptiler.com → Account → API keys, **restrict by website** | `REACT_APP_MAPTILER_KEY` | Free tier, paid for commercial use (check) |
| NASA FIRMS map key | Fire hotspots near farms (not built yet) | firms.modaps.eosdis.nasa.gov/api/map_key | `FIRMS_MAP_KEY` | Free |
| Email service | Welcome emails (not built yet) | resend.com or sendgrid.com | `EMAIL_API_KEY`, `EMAIL_FROM` | Free tier, then paid |
| Cloudinary, Flutterwave | Image uploads, payments (already in the code) | Their dashboards | already named in `.env.example` | Per their pricing |

Nothing else is needed: the wind, temperature, rain, soil, flood, region and
satellite layers use keyless public services.

## 4. Accuracy: who should check what 🟡

I verified what I could against official figures (the 14 region areas match the
census table within 0.5%, 16 towns land in the right region, satellite times
are live). What I cannot verify is **local agronomy**.

| Ask | Who |
|---|---|
| Review the crop thresholds in `src/farmview/cropRules.js` (rain and temperature ranges for mahangu, sorghum, cowpea, groundnut, bambara, maize, watermelon). | Ministry of Agriculture, Water and Land Reform (MAWLR) extension officers or the Namibia Agronomic Board |
| Official local forecasts and rainfall-station readings (the map shows global-model forecasts at about 25 km resolution; they can miss local storms). | Namibia Meteorological Service (ask about a data-sharing agreement) |
| Regional borders and population figures for the official record. | Namibia Statistics Agency / Office of the Surveyor General |
| Flood information for the Cuvelai / *iishana* floods. | The national water and hydrology authorities |
| Soil information before a soil-based crop layer is shown. | MAWLR soil maps (global soil data is coarse in Namibia) |

Until the crop thresholds are reviewed, keep the "Indicative only" wording
(the app already shows it).

## 5. Safety, privacy and legal 🟡

- **Welcome emails with a username and password (concept note step 3).** Please do not email passwords. Send a "set your password" link instead; I can build it.
- **Farm locations are private** (only the owner and admins can read them). If you later want farms visible to buyers, that must be opt-in and rounded to about 1 km.
- Add a **privacy policy and terms** that mention location data, farm records and weather sources.
- Rotate every secret that was ever committed or shared (Cloudinary, Flutterwave, Firebase service accounts).
- Decide who can create farms: today only accounts of type *farmer*.

## 6. Before you press "go" 🟡

1. Sign in as a **farmer**: add a farm, record inputs, check the totals, delete a record, delete the farm.
2. Sign in as a **buyer**: buy something (test keys), then as the seller confirm, dispatch, mark in transit; as the buyer confirm delivery. Check the notification bell each time.
3. Open the map on a **phone with weak signal**; check it loads and the time bar works.
4. Check the live site after a hard refresh (`Ctrl+Shift+R`).
5. Make a Firestore **backup/export** schedule.

## 7. Known gaps (so nobody is surprised)

- Weather and satellite layers are fetched from the visitor's browser. At launch the forecast grid should be fetched once an hour **on the server** and shared (one request instead of one per visitor). Not built yet.
- The infrared cloud layer is shown as grey satellite tiles; a "clouds only" transparent version is a polish item.
- Fire hotspots, crop suitability as a map layer (needs soil data), and farms/orders visible to others on the map are not built.
- The farmer screens and rules have not been exercised against the real Firebase project.

## 8. Payments: known gaps after the server-side rewrite

- **Stock and quantities (built).** Buyers choose a quantity; the server charges price x quantity, refuses more than is in stock, and subtracts the units from the listing once the payment is confirmed (atomically, and only once per payment). A listing that reaches zero stays visible as "Sold out" with Buy disabled and drops out of the Data Dashboard price board; the seller restocks by editing the quantity. If two buyers pay for the last units at the same moment, stock never goes below zero: the later order is kept (they have paid), flagged "needs attention" for both people, and the seller is notified to contact the buyer or arrange a refund.
- **Reserving stock while a buyer is on Flutterwave's page is not built.** Two buyers can both start paying for the last unit; the one who finishes second gets the "needs attention" flag above rather than a polite refusal at the start.
- **Student self-verification is honour-system.** Any photo unlocks free access (the existing product decision). Paid unlocks, by contrast, can now only be written by the server.
- **Refunds and cancellations** are still done by hand in the Flutterwave dashboard, and an admin updates the order.
- **Order-status changes** (confirmed, dispatched, in transit, delivered) are still written by the seller and buyer from the browser under the existing rules, which only allow legal moves.
- **Test it before going live**: with Flutterwave *test* keys, make a purchase as buyer A from seller B (who has saved bank details), check one order appears for both, reload the return page and confirm no second order, then try the same with the buyer closing the tab before returning (the webhook must still create it).

## 9. Account security: what was fixed and what you must confirm

**Fixed (in `firestore.rules`, needs deploying):**
- Anyone could write `approved: true` into their own profile and skip the admin Verification Queue, so a fake "farmer" or "institution" could get in with no documents checked. New profiles must now start unapproved and pending, and an owner can no longer change `approved`, `status`, `accountStatus` or `userType`. Only admins can.
- The public **Quick Access** page created accounts that wrote `userType: "admin"` and `approved: true` into their own profile. It is now development-only (the route and the sign-in link do not exist in production builds) and writes no profile.

**Please confirm (I cannot see your live database):**
1. **The founder seat is already claimed.** While no founder exists, the rules let the first signed-in person make themselves founder. In the Firebase console open Firestore, then `system`, then `bootstrap`: it should show `founderClaimed: true`. If it does not, sign in as the real founder and claim it now.
2. **Admin e-mails are not verified by Firebase.** Admin rights are given to an e-mail address. Firebase lets anyone sign up with any e-mail address without proving they own it. So if you grant admin access to a teammate's e-mail *before* they have created their account, someone else could register that address first and become admin. **Procedure until e-mail verification is added:** grant admin access only after the teammate has created their account and signed in once. The proper fix is to send a verification e-mail at sign-up and require `email_verified` in the rules; it is not built because switching it on would lock out any existing admin whose e-mail was never verified.
3. **Existing accounts.** Profiles created before this change keep whatever they have. In the Admin Dashboard's Verification Queue, spot-check farmers and institutions that show as approved but have no reviewer recorded (`reviewedBy` empty): those may have approved themselves.

**Still open (not changed):** anyone signed in can create notifications for anyone (spam risk), and the per-listing "verified farmer" status is not enforced when creating listings or demands (the dashboards check it in the browser only). Both are worth tightening once the first real users are on board.

