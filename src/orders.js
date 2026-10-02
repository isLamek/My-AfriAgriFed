// orders.js
//
// Moves an order along its lifecycle (see orderStatus.js) and tells the other
// party. The Firestore rules enforce the same transitions, so even a tampered
// client cannot skip steps.

import { arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { notifyUser } from "./notifications";
import { allowedNext, buildHistoryEntry, STATUS_LABELS } from "./orderStatus";

const NOTIFY_TEXT = {
  confirmed: (product) => ({ title: "Order confirmed", body: `The seller confirmed your order for ${product}.` }),
  dispatched: (product) => ({ title: "Order dispatched", body: `${product} has been dispatched.` }),
  in_transit: (product) => ({ title: "Order on its way", body: `${product} is in transit to you.` }),
  delivered: (product) => ({ title: "Delivery confirmed", body: `The buyer confirmed they received ${product}.` }),
};

export async function advanceOrder(order, nextStatus, note = "") {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in first.");
  if (!allowedNext(order, user.uid).includes(nextStatus)) {
    throw new Error("That step is not available for this order right now.");
  }

  const entry = buildHistoryEntry({ status: nextStatus, by: user.uid, note });

  // arrayUnion appends atomically, so two quick taps cannot overwrite history.
  await updateDoc(doc(db, "orders", order.id), {
    status: nextStatus,
    statusHistory: arrayUnion(entry),
    updatedAt: serverTimestamp(),
  });

  const otherParty = user.uid === order.sellerId ? order.buyerId : order.sellerId;
  if (otherParty && otherParty !== user.uid) {
    const text = (NOTIFY_TEXT[nextStatus] || (() => ({ title: STATUS_LABELS[nextStatus], body: "" })))(order.product);
    await notifyUser(otherParty, { ...text, link: "/track-orders" });
  }

  return entry;
}
