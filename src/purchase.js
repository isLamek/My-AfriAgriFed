// Quantity and stock rules for the marketplace, kept out of the components so
// they can be tested. The server enforces the same limits when it prices an
// order (server/checkout.js); this only drives what the buyer sees.

export const MAX_QUANTITY = 1000;
export const LOW_STOCK_AT = 5;

const round2 = (n) => Math.round(n * 100) / 100;

/** How many units can be bought: a number, or Infinity when the seller set no limit. */
export function availableUnits(listing) {
  return typeof listing?.quantity === "number" ? Math.max(0, listing.quantity) : Infinity;
}

/** Turn whatever is in the quantity box into a whole number the buyer may actually buy (0 if sold out). */
export function clampQuantity(value, listing) {
  const max = Math.min(availableUnits(listing), MAX_QUANTITY);
  if (max < 1) return 0;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}

export const lineTotal = (price, quantity) => round2((Number(price) || 0) * (Number(quantity) || 0));

/** What to say about a listing's stock: { state, text }. */
export function stockLabel(listing) {
  const left = availableUnits(listing);
  if (left === 0) return { state: "sold_out", text: "Sold out" };
  if (left === Infinity) return { state: "unlimited", text: "" };
  if (left <= LOW_STOCK_AT) return { state: "low", text: `Only ${left} left` };
  return { state: "in_stock", text: `${left} available` };
}

// Whole amounts as N$50, amounts with cents as N$226.50 (never N$226.5).
export const formatNad = (n) => {
  const cents = Number.isInteger(Number(n)) ? 0 : 2;
  return `N$${Number(n).toLocaleString(undefined, { minimumFractionDigits: cents, maximumFractionDigits: 2 })}`;
};

/** "3 kg" / "3" for an order line. */
export function quantityText(order) {
  const q = order?.quantity;
  if (!q || q === 1) return order?.unit ? `1 ${order.unit}` : "";
  return `${q}${order.unit ? ` ${order.unit}` : ""}`;
}
