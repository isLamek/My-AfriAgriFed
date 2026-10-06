// scripts/seedAdmins.js
//
// One-time helper to grant founder/developer admin access directly, and to
// inspect the live database, using the Firebase Admin SDK. This bypasses the
// in-app "claim founder" bootstrap flow entirely, so it also works after a
// founder seat already exists (e.g. to add a second founder or a developer).
//
// Setup (not committed - keep this file's credentials out of git):
//   1. Firebase Console -> Project Settings -> Service Accounts
//      -> Generate new private key -> save as serviceAccountKey.json in the
//      project root (already covered by .gitignore).
//   2. npm install firebase-admin --save-dev
//   3. Edit the ADMINS_TO_SEED list below.
//   4. node scripts/seedAdmins.js
//
// This script is also how to get real answers about "how is our database
// built" beyond what's inferable from the client code: run
// `node scripts/inspectDatabase.js` (see sibling script) once the service
// account key is in place.

const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error(
    "Missing serviceAccountKey.json in the project root.\n" +
      "Download it from Firebase Console -> Project Settings -> Service Accounts " +
      "-> Generate new private key, save it there, then re-run this script."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Edit this list, then run the script.
const ADMINS_TO_SEED = [
  { email: "shimbaliefraim98@gmail.com", role: "founder" },
  // { email: "developer@example.com", role: "developer" },
];

async function seed() {
  const batch = db.batch();

  for (const entry of ADMINS_TO_SEED) {
    const email = entry.email.trim().toLowerCase();
    const ref = db.collection("admins").doc(email);

    batch.set(
      ref,
      {
        email,
        role: entry.role,
        addedBy: "seedAdmins.js",
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  batch.set(
    db.collection("system").doc("bootstrap"),
    { founderClaimed: true, claimedBy: "seedAdmins.js", claimedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  await batch.commit();

  console.log(`Seeded ${ADMINS_TO_SEED.length} admin(s):`);
  ADMINS_TO_SEED.forEach((entry) => console.log(`  - ${entry.email} (${entry.role})`));
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed admins:", error);
    process.exit(1);
  });
