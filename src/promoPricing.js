// What a promotion costs, for the form's live preview. The server recomputes this
// itself (server/checkout.js) and charges ITS number, so this is only a preview.
// A test keeps the two in step.

export const RATE_PER_WORKING_DAY = 30; // N$ per working day, per the concept note

/**
 * Monday to Friday days from start to end inclusive (public holidays are not
 * excluded: a deliberate simplification). Dates are YYYY-MM-DD; 0 when invalid.
 * Uses UTC so the answer never depends on the visitor's time zone.
 */
export function countWorkingDays(startDate, endDate) {
  const ok = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
  if (!ok(startDate) || !ok(endDate)) return 0;
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (end < start) return 0;

  let count = 0;
  for (let t = start; t <= end; t += 86400000) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export const promotionCost = (startDate, endDate) => countWorkingDays(startDate, endDate) * RATE_PER_WORKING_DAY;
