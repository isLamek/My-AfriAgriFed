// payments.js
//
// Frontend helper for the Flutterwave payment flow implemented in server.js.
// Two kinds of charge:
//   - Marketplace orders: the buyer pays the listed price; Flutterwave
//     automatically routes the platform's commission and the seller's share
//     per the subaccount split configured when the seller's account was set up.
//   - Platform-only charges (e.g. promotion fees): no seller involved, the
//     full amount goes to the platform's main Flutterwave account.

import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "./firebaseConfig";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";

// Same variable cloudinairyUpload.js uses for the backend URL.
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Kicks off checkout for a single item and redirects the browser to the
 * Flutterwave-hosted payment page. Call this from a "Buy" button.
 */
export async function startCheckout({ product, price, sellerId, sellerSubaccountId, sellerName }) {
  const user = auth.currentUser;

  if (!user) {
    toast.error("Please sign in before buying.");
    return;
  }

  if (!sellerSubaccountId) {
    toast.error(`${sellerName || "This seller"} hasn't set up payouts yet - contact them directly.`);
    return;
  }

  const response = await fetch(`${API_BASE_URL}/api/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: price,
      customerEmail: user.email,
      customerName: user.displayName || user.email,
      productName: product,
      sellerSubaccountId,
      buyerId: user.uid,
      sellerId,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.link) {
    toast.error(data.error || "Could not start payment.");
    return;
  }

  sessionStorage.setItem(
    "aaf_pending_payment",
    JSON.stringify({ purpose: "order", product, price, sellerId, sellerName, buyerId: user.uid, txRef: data.txRef })
  );

  logTelemetryEvent(TELEMETRY_EVENTS.PAYMENT_INITIATED, { product, price, sellerId });

  window.location.href = data.link;
}

/**
 * Platform-only charge with no seller split - e.g. a promotion's per-day
 * fee. Redirects to Flutterwave the same way startCheckout does.
 */
export async function startPlatformCheckout({ description, amount, purpose, refId }) {
  const user = auth.currentUser;

  if (!user) {
    toast.error("Please sign in first.");
    return;
  }

  const response = await fetch(`${API_BASE_URL}/api/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      customerEmail: user.email,
      customerName: user.displayName || user.email,
      productName: description,
      buyerId: user.uid,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.link) {
    toast.error(data.error || "Could not start payment.");
    return;
  }

  sessionStorage.setItem(
    "aaf_pending_payment",
    JSON.stringify({ purpose, refId, amount, description, buyerId: user.uid, txRef: data.txRef })
  );

  logTelemetryEvent(TELEMETRY_EVENTS.PAYMENT_INITIATED, { product: description, price: amount });

  window.location.href = data.link;
}

/**
 * Call this on the /payment-callback route. Verifies the transaction with
 * the backend, and only if Flutterwave confirms it as successful, finalizes
 * whatever this payment was for (a marketplace order, or a platform charge
 * like a promotion fee) based on what was stashed before redirecting out.
 */
export async function verifyAndFinalizePayment(transactionId) {
  const response = await fetch(`${API_BASE_URL}/api/payments/verify/${transactionId}`);
  const data = await response.json();

  if (!data.verified) {
    return { success: false };
  }

  const pending = JSON.parse(sessionStorage.getItem("aaf_pending_payment") || "null");
  sessionStorage.removeItem("aaf_pending_payment");

  if (pending?.purpose === "promotion") {
    await updateDoc(doc(db, "promotions", pending.refId), {
      status: "active",
      paidAmount: data.transaction?.amount || pending.amount || 0,
      transactionId,
    });

    logTelemetryEvent(TELEMETRY_EVENTS.PAYMENT_COMPLETED, { transactionId, purpose: "promotion" });
    return { success: true, purpose: "promotion" };
  }

  await addDoc(collection(db, "orders"), {
    buyerId: pending?.buyerId || auth.currentUser?.uid || "",
    sellerId: pending?.sellerId || "",
    product: pending?.product || data.transaction?.meta?.productName || "",
    amount: data.transaction?.amount || pending?.price || 0,
    currency: data.transaction?.currency || "NAD",
    transactionId,
    status: "paid",
    createdAt: serverTimestamp(),
  });

  logTelemetryEvent(TELEMETRY_EVENTS.PAYMENT_COMPLETED, { transactionId, purpose: "order" });

  return { success: true, purpose: "order", order: pending };
}
