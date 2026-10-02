// Numbers for the Data and Statistics dashboards, computed from the same
// documents the rest of the app uses. Pure functions so they can be tested.

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const norm = (s) => String(s || "").trim().toLowerCase();
const titleCase = (s) => String(s || "").trim().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * One row per product and unit (a price per kg and a price per crate are not
 * comparable): how many listings and sellers, and the lowest/average/highest price.
 */
export function priceBoard(listings) {
  const rows = new Map();
  for (const l of listings || []) {
    const price = num(l.price);
    const product = norm(l.product);
    if (!product || price == null || price < 0) continue; // skip incomplete listings
    const unit = norm(l.unit) || "unit";
    const key = `${product}|${unit}`;
    const row = rows.get(key) || { product: titleCase(l.product), unit, listings: 0, sellers: new Set(), prices: [] };
    row.listings += 1;
    if (l.sellerId) row.sellers.add(l.sellerId);
    row.prices.push(price);
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((r) => ({
      product: r.product,
      unit: r.unit,
      listings: r.listings,
      sellers: r.sellers.size,
      min: Math.min(...r.prices),
      max: Math.max(...r.prices),
      avg: Math.round((r.prices.reduce((a, b) => a + b, 0) / r.prices.length) * 100) / 100,
    }))
    .sort((a, b) => b.listings - a.listings || a.product.localeCompare(b.product));
}

/** Open vs fulfilled counts and what open requests are asking for, by product. */
export function demandBoard(demands) {
  const list = demands || [];
  const open = list.filter((d) => d.status !== "fulfilled");
  const byProduct = new Map();
  for (const d of open) {
    const product = norm(d.product);
    const qty = num(d.quantityNeeded);
    if (!product || qty == null || qty <= 0) continue;
    const row = byProduct.get(product) || { product: titleCase(d.product), requests: 0, quantities: {} };
    row.requests += 1;
    const unit = norm(d.unit) || "unit";
    row.quantities[unit] = (row.quantities[unit] || 0) + qty; // never add kg to crates
    byProduct.set(product, row);
  }
  return {
    open: open.length,
    fulfilled: list.length - open.length,
    total: list.length,
    topProducts: [...byProduct.values()].sort((a, b) => b.requests - a.requests || a.product.localeCompare(b.product)),
  };
}

export const formatQuantities = (quantities) =>
  Object.entries(quantities || {})
    .map(([unit, qty]) => `${Number(qty).toLocaleString()} ${unit}`)
    .join(" + ");

const dayKey = (date) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

/** The last `n` local calendar days, oldest first, ending today. */
export function lastDays(n, now = new Date()) {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    days.push(dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)));
  }
  return days;
}

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Documents created per day over `days`, plus the total and the change versus the previous period. */
export function dailyCounts(docs, days, previousDays = []) {
  const counts = Object.fromEntries(days.map((d) => [d, 0]));
  const prev = new Set(previousDays);
  let previous = 0;
  for (const item of docs || []) {
    const created = toDate(item.createdAt);
    if (!created) continue;
    const key = dayKey(created);
    if (key in counts) counts[key] += 1;
    else if (prev.has(key)) previous += 1;
  }
  const series = days.map((day) => ({ day, count: counts[day] }));
  const total = series.reduce((sum, s) => sum + s.count, 0);
  return { series, total, previous, max: Math.max(1, ...series.map((s) => s.count)) };
}
