# AfriAgriFed

Digitalizing Africa's food security from African soil. One platform that
connects farmers, consumers and agricultural institutions in Namibia.

- **Community:** a Community Feed for conversation, a Demand Board where buyers
  post bulk needs and producers pledge to supply them, and a Marketplace with
  quantities, stock and secure payments.
- **Map:** all 14 Namibian regions with live weather (wind, rain, temperature),
  satellite clouds and lightning, fire hotspots, crop guidance, and each
  farmer's own farms and input costs.
- **Orders:** an Order Tracker from payment to delivery, with notifications.
- **Insight:** Data, Statistics and Promotions pages built from real activity.
- **Learning:** research articles, training programs and internships.

Built with React (Create React App), Firebase (auth, Firestore, Realtime
Database, hosting), an Express backend (`server.js`), Cloudinary (images and
PDFs) and Flutterwave (split payments).

## Start here

| If you are... | Read |
|---|---|
| the owner, getting ready to launch | [`docs/YOUR_TODO.md`](docs/YOUR_TODO.md): every step only you can do, in order |
| setting up keys, hosting and deployment | [`docs/SETUP_GUIDE.pdf`](docs/SETUP_GUIDE.pdf): step by step, written for a first-timer |
| checking what is safe to launch | [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md): licences, payments, security, known gaps |
| asking where a number on the map comes from | [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) |
| planning further work | [`docs/FARMVIEW_PLAN.md`](docs/FARMVIEW_PLAN.md) |
| looking at the database | [`FIREBASE.md`](FIREBASE.md) |

## Project layout

- `src/` - the React app. `src/farmview/` is the map's data and logic
  (regions, weather grid, satellite, fires, crop rules, farm inputs).
- `server.js` + `server/` - the backend:
  - `checkout.js`: payments. The server is the only authority on prices,
    payout accounts and orders; the browser only asks to pay.
  - `weather.js`, `fires.js`, `ttlCache.js`, `rateLimit.js`: one cached copy of
    weather and fire data shared by every visitor, with API keys kept private.
  - `firebaseAdmin.js`, `store.js`: server access to the database.
- `firestore.rules`, `database.rules.json`, `firebase.json` - security rules
  and Firebase CLI config. `src/rules.test.js` fails if a key protection is
  removed.
- `public/` - static files, including the region boundaries.
- `scripts/` - one-off Node scripts that use the Firebase Admin SDK
  (`seedAdmins.js`, `inspectDatabase.js`); see `FIREBASE.md`.
- `docs/` - the guides listed above.
- `legacy-build-artifacts/` - a stale production build kept for reference,
  not used by anything.

## Run it locally

```bash
npm install
cp .env.example .env    # fill in keys as you get them; nothing is needed to just look around
npm start               # website on http://localhost:3000
node server.js          # backend on http://localhost:5000 (needs Cloudinary keys to start)
```

Without keys the map still works (it falls back to Open-Meteo's free,
non-commercial tier), the fire layer stays hidden, and payments stay off.
Every key, and what it switches on, is listed in `.env.example`.

Needs Node 18 or newer.

```bash
npm test                # unit tests (Jest)
npm run build           # production build
```

`DISABLE_ESLINT_PLUGIN=true` is set in `.env.example`: this Node/npm
combination hits a known `react-scripts@5` + `eslint-plugin-jest`
incompatibility ("Environment key jest/globals is unknown"). It only skips the
lint pass.

## Deploying

Follow [`docs/SETUP_GUIDE.pdf`](docs/SETUP_GUIDE.pdf). In short: put the
backend online with all its keys first (payments stay off without the Firebase
admin key), check `/api/features`, then build and deploy the website and the
rules together:

```bash
npm run build
npx firebase-tools deploy --only "hosting,firestore:rules,database" --project afriagrifed-ebc30
```

Never commit `.env` or a Firebase service-account key (both are in
`.gitignore`). The Firebase web config in `src/firebaseConfig.js` is safe to
keep public: Firebase is locked down by the rules, not by hiding that key.

## Licences and data

Weather, satellite and fire data come from Open-Meteo, EUMETSAT and NASA FIRMS.
Open-Meteo's free tier and EUMETSAT's imagery are non-commercial, so a
commercial launch needs a paid Open-Meteo plan and EUMETSAT's permission. See
[`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) and the launch checklist.
