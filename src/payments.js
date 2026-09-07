// payments.js
//
// Frontend helper for the Flutterwave split-payment flow implemented in
// server.js. The buyer pays the listed price; Flutterwave automatically
// routes the platform's commission and the seller's share per the
// subaccount split configured when the seller's account was set up.

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
    alert("Please sign in before buying.");
    return;
  }

  if (!sellerSubaccountId) {
    alert(`${sellerName || "This seller"} hasn't set up payouts yet - contact them directly.`);
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
    alert(data.error || "Could not start payment.");
    return;
  }

  sessionStorage.setItem(
    "aaf_pending_order",
    JSON.stringify({ product, price, sellerId, sellerName, buyerId: user.uid, txRef: data.txRef })
  );

  logTelemetryEvent(TELEMETRY_EVENTS.PAYMENT_INITIATED, { product, price, sellerId });

  window.location.href = data.link;
}

/**
 * Call this on the /payment-callback route. Verifies the transaction with
 * the backend, and only if Flutterwave confirms it as successful, writes
 * the order to Firestore.
 */
export async function verifyAndRecordOrder(transactionId) {
  const response = await fetch(`${API_BASE_URL}/api/payments/verify/${transactionId}`);
  const data = await response.json();

  if (!data.verified) {
    return { success: false };
  }

  const pending = JSON.parse(sessionStorage.getItem("aaf_pending_order") || "null");

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

  sessionStorage.removeItem("aaf_pending_order");
  logTelemetryEvent(TELEMETRY_EVENTS.PAYMENT_COMPLETED, { transactionId });

  return { success: true, order: pending };
}
