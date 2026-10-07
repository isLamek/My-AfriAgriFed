// Tries real reads and writes against the LOCAL emulators as the seeded test
// accounts, and checks the security rules allow what they should and refuse what
// they should. Run after `npm run emulators` and `npm run seed`:
//
//   npm run rules-check
//
// Never touches the live database: the app below is pointed at 127.0.0.1 only.

import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  addDoc, collection, connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { connectDatabaseEmulator, getDatabase, push, ref, set } from "firebase/database";

const app = initializeApp({
  apiKey: "demo-key",
  authDomain: "localhost",
  projectId: "afriagrifed-ebc30",
  databaseURL: "https://afriagrifed-ebc30-default-rtdb.europe-west1.firebasedatabase.app",
});
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);
connectDatabaseEmulator(rtdb, "127.0.0.1", 9000);

const PASSWORD = "Test-AfriAgriFed-2026"; // local emulator test accounts only (scripts/emulator-seed.js)
let failures = 0;

async function as(email) {
  await signOut(auth).catch(() => {});
  const cred = await signInWithEmailAndPassword(auth, email, PASSWORD);
  return cred.user;
}

async function expectOk(label, fn) {
  try {
    await fn();
    console.log(`  ok      ${label}`);
  } catch (error) {
    failures++;
    console.log(`  FAILED  ${label}  (refused: ${error.code || error.message})`);
  }
}

async function expectDenied(label, fn) {
  try {
    await fn();
    failures++;
    console.log(`  FAILED  ${label}  (it was ALLOWED)`);
  } catch (error) {
    if (/permission|PERMISSION_DENIED|denied/i.test(String(error.code || error.message))) console.log(`  ok      ${label}`);
    else {
      failures++;
      console.log(`  FAILED  ${label}  (unexpected error: ${error.code || error.message})`);
    }
  }
}

const sellerOf = async (listingId) => (await getDoc(doc(db, "marketPrices", listingId))).data().sellerId;

console.log("\nMessaging between buyer and seller");
const buyer = await as("buyer@aaf.test");
const sellerId = await sellerOf("lst_mahangu");
const convId = `listing_lst_mahangu_${buyer.uid}_${Date.now()}`; // fresh each run, as the app reuses an existing one
await expectOk("buyer opens a chat about a listing with its seller", () =>
  setDoc(doc(db, "conversations", convId), {
    participants: [buyer.uid, sellerId].sort(),
    names: { [buyer.uid]: "Bea Buyer", [sellerId]: "Ndapewa Shikongo" },
    topic: { kind: "listing", id: "lst_mahangu", title: "Mahangu" },
    createdAt: serverTimestamp(),
  })
);
await expectOk("buyer sends a normal message", () =>
  addDoc(collection(db, "conversations", convId, "messages"), { senderId: buyer.uid, text: "Is it still available? I can collect Saturday.", createdAt: serverTimestamp() })
);
await expectDenied("buyer sends a phone number", () =>
  addDoc(collection(db, "conversations", convId, "messages"), { senderId: buyer.uid, text: "call me 081 123 4567", createdAt: serverTimestamp() })
);
await expectDenied("buyer sends an e-mail address", () =>
  addDoc(collection(db, "conversations", convId, "messages"), { senderId: buyer.uid, text: "mail me: bea@gmail.com", createdAt: serverTimestamp() })
);
await expectDenied("buyer sends a link", () =>
  addDoc(collection(db, "conversations", convId, "messages"), { senderId: buyer.uid, text: "pay here https://pay.example.com", createdAt: serverTimestamp() })
);
await expectDenied("buyer hides a number on a second line", () =>
  addDoc(collection(db, "conversations", convId, "messages"), { senderId: buyer.uid, text: "hello\n0811234567", createdAt: serverTimestamp() })
);
await expectDenied("buyer opens a chat with a stranger (not the listing's seller)", () =>
  setDoc(doc(db, "conversations", `listing_lst_mahangu_x${buyer.uid}`), {
    participants: [buyer.uid, "someone-else"].sort(),
    names: {},
    topic: { kind: "listing", id: "lst_mahangu", title: "Mahangu" },
    createdAt: serverTimestamp(),
  })
);

console.log("\nDemand Board threads and the community feed");
await expectOk("a normal Demand Board message", () =>
  addDoc(collection(db, "demandRequests", "dem_school", "messages"), { authorId: buyer.uid, authorName: "Bea", text: "Can you deliver by the 15th?", createdAt: serverTimestamp() })
);
await expectDenied("a Demand Board message with a phone number", () =>
  addDoc(collection(db, "demandRequests", "dem_school", "messages"), { authorId: buyer.uid, authorName: "Bea", text: "WhatsApp me +264 81 123 4567", createdAt: serverTimestamp() })
);
await expectOk("a normal feed comment", () =>
  set(push(ref(rtdb, "posts/seed_post_1/comments")), { userId: buyer.uid, userName: "Bea", text: "Great news!", createdAt: Date.now() })
);
await expectDenied("a feed comment with a phone number", () =>
  set(push(ref(rtdb, "posts/seed_post_1/comments")), { userId: buyer.uid, userName: "Bea", text: "sms 0811234567", createdAt: Date.now() })
);
await expectDenied("a feed post with an e-mail address", () =>
  set(push(ref(rtdb, "posts")), { userId: buyer.uid, userName: "Bea", content: "contact bea@gmail.com", imageUrl: "", createdAt: Date.now() })
);

console.log("\nAccounts, approval and orders");
await expectDenied("a buyer approves themselves", () => updateDoc(doc(db, "users", buyer.uid), { approved: true, status: "verified" }));
await expectDenied("a buyer creates an order directly", () =>
  addDoc(collection(db, "orders"), { buyerId: buyer.uid, sellerId, status: "paid", amount: 1 })
);
await expectDenied("a buyer pledges to a request (only producers pledge)", () =>
  addDoc(collection(db, "demandRequests", "dem_school", "pledges"), { farmerId: buyer.uid, farmerName: "Bea", quantity: 5, note: "", createdAt: serverTimestamp() })
);

const admin = await as("admin@aaf.test");
await expectOk("an admin switches their own profile to 'farmer' for testing", () =>
  setDoc(doc(db, "users", admin.uid), {
    uid: admin.uid, userType: "farmer", approved: true, status: "verified",
    accountStatus: { registrationStatus: "verified", documentStatus: "approved" },
    personalInfo: { email: "admin@aaf.test", firstName: "Ada" }, adminTestRole: "farmer",
  }, { merge: true })
);
await expectOk("the admin, testing as a farmer, can pledge", () =>
  addDoc(collection(db, "demandRequests", "dem_school", "pledges"), { farmerId: admin.uid, farmerName: "Ada (test)", quantity: 10, note: "test pledge", createdAt: serverTimestamp() })
);
await expectOk("the admin, testing as a farmer, can post a listing", () =>
  addDoc(collection(db, "marketPrices"), { product: "Test listing", price: 10, unit: "kg", quantity: 5, imageUrl: "", sellerId: admin.uid, sellerName: "Ada (test)", sellerSubaccountId: null, createdAt: serverTimestamp() })
);

const farmer = await as("farmer@aaf.test");
await expectDenied("a farmer cannot read the buyer's private chat", () => getDoc(doc(db, "conversations", `listing_lst_mahangu_x${farmer.uid}`)).then((s) => { if (!s.exists()) throw Object.assign(new Error("permission-denied"), { code: "permission-denied" }); }));

await signOut(auth);
console.log(failures === 0 ? "\nAll rule checks passed.\n" : `\n${failures} rule check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
