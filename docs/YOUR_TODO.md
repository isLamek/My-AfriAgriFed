# Your to-do list (everything only you can do)

Updated 3 October 2026. Work through it top to bottom. Tick boxes as you go.
Step-by-step detail for the technical items is in **`docs/SETUP_GUIDE.pdf`**
(section numbers are given in brackets). Anything marked **(stop)** blocks launch.

Golden rule: keys go **only** in your `.env` file and in your hosting dashboard.
Never paste a key into a chat, email, screenshot or GitHub.

---

## 1. Today (about 15 minutes)

- [ ] **Sign the GitHub tool in.** Open a **new** terminal window and run:
      `gh auth login` (choose GitHub.com, HTTPS, then sign in through the browser).
      I installed it (version 2.102.0) but it needs your account to log in. After that I
      can open pull requests for you.
- [ ] **Open the pull request** (or tell me once you are logged in and I will do it):
      https://github.com/D0MINVS98/afriagrfed/compare/main...ui-overhaul-and-commerce?expand=1
      Use the green **Create pull request** button (not the draft option). Review it, then
      merge into `main` when you are happy.

## 2. Get the keys and accounts (SETUP_GUIDE sections 2 to 4)

| Done | What | Where | Time | Notes |
|---|---|---|---|---|
| [ ] | **Firebase admin key** (2.5) | Firebase console, Project settings, Service accounts, Generate new private key | 10 min | **(stop)** Payments stay OFF without it. Turn the file into one line with the PowerShell command in the PDF, then **delete the downloaded file**. |
| [ ] | **Open-Meteo commercial plan** (2.1) | open-meteo.com/en/pricing, "API Standard", ask for a quote | 15 min + their reply | **(stop)** The free tier forbids commercial use. |
| [ ] | **NASA FIRMS key** (2.2) | firms.modaps.eosdis.nasa.gov/api/map_key | 5 min | Free. Switches on the fire layer. |
| [ ] | **Flutterwave test keys** (2.4) | dashboard.flutterwave.com (Test mode), Settings, API Keys | 10 min | Also invent a long random phrase for the webhook "Secret hash". |
| [ ] | **Cloudinary keys** (2.3) | cloudinary.com, Settings, API Keys | 5 min | You may already have these in `.env`. |
| [ ] | **Render account** (4) | render.com, sign up with GitHub | 30 min | Hosts the backend. See below. |
| [ ] | **EUMETSAT permission email** (2.6) | eumetsat.int user helpdesk | 15 min to write; days to get a reply | **(stop)** for the live satellite cloud and lightning layers. Until you have it, hide them. |
| [ ] | Map tile key, e.g. MapTiler (later) | maptiler.com | 10 min | Not wired in yet. Tell me when you have one and I will build it. |
| [ ] | E-mail service key, e.g. Resend (later) | resend.com | 10 min | Welcome emails are not built yet. |

## 3. Put the backend online, then deploy (SETUP_GUIDE sections 3 to 5)

Do these **in this order**:

- [ ] Put all keys in your local `.env` (section 3 of the PDF), restart `node server.js`.
- [ ] Create the Render web service, add the environment variables from the table in
      section 4.2 (including `FIREBASE_SERVICE_ACCOUNT_JSON`, `APP_BASE_URL`,
      `CORS_ORIGINS`, `TRUST_PROXY=1`).
- [ ] Open `https://YOUR-BACKEND/api/features`. You must see `"payments":true`,
      `"commercialWeather":true` and (if you did the FIRMS key) `"fires":true`.
- [ ] Put the backend address in `.env` as `REACT_APP_API_URL=https://YOUR-BACKEND`.
- [ ] `npm run build`, then deploy the website and database rules together:
      `npx firebase-tools login` (first time only), then
      `npx firebase-tools deploy --only "hosting,firestore:rules" --project afriagrifed-ebc30`
      (the PDF has a fallback command if `npx` cannot download the tool).
- [ ] In Flutterwave, set the webhook address to
      `https://YOUR-BACKEND/api/payments/webhook` and the Secret hash to the same
      phrase as `FLW_SECRET_HASH` on Render (section 6).

## 4. Right after you deploy (about 10 minutes, do not skip)

- [ ] **Verify your own e-mail.** The new rules only treat an admin's e-mail as
      valid once it is verified. Sign in as the founder and open the Admin area:
      you will see "Verify your e-mail". Open the link in the e-mail (check spam),
      then press **I have verified my e-mail**. If you skip this you cannot reach the
      Admin Dashboard.
- [ ] **Confirm the founder seat is claimed.** Firebase console, Firestore, `system`,
      `bootstrap`: it must say `founderClaimed: true`. If it does not, claim it now
      while signed in as yourself, before anyone else can.
- [ ] **Spot-check existing accounts** in the Verification Queue. Anyone shown as
      approved with no reviewer recorded may have approved themselves before the fix.
- [ ] **Delete the downloaded Firebase key file** from your Downloads folder.

## 5. Test before any real money moves (use Flutterwave TEST keys)

I tested everything with fake services, never against the real Flutterwave or your
real Firebase project, and the Firestore rules could not be tested in the emulator
(no Java on this machine). So please run these yourself:

- [ ] **Seller:** create a farmer account, open My Listings, save bank details
      ("Payouts are set up"), post a listing with a quantity.
- [ ] **Buyer:** a second account buys 2 units with a test card. Check: charged
      price x 2, one order in the Order Tracker for both people, the seller got a
      notification, and the listing's quantity dropped by 2.
- [ ] **Reload the payment return page.** There must still be only one order.
- [ ] **Close the tab before returning** from Flutterwave on another test purchase.
      The webhook must still create the order.
- [ ] **Last unit:** buy the last unit twice quickly from two accounts. The listing
      must stop at "Sold out" and the second order shows the "needs attention" note.
- [ ] **Order steps:** seller confirms, dispatches, marks in transit; buyer confirms
      delivery. Check the notification bell each time.
- [ ] **Promotion:** a farmer pays for one; it appears as active afterwards.
- [ ] **Rules (staging project):** try, from the browser console, to write
      `approved: true` on your own profile and to create an order. Both must be refused.
- [ ] **Farmer tools:** add a farm on the Map, log inputs, check totals, delete a record.
- [ ] **Demand Board:** a buyer posts a request; a farmer pledges; the buyer is
      notified; an institution can post a request but cannot pledge.
- [ ] **Phone:** open the Map and the marketplace on a real phone with weak signal.

## 6. People and paperwork (these take weeks, start now)

- [ ] **Agronomist review of the crop thresholds** in `src/farmview/cropRules.js`
      (Ministry of Agriculture, Water and Land Reform extension officers, or the
      Namibia Agronomic Board). Until then keep the "Indicative only" wording.
- [ ] **Namibia Meteorological Service:** ask about a data-sharing agreement for
      official forecasts and rain-station readings (the map shows global-model data).
- [ ] **Privacy policy and terms of use** that mention location data, farm records,
      payments and weather sources. Needs your legal text or a lawyer.
- [ ] **Admin access for teammates:** only grant it **after** they have created their
      account and verified their e-mail.
- [ ] **Rotate old secrets.** Replace any key that was ever committed to GitHub,
      pasted in a chat, or shared (Cloudinary, Flutterwave, Firebase).
- [ ] **Backups:** schedule a Firestore export in Google Cloud.

## 7. Decisions I need from you (I picked a default so I am not blocked)

- [ ] **Sold-out listings.** I made them stay visible as "Sold out" with Buy
      switched off (the seller restocks by editing the quantity). Say if you would
      rather they disappear.
- [ ] **Student verification.** Any photo currently unlocks free access (your
      original design). Say if an admin should approve students instead.
- [ ] **Stock while paying.** Two people can both start paying for the last unit;
      the second gets a "needs attention" order instead of a refusal up front.
      Say if you want stock held while someone is on the payment page.
- [ ] **Which map tile provider** (MapTiler is my suggestion) and whether to
      keep the Esri satellite basemap for launch.

## 8. What I am doing without you

Already built and pushed: Map with verified regions, live weather, satellite and fire layers;
farmer farms and input log; Order Tracker; clear Community Feed / Demand Board /
Marketplace; rebuilt Data, Statistics and Promotions pages; cached weather backend;
server-side payments; quantities and stock; the admin self-approval fix; and
e-mail verification (this change).

Next, unless you redirect me: tighten notification and listing rules, a seller
"orders needing attention" view, and a pass over the remaining signed-in pages
(Research, Training, Internships, Profile, Admin) for layout and wording.
