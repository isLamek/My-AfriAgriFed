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
  addDoc, arrayUnion, collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, getDocs,
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
await expectOk("a chat message with a date and time (not a phone number)", () =>
  addDoc(collection(db, "conversations", convId, "messages"), { senderId: buyer.uid, text: "Deliver by 2026-10-07 10:00 please", createdAt: serverTimestamp() })
);
await expectOk("a feed comment with a date and time", () =>
  set(push(ref(rtdb, "posts/seed_post_1/comments")), { userId: buyer.uid, userName: "Bea", text: "Market day 12/10/2026 14:30", createdAt: Date.now() })
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

console.log("\nPublic profiles and usernames");
const handle = `bea_${Date.now() % 1000000}`; // fresh each run: names stay claimed
const card = (extra = {}) => ({ displayName: "Bea Buyer", username: "", photoURL: "", bio: "", region: "Khomas", role: "consumer", cover: "", memberSince: "Oct 2026", ...extra });
const buyer2 = await as("buyer@aaf.test");
await expectOk("a buyer claims a username and saves their card in one write", () => {
  const batch = writeBatch(db);
  batch.set(doc(db, "usernames", handle), { uid: buyer2.uid });
  batch.set(doc(db, "publicProfiles", buyer2.uid), card({ username: handle, bio: "Fresh veg for our family shop." }));
  return batch.commit();
});
await expectDenied("a buyer calls themselves a farmer", () => setDoc(doc(db, "publicProfiles", buyer2.uid), card({ role: "farmer" })));
await expectDenied("a bio with a phone number", () => setDoc(doc(db, "publicProfiles", buyer2.uid), card({ bio: "call 081 234 5678" })));
await expectDenied("a profile photo from another website", () => setDoc(doc(db, "publicProfiles", buyer2.uid), card({ photoURL: "https://evil.example/x.jpg" })));
await expectOk("a small uploaded photo kept on the card", () => setDoc(doc(db, "publicProfiles", buyer2.uid), card({ username: handle, photoURL: "data:image/jpeg;base64,/9j/4AAQSkZJRg==" })));
await expectDenied("a username with spaces or capitals", () => setDoc(doc(db, "usernames", "Bad Name"), { uid: buyer2.uid }));
const farmer2 = await as("farmer@aaf.test");
await expectOk("a farmer can see the buyer's public card", () => getDoc(doc(db, "publicProfiles", buyer2.uid)));
await expectDenied("a farmer takes the buyer's username", () => setDoc(doc(db, "usernames", handle), { uid: farmer2.uid }));
await expectDenied("a farmer puts the buyer's username on their own card", () =>
  setDoc(doc(db, "publicProfiles", farmer2.uid), card({ displayName: "Ndapewa", role: "farmer", username: handle }))
);
await expectDenied("a farmer edits the buyer's card", () => setDoc(doc(db, "publicProfiles", buyer2.uid), card({ displayName: "Hacked" })));
await expectOk("a farmer saves their own card", () => setDoc(doc(db, "publicProfiles", farmer2.uid), card({ displayName: "Ndapewa Shikongo", role: "farmer", region: "Oshana" })));

console.log("\nMarket Map pins and listing photos");
const listing = (extra = {}) => ({ product: "Rules check onions", price: 12, unit: "kg", quantity: 10, imageUrl: "", sellerId: farmer2.uid, sellerName: "Ndapewa", sellerSubaccountId: null, createdAt: serverTimestamp(), ...extra });
const oshakati = { lat: -17.79, lng: 15.7, label: "Near Oshakati", region: "Oshana" };
await expectOk("a listing with a pin in Namibia and a stored photo", () =>
  addDoc(collection(db, "marketPrices"), listing({ location: oshakati, imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==" }))
);
await expectDenied("a listing pinned outside Namibia", () => addDoc(collection(db, "marketPrices"), listing({ location: { ...oshakati, lat: 51.5, lng: -0.12 } })));
await expectDenied("a listing pin labelled with a phone number", () => addDoc(collection(db, "marketPrices"), listing({ location: { ...oshakati, label: "call 081 234 5678" } })));
await expectDenied("a listing photo from another website", () => addDoc(collection(db, "marketPrices"), listing({ imageUrl: "https://evil.example/x.jpg" })));
await expectDenied("a pin with extra hidden fields", () => addDoc(collection(db, "marketPrices"), listing({ location: { ...oshakati, exact: "farm gate" } })));
await as("buyer@aaf.test");
await expectOk("a Demand Board request with a delivery pin", () =>
  addDoc(collection(db, "demandRequests"), {
    title: "Rules check: onions for the canteen", product: "Onions", quantityNeeded: 50, unit: "kg", deadline: null, notes: "",
    location: { lat: -22.57, lng: 17.08, label: "Windhoek", region: "Khomas" },
    buyerId: auth.currentUser.uid, buyerName: "Bea", buyerType: "consumer", status: "open", createdAt: serverTimestamp(),
  })
);

console.log("\nNotifications that carry a text key (shown in the reader's language)");
const note = (extra = {}) => ({ userId: farmer2.uid, title: "New message from Bea", body: "hello", link: "/messages", read: false, createdAt: serverTimestamp(), ...extra });
await expectOk("an old-style notification (title and body only)", () => addDoc(collection(db, "notifications"), note()));
await expectOk("a notification with a key and parameters", () =>
  addDoc(collection(db, "notifications"), note({ key: "notif.message", params: { name: "Bea", what: "Onions: hello" } }))
);
await expectOk("a rejection reason up to 400 characters", () =>
  addDoc(collection(db, "notifications"), note({ key: "notif.account.rejected", params: { reason: "x".repeat(300) } }))
);
await expectDenied("a notification key with odd characters", () => addDoc(collection(db, "notifications"), note({ key: "notif message<script>" })));
await expectDenied("a notification parameter that is not on the list", () => addDoc(collection(db, "notifications"), note({ key: "notif.message", params: { name: "Bea", link: "https://evil.example" } })));
await expectDenied("a notification parameter that is far too long", () => addDoc(collection(db, "notifications"), note({ key: "notif.message", params: { name: "x".repeat(500) } })));
await expectDenied("notification parameters that are not a map", () => addDoc(collection(db, "notifications"), note({ key: "notif.message", params: "Bea" })));

console.log("\nDelivery: orders, handover codes, jobs, tracking and carriers");
const step = (status, uid) => ({ status, statusHistory: arrayUnion({ status, by: uid, at: Date.now() }), updatedAt: serverTimestamp() });
const readable = (path) => () => getDoc(doc(db, path)).then((s) => { if (!s.exists()) throw new Error("missing"); });

await as("admin@aaf.test");
const pendingCarrier = (await getDocs(query(collection(db, "carriers"), where("status", "==", "pending")))).docs[0];
const buyerD = await as("buyer@aaf.test");
await expectOk("the buyer reads their own handover code", readable("orderSecrets/tx_seed_1"));
await expectDenied("the buyer changes their handover code", () => updateDoc(doc(db, "orderSecrets", "tx_seed_1"), { code: "000000" }));
await expectDenied("the buyer confirms receipt straight from the browser (it goes through the server)", () => updateDoc(doc(db, "orders", "tx_seed_1"), step("delivered", buyerD.uid)));
await expectDenied("the buyer writes a vehicle position", () => setDoc(doc(db, "orderTracking", "tx_seed_4"), { orderId: "tx_seed_4", buyerId: buyerD.uid, lat: -17.7, lng: 15.7, at: Date.now() }));
await expectOk("the buyer follows the vehicle on their order", readable("orderTracking/tx_seed_4"));
await expectOk("the buyer sees the drop-off details of their own order", readable("deliveryPrivate/tx_seed_4"));
await expectDenied("the buyer creates a delivery job", () => setDoc(doc(db, "deliveryJobs", "evil"), { status: "open", buyerId: buyerD.uid }));

const sellerD = await as("farmer@aaf.test");
await expectDenied("the seller reads the buyer's handover code", readable("orderSecrets/tx_seed_1"));
await expectOk("the seller sees their own delivery jobs", () => getDocs(query(collection(db, "deliveryJobs"), where("sellerId", "==", sellerD.uid))));
{
  const platform = await getDoc(doc(db, "orders", "tx_seed_4"));
  if (platform.data().status === "dispatched") {
    await expectDenied("a seller starts the trip on an order a CARRIER delivers", () => updateDoc(doc(db, "orders", "tx_seed_4"), step("in_transit", sellerD.uid)));
  }
  const own = await getDoc(doc(db, "orders", "tx_seed_3"));
  if (own.data().status === "paid") {
    await expectOk("the seller accepts a new order", () => updateDoc(doc(db, "orders", "tx_seed_3"), step("confirmed", sellerD.uid)));
    await expectOk("the seller marks a collection ready", () => updateDoc(doc(db, "orders", "tx_seed_3"), step("dispatched", sellerD.uid)));
    await expectDenied("the seller starts a trip on an order the buyer collects", () => updateDoc(doc(db, "orders", "tx_seed_3"), step("in_transit", sellerD.uid)));
    await expectDenied("the seller marks their own order delivered", () => updateDoc(doc(db, "orders", "tx_seed_3"), step("delivered", sellerD.uid)));
  }
}
await expectDenied("the seller writes a delivery job", () => updateDoc(doc(db, "deliveryJobs", "tx_seed_5"), { status: "claimed", carrierId: sellerD.uid }));

const orgD = await as("org@aaf.test");
await expectDenied("a stranger reads someone's handover code", readable("orderSecrets/tx_seed_1"));
await expectDenied("a stranger follows someone's vehicle", readable("orderTracking/tx_seed_4"));
await expectDenied("a stranger reads someone's drop-off address", readable("deliveryPrivate/tx_seed_4"));
await expectDenied("someone who is not a carrier lists open jobs", () => getDocs(query(collection(db, "deliveryJobs"), where("status", "==", "open"))));
await expectDenied("a person applies to be a carrier and approves themselves", () =>
  setDoc(doc(db, "carriers", orgD.uid), { name: "Org", phone: "0811110000", vehicle: { type: "bakkie" }, regions: [], available: true, status: "approved", createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
);
await deleteDoc(doc(db, "carriers", orgD.uid)).catch(() => {});
await expectOk("a person applies to be a carrier (as pending)", () =>
  setDoc(doc(db, "carriers", orgD.uid), { name: "Ongwediva Fresh Market", phone: "0811110000", vehicle: { type: "bakkie", description: "Company bakkie", plate: "N 1 W" }, regions: ["Oshana"], available: true, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
);
await expectDenied("an applicant still cannot take open jobs", () => getDocs(query(collection(db, "deliveryJobs"), where("status", "==", "open"))));
await expectDenied("an applicant approves themselves afterwards", () => updateDoc(doc(db, "carriers", orgD.uid), { status: "approved", updatedAt: serverTimestamp() }));
await expectDenied("an applicant claims a bigger vehicle than they were approved for", () =>
  updateDoc(doc(db, "carriers", orgD.uid), { vehicle: { type: "truck", description: "Big", plate: "N 1 W" }, updatedAt: serverTimestamp() })
);
await expectOk("an applicant updates their phone number", () => updateDoc(doc(db, "carriers", orgD.uid), { phone: "0812223333", updatedAt: serverTimestamp() }));
await deleteDoc(doc(db, "carriers", orgD.uid)).catch(() => {});

const carrierD = await as("carrier@aaf.test");
await expectOk("an approved carrier lists the open jobs", () => getDocs(query(collection(db, "deliveryJobs"), where("status", "==", "open"))));
await expectOk("an approved carrier reads the job they hold", readable("deliveryJobs/tx_seed_4"));
await expectOk("an approved carrier reads the exact address of the job they hold", readable("deliveryPrivate/tx_seed_4"));
await expectDenied("an approved carrier reads the exact address of a job they have not taken", readable("deliveryPrivate/tx_seed_5"));
await expectOk("an approved carrier follows the vehicle of the job they hold", readable("orderTracking/tx_seed_4"));
await expectDenied("an approved carrier moves the order themselves (the server does it)", () => updateDoc(doc(db, "orders", "tx_seed_4"), step("in_transit", carrierD.uid)));
await expectDenied("an approved carrier gives themselves a job", () => updateDoc(doc(db, "deliveryJobs", "tx_seed_5"), { status: "claimed", carrierId: carrierD.uid }));
await expectDenied("a carrier reads the buyer's handover code", readable("orderSecrets/tx_seed_4"));
await expectOk("a carrier reads their own application", readable(`carriers/${carrierD.uid}`));
await expectDenied("a carrier reads another carrier's application", readable(`carriers/${pendingCarrier.id}`));

const adminD = await as("admin@aaf.test");
await expectOk("the admin sees carriers waiting for approval", async () => { if (!pendingCarrier) throw new Error("none"); });
if (pendingCarrier) {
  await expectOk("the admin approves a carrier", () => updateDoc(pendingCarrier.ref, { status: "approved", updatedAt: serverTimestamp() }));
  await updateDoc(pendingCarrier.ref, { status: "pending", updatedAt: serverTimestamp() }); // put it back for the next run
}
await expectDenied("even the admin cannot write a delivery job from a browser", () => setDoc(doc(db, "deliveryJobs", "evil"), { status: "open" }));
void adminD;

await signOut(auth);
console.log(failures === 0 ? "\nAll rule checks passed.\n" : `\n${failures} rule check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
