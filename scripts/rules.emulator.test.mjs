// Runs the Firestore security rules for private messages in the real Firestore
// emulator. Needs Java and the Firebase CLI:
//   npm run test:rules   (downloads the Firebase CLI with npx the first time)
// (src/rules.test.js only reads the rules file; this one executes them.)

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-aaf",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, "marketPrices/L1"), { product: "Tomatoes", sellerId: "seller", price: 10 });
  await setDoc(doc(db, "orders/O1"), { buyerId: "buyer", sellerId: "seller", status: "paid" });
  await setDoc(doc(db, "demandRequests/D1"), { buyerId: "school", status: "open" });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const conv = (participants, topic, extra = {}) => ({
  participants: [...participants].sort(),
  names: Object.fromEntries(participants.map((p) => [p, p])),
  topic,
  createdAt: serverTimestamp(),
  ...extra,
});

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const buyer = as("buyer");
const seller = as("seller");
const stranger = as("stranger");

await check("a buyer can open a thread with a listing's seller", () =>
  assertSucceeds(setDoc(doc(buyer, "conversations/listing_L1_buyer"), conv(["buyer", "seller"], { kind: "listing", id: "L1", title: "Tomatoes" }))));

await check("nobody can open a thread with someone who is not the listing's seller", () =>
  assertFails(setDoc(doc(buyer, "conversations/listing_L1_x"), conv(["buyer", "stranger"], { kind: "listing", id: "L1", title: "Tomatoes" }))));

await check("only the order's buyer and seller can open its thread", async () => {
  await assertFails(setDoc(doc(stranger, "conversations/order_O1"), conv(["stranger", "seller"], { kind: "order", id: "O1", title: "x" })));
  await assertSucceeds(setDoc(doc(seller, "conversations/order_O1"), conv(["buyer", "seller"], { kind: "order", id: "O1", title: "Tomatoes" })));
});

await check("a producer can message the buyer who posted a bulk request", () =>
  assertSucceeds(setDoc(doc(seller, "conversations/demand_D1_seller"), conv(["seller", "school"], { kind: "demand", id: "D1", title: "Maize" }))));

await check("extra fields are refused", () =>
  assertFails(setDoc(doc(buyer, "conversations/listing_L1_b2"), conv(["buyer", "seller"], { kind: "listing", id: "L1", title: "x" }, { admin: true }))));

await check("checking whether a thread exists works before it is created", () =>
  assertSucceeds(getDoc(doc(stranger, "conversations/does_not_exist"))));

await check("outsiders cannot read a thread or its messages", async () => {
  await assertFails(getDoc(doc(stranger, "conversations/listing_L1_buyer")));
  await assertFails(getDocs(collection(stranger, "conversations/listing_L1_buyer/messages")));
});

await check("participants can list their own threads", () =>
  assertSucceeds(getDocs(query(collection(buyer, "conversations"), where("participants", "array-contains", "buyer")))));

await check("participants send messages as themselves only", async () => {
  await assertSucceeds(addDoc(collection(buyer, "conversations/listing_L1_buyer/messages"), { senderId: "buyer", text: "Still available?", createdAt: serverTimestamp() }));
  await assertFails(addDoc(collection(buyer, "conversations/listing_L1_buyer/messages"), { senderId: "seller", text: "fake", createdAt: serverTimestamp() }));
  await assertFails(addDoc(collection(stranger, "conversations/listing_L1_buyer/messages"), { senderId: "stranger", text: "hi", createdAt: serverTimestamp() }));
  await assertFails(addDoc(collection(buyer, "conversations/listing_L1_buyer/messages"), { senderId: "buyer", text: "", createdAt: serverTimestamp() }));
});

await check("participants update the summary and only their own read marker", async () => {
  await assertSucceeds(updateDoc(doc(buyer, "conversations/listing_L1_buyer"), { lastMessage: "Still available?", lastMessageAt: serverTimestamp(), lastSenderId: "buyer", "readAt.buyer": serverTimestamp() }));
  await assertFails(updateDoc(doc(buyer, "conversations/listing_L1_buyer"), { "readAt.seller": serverTimestamp() }));
  await assertFails(updateDoc(doc(buyer, "conversations/listing_L1_buyer"), { lastSenderId: "seller" }));
  await assertFails(updateDoc(doc(buyer, "conversations/listing_L1_buyer"), { participants: ["buyer", "stranger"] }));
  await assertSucceeds(updateDoc(doc(seller, "conversations/listing_L1_buyer"), { "readAt.seller": serverTimestamp() }));
});

await env.cleanup();
assert.ok(passed > 0);
console.log(`\n${passed} rule checks passed`);
