// orders.js
//
// Moves an order along its lifecycle (see orderStatus.js) and tells the other
// party. The Firestore rules enforce the same transitions, so even a tampered
// client cannot skip steps.

import { arrayUnion, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { notifyUser } from "./notifications";
import { allowedNext, buildHistoryEntry, STATUS_LABELS } from "./orderStatus";
import { t } from "./i18n";

// Statuses that notify the other party; the text lives in the language files as
// notif.order.<status>.title / .body and is shown in the reader's language.
const NOTIFY_STATUSES = new Set(["confirmed", "dispatched", "in_transit", "delivered"]);

export async function advanceOrder(order, nextStatus, note = "") {
  const user = auth.currentUser;
  if (!user) throw new Error(t("orders.pleaseSignInFirst"));
  if (!allowedNext(order, user.uid).includes(nextStatus)) {
    throw new Error(t("orders.thatStepIsNotAvailableFor"));
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
    const message = NOTIFY_STATUSES.has(nextStatus)
      ? { key: `notif.order.${nextStatus}`, params: { product: order.product } }
      : { title: STATUS_LABELS[nextStatus], body: "" };
    await notifyUser(otherParty, { ...message, link: "/track-orders" });
  }

  return entry;
}
