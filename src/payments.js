// payments.js
//
// The browser's side of the Flutterwave flow in server/checkout.js.
//
// The browser only ASKS to pay for something ("this listing", "this promotion",
// "this page"). The server decides the price and who is paid, and records the
// order / activates the promotion / unlocks the page once Flutterwave confirms
// the charge. Nothing here writes orders or unlocks to the database, and
// nothing here sends an amount, so there is nothing to tamper with.

import toast from "react-hot-toast";
import { auth } from "./firebaseConfig";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";

// Same variable cloudinairyUpload.js uses for the backend URL.
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/** The backend's own words if it gave any, otherwise something plain. */
function messageFrom(data, fallback) {
  return (data && data.message) || fallback;
}

/** Call the backend as the signed-in user (anonymous visitors count: they have an identity too). */
async function authedFetch(path, options = {}) {
  await auth.authStateReady(); // on a fresh page load the session is restored asynchronously
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in first.");
  const token = await user.getIdToken();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("Could not reach the payment service. Check your connection and try again.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // not JSON (a proxy error page, for example)
  }
  return { response, data };
}

/** Ask the server to start a payment and send the browser to Flutterwave's page. */
async function startPayment(body, telemetry) {
  const { response, data } = await authedFetch("/api/payments/initiate", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok || !data || !data.link) {
    throw new Error(messageFrom(data, "Could not start payment."));
  }

  logTelemetryEvent(TELEMETRY_EVENTS.PAYMENT_INITIATED, telemetry);
  window.location.href = data.link;
}

/**
 * Buy one unit of a marketplace listing. The price and the seller's payout
 * account come from the listing on the server, not from this call.
 */
export async function startCheckout({ listingId, product, sellerId }) {
  if (!auth.currentUser) {
    toast.error("Please sign in before buying.");
    return;
  }
  try {
    await startPayment({ kind: "order", listingId }, { product, listingId, sellerId });
  } catch (error) {
    toast.error(error.message);
  }
}

/** Pay a promotion's fee. The server works the price out from the promotion's dates. */
export async function startPromotionCheckout({ promotionId, description }) {
  try {
    await startPayment({ kind: "promotion", promotionId }, { product: description, promotionId });
  } catch (error) {
    toast.error(error.message);
  }
}

/**
 * N$5 for one dashboard page, for a visitor with no real account (identified
 * by their anonymous Firebase identity). Throws on failure so the paywall can
 * show the message.
 */
export async function startAnonymousPageCheckout({ email, pageKey }) {
  await startPayment({ kind: "page_access", pageKey, email }, { product: `page_access:${pageKey}`, pageKey });
}

/**
 * Call this on the /payment-callback route. Asks the server to confirm the
 * transaction with Flutterwave; the server does whatever it paid for (and does
 * it only once, however many times this page is reloaded).
 *
 * Resolves { success, purpose, refId, orderId, message }.
 */
export async function verifyAndFinalizePayment(transactionId) {
  const { response, data } = await authedFetch(`/api/payments/verify/${encodeURIComponent(transactionId)}`);

  if (!response.ok || !data || !data.verified) {
    return { success: false, message: messageFrom(data, "") };
  }

  if (!data.already) {
    logTelemetryEvent(TELEMETRY_EVENTS.PAYMENT_COMPLETED, { transactionId, purpose: data.purpose });
  }
  return { success: true, purpose: data.purpose, refId: data.refId || null, orderId: data.orderId || null };
}
