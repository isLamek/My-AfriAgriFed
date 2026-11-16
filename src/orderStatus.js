// Order lifecycle rules, shared by the tracker UI and mirrored in
// firestore.rules (keep the two in sync: the rules are what actually enforce
// this; the functions here just decide what to show).
//
//   paid -> confirmed -> dispatched -> in_transit -> delivered
//
// How far each person can move an order depends on how it gets to the buyer
// (order.fulfilment.method, see src/delivery/rules.js):
//   seller    the seller delivers: they move it up to "in transit" themselves
//   platform  a carrier delivers: the seller marks it ready, the CARRIER (through
//             the server) marks it picked up, handed over, and so on
//   collect   the buyer fetches it: "dispatched" means ready for collection
// Orders saved before delivery existed have no method and behave like "seller".
// In every case the buyer can confirm they received it, and whoever hands the
// goods over can finish the order with the buyer's handover code. Both go
// through the server (serverActions below), not straight to the database.
//
// Cancelling, disputes and refunds go through the server (server/delivery.js),
// never straight from the browser, because money moves with them.
//
// Pure functions only - no Firebase - so they are easy to test.

import { t } from "./i18n";

export const ORDER_STEPS = [
  { id: "paid", label: "Paid", detail: "Payment received" },
  { id: "confirmed", label: "Confirmed", detail: "Seller accepted the order" },
  { id: "dispatched", label: "Dispatched", detail: "Goods are ready and handed off" },
  { id: "in_transit", label: "In transit", detail: "On the way to the buyer" },
  { id: "delivered", label: "Delivered", detail: "Buyer received the goods" },
];

export const STATUS_LABELS = {
  ...Object.fromEntries(ORDER_STEPS.map((s) => [s.id, s.label])),
  disputed: "Problem reported",
  cancelled: "Cancelled",
};

// Words that change with the delivery method: "Dispatched" means something different
// when the buyer is collecting.
const METHOD_LABELS = {
  collect: { dispatched: "Ready for collection" },
  platform: { dispatched: "Ready for the carrier", in_transit: "With the carrier" },
};

/** The step's name for this order, e.g. "Ready for collection" when the buyer collects. */
export function stepLabel(order, id) {
  return METHOD_LABELS[methodOf(order)]?.[id] || STATUS_LABELS[id] || id;
}

// What the person pressing the button is doing, per target status.
export const ACTION_LABELS = {
  confirmed: "Confirm order",
  dispatched: "Mark as dispatched",
  in_transit: "Mark as in transit",
  delivered: "Confirm delivery",
};

/** How this order reaches the buyer. Older orders have no record of it and behave like the seller delivering. */
export function methodOf(order) {
  const m = order?.fulfilment?.method;
  return m === "collect" || m === "platform" ? m : "seller";
}

// Only a seller who delivers themselves may start the trip; for a carrier or a collection
// the next step belongs to someone else.
const sellerMoves = (order) => ({
  paid: ["confirmed"],
  confirmed: ["dispatched"],
  ...(methodOf(order) === "seller" ? { dispatched: ["in_transit"] } : {}),
});

// Older orders were saved as plain "paid" with no history; anything we do not
// recognise is treated the same way rather than crashing the page.
export function normaliseStatus(status) {
  return status === "cancelled" || status === "disputed" || ORDER_STEPS.some((s) => s.id === status) ? status : "paid";
}

export function stepIndex(status) {
  return ORDER_STEPS.findIndex((s) => s.id === normaliseStatus(status));
}

/** True when the order is in the middle of the trip. */
export const isTravelling = (order) => normaliseStatus(order?.status) === "in_transit";

// Which side(s) of the order is this user? Usually one, but someone buying
// their own listing is both.
export function rolesFor(order, uid) {
  const roles = [];
  if (!uid || !order) return roles;
  if (order.sellerId === uid) roles.push("seller");
  if (order.buyerId === uid) roles.push("buyer");
  return roles;
}

export function canTransition(from, to, role, order) {
  const moves = role === "seller" ? sellerMoves(order) : {}; // a buyer's confirmation goes through the server
  return (moves[normaliseStatus(from)] || []).includes(to);
}

// Statuses this user may move the order to right now.
export function allowedNext(order, uid) {
  const from = normaliseStatus(order?.status);
  const next = new Set();
  for (const role of rolesFor(order, uid)) {
    if (role === "seller") for (const to of sellerMoves(order)[from] || []) next.add(to);
  }
  return [...next];
}

// What this person can do that the server does (it checks again, and moves the money
// hooks): confirm receipt, cancel or decline, report a problem, ask for a carrier,
// and finish a handover with the buyer's code.
export function serverActions(order, uid, now = Date.now()) {
  const status = normaliseStatus(order?.status);
  const method = methodOf(order);
  const actions = new Set();
  const travelling = status === "dispatched" || status === "in_transit";
  for (const role of rolesFor(order, uid)) {
    if (role === "buyer") {
      if (travelling) actions.add("confirm");
      // until the seller accepts, or when an accepted order has sat still too long (rules.LIMITS.stalledHours)
      const lastAt = order.statusHistory?.[order.statusHistory.length - 1]?.at;
      const stalled = (status === "confirmed" || status === "dispatched") && typeof lastAt === "number" && now - lastAt >= 72 * 3600000;
      if (status === "paid" || stalled) actions.add("cancel");
      const windowOpen = status === "delivered" && typeof order.releaseAt === "number" && order.releaseAt > now && !order.releasedAt;
      if (travelling || windowOpen) actions.add("dispute");
    } else {
      if (status === "paid" || status === "confirmed") actions.add("decline");
      if (method === "platform" && (status === "confirmed" || status === "dispatched") && !order.fulfilment?.carrierRequestedAt) actions.add("requestCarrier");
      if ((method === "seller" && travelling) || (method === "collect" && status === "dispatched")) actions.add("handover");
    }
  }
  return [...actions];
}

/** Does this order wait on this person right now? (the number on the tab) */
export function needsAction(order, uid, now = Date.now()) {
  if (allowedNext(order, uid).length > 0 || needsAttention(order)) return true;
  const actions = serverActions(order, uid, now);
  if (actions.includes("requestCarrier")) return true;
  // the driver is at the door: the buyer must give the code
  return rolesFor(order, uid).includes("buyer") && normaliseStatus(order?.status) === "in_transit" && !!order?.fulfilment?.arrivedAt;
}

// One append-only log entry. `at` is a plain number because Firestore does
// not allow serverTimestamp() inside an array.
export function buildHistoryEntry({ status, by, note = "", at = Date.now() }) {
  const entry = { status, by, at };
  const trimmed = String(note || "").trim().slice(0, 280);
  if (trimmed) entry.note = trimmed;
  return entry;
}

// Milliseconds when an order reached `status`, or null if it has not.
export function timeReached(order, status) {
  const hit = [...(order?.statusHistory || [])].reverse().find((h) => h.status === status);
  if (hit) return hit.at;
  if (status === "paid" && order?.createdAt?.toDate) return order.createdAt.toDate().getTime();
  return null;
}

// The stepper the UI draws: every step marked done / current / upcoming.
export function buildTimeline(order) {
  const status = normaliseStatus(order?.status);
  if (status === "cancelled") return [];
  // A problem report freezes the order where it was; show the steps it had reached.
  const reached = status === "disputed" ? lastRealStatus(order) : status;
  const current = stepIndex(reached);
  const collecting = methodOf(order) === "collect";
  return ORDER_STEPS.map((step, i) => ({
    ...step,
    label: stepLabel(order, step.id),
    state: i < current ? "done" : i === current ? "current" : "upcoming",
    at: i <= current ? timeReached(order, step.id) : null,
  })).filter((step) => !(collecting && step.id === "in_transit")); // nobody travels when the buyer collects
}

/** The last step an order reached before it was cancelled or disputed. */
export function lastRealStatus(order) {
  const done = [...(order?.statusHistory || [])].reverse().find((h) => ORDER_STEPS.some((s) => s.id === h.status));
  return done ? done.status : "paid";
}

export function isActive(order) {
  const status = normaliseStatus(order?.status);
  return status !== "delivered" && status !== "cancelled";
}

// An order the seller could not fill in full (another buyer took the last units
// first). The buyer has paid, so it stays open and is flagged for both people.
export function needsAttention(order) {
  return order?.oversold === true && isActive(order);
}

// Who needs to act next, in plain words - shown on each card.
export function waitingOn(order) {
  const method = methodOf(order);
  switch (normaliseStatus(order?.status)) {
    case "paid":
      return t("orderStatus.waitConfirm");
    case "confirmed":
      return method === "platform" ? t("orderStatus.waitReadyForCarrier") : t("orderStatus.waitDispatch");
    case "dispatched":
      if (method === "collect") return t("orderStatus.waitCollection");
      if (method === "platform") return t("orderStatus.waitCarrierPickup");
      return t("orderStatus.waitStart");
    case "in_transit":
      return t("orderStatus.waitDelivery");
    case "disputed":
      return t("orderStatus.waitDispute");
    default:
      return "";
  }
}

/** The label on the button that moves the order to `status`, for this order's delivery method. */
export function actionLabel(order, status) {
  if (status === "dispatched") {
    const method = methodOf(order);
    if (method === "collect") return "Ready for collection";
    if (method === "platform") return "Ready for the carrier";
  }
  return ACTION_LABELS[status] || status;
}
