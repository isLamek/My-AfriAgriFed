// Order lifecycle rules, shared by the tracker UI and mirrored in
// firestore.rules (keep the two in sync: the rules are what actually enforce
// this; the functions here just decide what to show).
//
//   paid -> confirmed -> dispatched -> in_transit -> delivered
//
// The seller moves an order forward up to "in transit"; only the buyer can
// confirm delivery. "dispatched" may go straight to "delivered" for local
// hand-overs. Cancelling a paid order means a refund, so for now it is an
// admin-only action done in the console, not a button.
//
// Pure functions only - no Firebase - so they are easy to test.

export const ORDER_STEPS = [
  { id: "paid", label: "Paid", detail: "Payment received" },
  { id: "confirmed", label: "Confirmed", detail: "Seller accepted the order" },
  { id: "dispatched", label: "Dispatched", detail: "Goods are ready and handed off" },
  { id: "in_transit", label: "In transit", detail: "On the way to the buyer" },
  { id: "delivered", label: "Delivered", detail: "Buyer received the goods" },
];

export const STATUS_LABELS = {
  ...Object.fromEntries(ORDER_STEPS.map((s) => [s.id, s.label])),
  cancelled: "Cancelled",
};

// What the person pressing the button is doing, per target status.
export const ACTION_LABELS = {
  confirmed: "Confirm order",
  dispatched: "Mark as dispatched",
  in_transit: "Mark as in transit",
  delivered: "Confirm delivery",
};

const SELLER_MOVES = {
  paid: ["confirmed"],
  confirmed: ["dispatched"],
  dispatched: ["in_transit"],
};

const BUYER_MOVES = {
  dispatched: ["delivered"],
  in_transit: ["delivered"],
};

// Older orders were saved as plain "paid" with no history; anything we do not
// recognise is treated the same way rather than crashing the page.
export function normaliseStatus(status) {
  return status === "cancelled" || ORDER_STEPS.some((s) => s.id === status) ? status : "paid";
}

export function stepIndex(status) {
  return ORDER_STEPS.findIndex((s) => s.id === normaliseStatus(status));
}

// Which side(s) of the order is this user? Usually one, but someone buying
// their own listing is both.
export function rolesFor(order, uid) {
  const roles = [];
  if (!uid || !order) return roles;
  if (order.sellerId === uid) roles.push("seller");
  if (order.buyerId === uid) roles.push("buyer");
  return roles;
}

export function canTransition(from, to, role) {
  const moves = role === "seller" ? SELLER_MOVES : role === "buyer" ? BUYER_MOVES : {};
  return (moves[normaliseStatus(from)] || []).includes(to);
}

// Statuses this user may move the order to right now.
export function allowedNext(order, uid) {
  const from = normaliseStatus(order?.status);
  const next = new Set();
  for (const role of rolesFor(order, uid)) {
    for (const to of (role === "seller" ? SELLER_MOVES : BUYER_MOVES)[from] || []) next.add(to);
  }
  return [...next];
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
  const current = stepIndex(status);
  return ORDER_STEPS.map((step, i) => ({
    ...step,
    state: i < current ? "done" : i === current ? "current" : "upcoming",
    at: i <= current ? timeReached(order, step.id) : null,
  }));
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
  switch (normaliseStatus(order?.status)) {
    case "paid":
      return "Waiting for the seller to confirm";
    case "confirmed":
      return "Waiting for the seller to dispatch";
    case "dispatched":
      return "Waiting for the seller to start delivery, or the buyer to confirm receipt";
    case "in_transit":
      return "Waiting for the buyer to confirm delivery";
    default:
      return "";
  }
}
