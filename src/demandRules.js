// Rules for the Demand Board that don't need Firebase, so they can be tested.
// firestore.rules enforces the same limits on the server.

export const DEMAND_UNITS = ["kg", "ton", "unit", "crate", "litre"];
export const LIMITS = { title: 120, product: 80, notes: 600, pledgeNote: 200, quantity: 1e7 };

const text = (v) => (typeof v === "string" ? v.trim() : "");
const toNumber = (v) => (v === "" || v == null ? NaN : Number(v));

export function validateDemand({ title, product, quantityNeeded, unit, deadline, notes }, today = isoToday()) {
  const errors = {};
  if (!text(title)) errors.title = "Give your request a short title.";
  else if (text(title).length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;

  if (!text(product)) errors.product = "Say which product you need.";
  else if (text(product).length > LIMITS.product) errors.product = `Keep this under ${LIMITS.product} characters.`;

  const qty = toNumber(quantityNeeded);
  if (!Number.isFinite(qty) || qty <= 0) errors.quantityNeeded = "Enter how much you need (more than zero).";
  else if (qty > LIMITS.quantity) errors.quantityNeeded = "That quantity looks too large.";

  if (!DEMAND_UNITS.includes(unit)) errors.unit = "Choose a unit.";
  if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || deadline < today)) errors.deadline = "Choose today or a later date.";
  if (text(notes).length > LIMITS.notes) errors.notes = `Keep notes under ${LIMITS.notes} characters.`;
  return errors;
}

export function validatePledge({ quantity, note }, demand) {
  const errors = {};
  const qty = toNumber(quantity);
  if (!Number.isFinite(qty) || qty <= 0) errors.quantity = "Enter how much you can supply.";
  else if (qty > LIMITS.quantity) errors.quantity = "That quantity looks too large.";
  if (text(note).length > LIMITS.pledgeNote) errors.note = `Keep the note under ${LIMITS.pledgeNote} characters.`;
  if (demand && demand.status === "fulfilled") errors.demand = "This request is already fulfilled.";
  return errors;
}

export function summarizePledges(demand, pledges, uid) {
  const list = pledges || [];
  const pledged = list.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const needed = Number(demand.quantityNeeded) || 0;
  return {
    pledged,
    needed,
    remaining: Math.max(0, needed - pledged),
    percent: needed > 0 ? Math.min(100, Math.round((pledged / needed) * 100)) : 0,
    covered: needed > 0 && pledged >= needed,
    count: list.length,
    mine: list.filter((p) => p.farmerId === uid),
  };
}

/** "overdue", "soon" (within 3 days), "later", or null when there is no deadline. */
export function deadlineState(demand, today = isoToday()) {
  if (!demand.deadline || demand.status === "fulfilled") return null;
  if (demand.deadline < today) return "overdue";
  const days = Math.round((Date.parse(demand.deadline) - Date.parse(today)) / 86400000);
  return days <= 3 ? "soon" : "later";
}

export const FILTERS = [
  { id: "open", label: "Open" },
  { id: "fulfilled", label: "Fulfilled" },
  { id: "mine", label: "My requests" },
];

export function filterDemands(demands, filter, uid) {
  const list = demands || [];
  if (filter === "fulfilled") return list.filter((d) => d.status === "fulfilled");
  if (filter === "mine") return list.filter((d) => d.buyerId === uid);
  return list.filter((d) => d.status !== "fulfilled");
}

export const countByFilter = (demands, uid) =>
  Object.fromEntries(FILTERS.map((f) => [f.id, filterDemands(demands, f.id, uid).length]));

export function isoToday(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
