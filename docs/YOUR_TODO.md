# Your to-do list (everything only you can do)

Updated 3 October 2026. Work through it top to bottom. Tick boxes as you go.
Step-by-step detail for the technical items is in **`docs/SETUP_GUIDE.pdf`**
(section numbers are given in brackets). Anything marked **(stop)** blocks launch.

Golden rule: keys go **only** in your `.env` file and in your hosting dashboard.
Never paste a key into a chat, email, screenshot or GitHub.

---

## Now (7 October 2026)

- [ ] **Deploy the latest build.** In a Command Prompt, from the project folder, run
      `scripts\deploy-live.cmd`: it gets the latest `main`, runs the tests, builds the site with
      no backend address (your `.env` says `localhost:5000`, which must never go live), checks that,
      and deploys the site and the database rules together. Or by hand (Claude can build it but is
      not allowed to deploy):
      `npx firebase-tools deploy --only "hosting,firestore:rules,database" --project afriagrifed-ebc30`
- [ ] **Put your real Cloudinary cloud name in `.env`.** It still says `your-cloud-name`.
      Cloudinary dashboard, top of the page, "Cloud name":
      `REACT_APP_CLOUDINARY_CLOUD_NAME=...`. Then check that an **unsigned** upload preset named
      `aaf_unsigned` exists (Settings, Upload, Upload presets; allowed formats
      `jpg,jpeg,png,webp,gif,heic,pdf,doc,docx`; max 20 MB). Rebuild and deploy.
      Until then, profile photos still work (a small copy is stored), but listing photos and
      documents can't upload.
- [ ] **NASA FIRMS key: done** (it is in `.env` and works). The fire layer shows on the live
      site only once the backend (`server.js`) is hosted (Render, section 2.6).
- [ ] **Add your BIPA registration number and registered name** to `src/business.js`
      (shown on the legal pages).
- [ ] **Have a lawyer read** `/terms`, `/privacy` and `/refunds` (text in `src/legalContent.js`),
      and check the refund rules match how you want to work.
- [ ] **Photo licences:** see `docs/IMAGE_CREDITS.md` for the older photos with no recorded
      source (some home page photos too). `farm4.jpg` had a stock watermark and was removed.
- [ ] **GitHub:** the work is on branch `rebuild`, which already contains everything on `main`
      (the contributor's commits are merged in, nothing overwritten). Say the word and Claude
      pushes it so both repositories' `main` match. If you add the deploy key
      (`FIREBASE_SERVICE_ACCOUNT_AFRIAGRIFED_EBC30`) on GitHub, every push to `main` deploys
      the site by itself.

---

## Delivery and tracking (branch `delivery`, 16 November 2026): your part

Sellers can now offer collection, their own delivery, or an AfriAgriFed carrier; buyers use a basket
and checkout; orders are tracked on a live map; the buyer's 6-digit code completes a delivery; buyers
can report problems. Read **`docs/DELIVERY.md`** (how it works, what is missing). Try it with
`npm run backend:local` (fake payments, nobody is charged) next to `npm run start:local`.

- [ ] **Talk to your teammate who builds the payment hold (escrow).** The delivery code never moves
      money; it calls `server/escrowHooks.js` at the right moments. They fill that file in, and merge
      the few lines I changed in `server/checkout.js` (listed in `docs/DELIVERY.md`). Until then the
      seller is still paid at once, so the handover code and objection window only record intent.
- [ ] **Have the flat-split payment line tested in Flutterwave's test mode** (`transaction_charge_type:
      "flat_subaccount"` in `server/checkout.js`). It is written from their docs, not run against them.
- [ ] **Find your first carriers.** Ask 3 to 5 transporters (bakkie and truck owners in Oshakati,
      Ongwediva, Windhoek) to open *Deliver for us* and apply; approve them in the Admin Dashboard after
      checking their licence and vehicle registration. Without any approved carrier the "AfriAgriFed
      carrier" option will just wait for someone.
- [ ] **Check the prices** in `src/delivery/rules.js` (carrier fee N$35 + N$8 per km, minimum N$60,
      carrier share 85%) with real transporters. They are placeholders.
- [ ] **Decide how carriers get paid** (bank transfer from the *Done* list each week is fine to start).
- [ ] **Lawyer:** add the handover code, the 24 h / 72 h objection windows, the 24 h acceptance rule and
      who is paid the delivery fee to the Terms and the Refund policy.
- [ ] **Backend timer:** the server runs the timeouts itself every 10 minutes. If your host sleeps when
      idle (Render free), also create a free cron job at cron-job.org calling `POST /api/delivery/sweep`
      with the header `x-sweep-secret` and set `SWEEP_SECRET` in your host's settings.
- [ ] **Deploy the database rules together with the site** (new collections: `orderSecrets`,
      `deliveryJobs`, `deliveryPrivate`, `orderTracking`, `disputes`, `carriers`).

---

## Languages (branch `i18n`, 15 November 2026): your part

Afrikaans is built and works on your computer (`npm run start:local`, pick the language at the
top). Oshiwambo and Otjiherero are not started. Read `docs/I18N.md` for how it all works.

- [ ] **Look at Afrikaans yourself first**: sign in with the test accounts and click around in
      Afrikaans. Tell Claude anything that reads oddly. When you are happy, say so and the
      branch can be merged into `main`.
- [ ] **Get a native Afrikaans speaker to read it** (the text is machine-assisted by Claude, not
      yet checked by a person): give them `docs/i18n/review/af.csv` (opens in Excel or Google
      Sheets), ask them to correct the `af` column, then send it back; Claude imports it.
      Until then the site shows "This translation is new" under the language picker.
- [ ] **Decide the Oshiwambo question**: Oshikwanyama, Oshindonga, or both? And find the people
      who will translate (and later check) Oshiwambo and Otjiherero. There is no free machine
      translation for either, so these are written by people. When you have them, tell Claude
      and it prepares the same spreadsheet for each language.
- [ ] **Privacy policy: add one sentence** (a lawyer should word it): when a member presses
      "Translate" under someone's post, the text of that one post may be sent to a free online
      translation service (MyMemory, translated.net) if the browser cannot translate it itself.
      It is never used for private messages. To switch this off completely set
      `REACT_APP_TRANSLATE_PROVIDER=browser` (nothing leaves the device) or `off` in `.env`.
- [ ] **Deploy the database rules together with the site.** Notifications now carry a text key
      so each person reads them in their own language; `firestore.rules` was extended for it.
      Deploy with the usual command (it includes `firestore:rules`); the site and the rules go
      live at the same time.
- [ ] **Legal pages and the Admin area stay English** for now. If you want the Terms, Privacy and
      Refund pages in Afrikaans, they need a qualified legal translator.

---

## 0. DEPLOYED on 5 October 2026: do these two things NOW

The website, the main database rules and the community-posts rules went live at
**https://afriagrifed-ebc30.web.app** (built with no backend address, so nothing points at
localhost). Because the new rules are live:

- [ ] **Verify your own e-mail, today.** Sign in as the founder and open the Admin area. You
      will see "Verify your e-mail": open the link in the e-mail (check spam), then press
      **I have verified my e-mail**. Until you do, the Admin Dashboard will not open.
- [ ] **Confirm the founder seat is claimed** (Firestore, `system`, `bootstrap`,
      `founderClaimed: true`).

**What works on the live site right now:** the Map (weather loads straight from Open-Meteo's
free tier, so it is non-commercial until you buy a plan), Community Feed, Demand Board,
Marketplace browsing, Data/Statistics/Promotions pages, Research/Training/Internships,
sign-in and registration for consumers.

**What does NOT work yet, by design, until the backend is online (sections 2 and 3):**
payments and promotions ("Payments are being set up"), seller payout setup, photo and
document uploads (so new farmer and institution registrations, which need documents, and
post photos cannot complete), fire hotspots, and the shared weather cache.

## 1. Today (about 15 minutes)

- [ ] **Sign the GitHub tool in.** Open a **new** terminal window and run:
      `gh auth login` (choose GitHub.com, HTTPS, then sign in through the browser).
      I installed it (version 2.102.0) but it needs your account to log in. After that I
      can open pull requests for you.
- [x] **GitHub `main` now holds this project (done 5 Oct 2026).** `main` and the old
      working branch shared no history, so a pull request was impossible. At your choice
      I saved the old June upload as the branch `archive/june-upload` and pointed `main`
      at the current work. The branch `ui-overhaul-and-commerce` is the same commit and
      can be deleted on GitHub whenever you like. Render and any other host should use
      the branch `main`.

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
      `npx firebase-tools deploy --only "hosting,firestore:rules,database" --project afriagrifed-ebc30`
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
      approved with no `adminReview.reviewedBy` on their profile (Firestore, `users`) may have
      approved themselves before the fix.
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
- [ ] **Your real farmers can still post listings.** The rules now let only *approved*
      farmers create marketplace listings. Sign in as one of your genuine approved
      farmers and post a listing. If it is refused, tell me the account's approval
      fields (Firestore, `users`, that farmer's document) and I will adjust.
- [ ] **A farmer still waiting for approval cannot post a listing** (try a new one).
- [ ] **Community posts still work after the new Realtime Database rules:** as a normal
      user create a post (with and without a photo), comment, reply, like, then delete
      your own post. All must work. (Trying to post "as" someone else, or with a picture
      from another website, is now refused.)
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
farmer farms and input log; Order Tracker (now also flags orders the seller could not
fill in full); clear Community Feed / Demand Board / Marketplace; rebuilt Data,
Statistics and Promotions pages; Research, Training and Internships moved into the app
(sidebar, brand colours); cached weather backend; server-side payments; quantities and
stock; the admin self-approval fix; e-mail verification; tighter notification and
listing rules.

Next, unless you redirect me: a review pass over the Admin Dashboard and the three
questionnaires (wording, layout, phone view), and the Realtime Database rules for posts.
