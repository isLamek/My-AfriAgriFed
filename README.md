# AfriAgriFed

Connects farmers, consumers and agricultural institutions on one platform
(Firebase for auth/data, Cloudinary for images/PDFs, Flutterwave for
split payments).

## Project layout

- `public/`, `src/` - the React app (Create React App / `react-scripts`).
- `server.js` - Express backend: Cloudinary upload signing + Flutterwave
  payment endpoints.
- `scripts/` - one-off Node scripts that use the Firebase Admin SDK
  (`seedAdmins.js`, `inspectDatabase.js`) - see `FIREBASE.md`.
- `firestore.rules`, `database.rules.json`, `firebase.json` - Firebase
  security rules and CLI config.
- `FIREBASE.md` - database schema, admin access control, and how to connect
  with real Firebase credentials.
- `legacy-build-artifacts/` - a stale production build that used to live at
  the project root (kept for reference, not used by anything).

## Local setup

```bash
npm install
cp .env.example .env   # fill in Cloudinary / Flutterwave keys as you get them
npm start               # React dev server on :3000
node server.js          # Express backend on :5000 (needs Cloudinary keys)
```

`DISABLE_ESLINT_PLUGIN=true` is set in `.env.example` - this Node/npm
version combination hits a known `react-scripts@5` + `eslint-plugin-jest`
incompatibility unrelated to the app's code ("Environment key jest/globals
is unknown"); this only skips the lint pass, not type/syntax checking.

## Deploying

Hosting the app for real? Rotate every secret below - the ones in this repo
right now are development-only:

- Firebase config in `src/firebaseConfig.js` (the API key here is safe to
  keep public - Firebase locks things down via `firestore.rules` /
  `database.rules.json`, not by hiding this key).
- `server.js`'s Cloudinary and Flutterwave credentials, via `.env` (never
  commit it - see `.gitignore`).
- Deploy `firestore.rules` and `database.rules.json` before going live -
  see `FIREBASE.md`.
