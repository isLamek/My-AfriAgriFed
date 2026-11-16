// The website's side of the delivery routes in server/delivery.js.
//
// Every call is made as the signed-in person; the server checks who they are and what
// state the order is in, and answers { error, message, params } when it refuses.
// A refusal becomes an Error whose text is already in the reader's language (the server
// sends a code, the language files say it), with `code` and `params` kept for the screen
// to branch on (for example "3 tries left" after a wrong handover code).

import { auth } from "../firebaseConfig";
import { API_BASE_URL, noBackendMessage } from "../apiBase";
import { serverMessage } from "../serverMessages";
import { t } from "../i18n";
import { savePendingCheckout } from "../cart/cart";

async function call(path, body, { method = "POST" } = {}) {
  if (!API_BASE_URL) throw new Error(noBackendMessage());
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error(t("payments.pleaseSignInFirst"));
  const token = await user.getIdToken();

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(t("delivery.couldNotReachTheServer"));
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    // not JSON (a proxy error page, for example)
  }
  if (!response.ok) {
    const error = new Error(serverMessage(data, t("delivery.somethingWentWrong")));
    error.code = data && data.error;
    error.params = (data && data.params) || {};
    error.status = response.status;
    throw error;
  }
  return data || {};
}

// ---- buying ---------------------------------------------------------------------------------
/** What each way of getting these items would cost (the server's answer: it knows the prices). */
export const quoteBasket = (items, address) => call("/api/delivery/quote", { items, ...(address ? { address } : {}) });

/**
 * Ask the server to start the payment for a basket and send the browser to the payment page.
 * `delivery` is { method, address?, expectedFee?, date?, window?, note? }.
 */
export async function startBasketCheckout({ items, delivery }) {
  const data = await call("/api/payments/initiate", { kind: "order", items, delivery });
  if (!data.link) throw new Error(t("delivery.couldNotStartThePayment"));
  savePendingCheckout(auth.currentUser.uid, items.map((i) => i.listingId));
  window.location.href = data.link;
}

// ---- the seller ----------------------------------------------------------------------------------
export const requestCarrier = (orderId, body) => call(`/api/delivery/${encodeURIComponent(orderId)}/request-carrier`, body);

// ---- the carrier --------------------------------------------------------------------------------
export const claimJob = (orderId) => call(`/api/delivery/jobs/${encodeURIComponent(orderId)}/claim`, {});
export const releaseJob = (orderId) => call(`/api/delivery/jobs/${encodeURIComponent(orderId)}/release`, {});
export const pickUp = (orderId) => call(`/api/delivery/${encodeURIComponent(orderId)}/pickup`, {});
export const sendLocation = (orderId, position) => call(`/api/delivery/${encodeURIComponent(orderId)}/location`, position);
export const markArrived = (orderId) => call(`/api/delivery/${encodeURIComponent(orderId)}/arrived`, {});
export const handOver = (orderId, body) => call(`/api/delivery/${encodeURIComponent(orderId)}/handover`, body);

// ---- the buyer -------------------------------------------------------------------------------------
export const confirmReceipt = (orderId) => call(`/api/orders/${encodeURIComponent(orderId)}/confirm`, {});
export const cancelOrder = (orderId, reason) => call(`/api/orders/${encodeURIComponent(orderId)}/cancel`, { reason });
export const reportProblem = (orderId, body) => call(`/api/orders/${encodeURIComponent(orderId)}/dispute`, body);

// ---- support -------------------------------------------------------------------------------------------
export const resolveProblem = (orderId, body) => call(`/api/orders/${encodeURIComponent(orderId)}/resolve`, body);
