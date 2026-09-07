// scripts/inspectDatabase.js
//
// Connects to the real Firestore + Realtime Database with the Firebase Admin
// SDK and prints what's actually in there: collection names, document
// counts, and a sample document from each so you can see real field shapes
// instead of guessing from the client code.
//
// Setup: same serviceAccountKey.json as scripts/seedAdmins.js.
// Run: node scripts/inspectDatabase.js

const admin = require("firebase-admin");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error(
    "Missing serviceAccountKey.json in the project root - see scripts/seedAdmins.js for how to get one."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://afriagrifed-ebc30-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.firestore();
const rtdb = admin.database();

async function inspectFirestore() {
  console.log("\n=== Firestore ===");

  const collections = await db.listCollections();

  if (collections.length === 0) {
    console.log("(no top-level collections found)");
    return;
  }

  for (const col of collections) {
    const snap = await col.limit(50).get();
    console.log(`\n- ${col.id}  (showing up to 50; use console for exact count)`);
    console.log(`  documents fetched: ${snap.size}`);

    if (!snap.empty) {
      const sample = snap.docs[0];
      console.log(`  sample doc id: ${sample.id}`);
      console.log(`  sample fields: ${Object.keys(sample.data()).join(", ")}`);
    }
  }
}

async function inspectRealtimeDb() {
  console.log("\n=== Realtime Database (top-level keys) ===");

  const snap = await rtdb.ref("/").once("value");
  const data = snap.val();

  if (!data) {
    console.log("(empty)");
    return;
  }

  Object.entries(data).forEach(([key, value]) => {
    const count = value && typeof value === "object" ? Object.keys(value).length : 1;
    console.log(`- ${key}: ${count} item(s)`);
  });
}

async function main() {
  await inspectFirestore();
  await inspectRealtimeDb();
  process.exit(0);
}

main().catch((error) => {
  console.error("Inspection failed:", error);
  process.exit(1);
});
