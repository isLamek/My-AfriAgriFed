// Small helpers that turn delivery numbers into words in the reader's language.

import { t, formatNumber } from "../i18n";

export const formatKm = (km) => t("delivery.km", { km: formatNumber(Number(km) || 0, { maximumFractionDigits: 1 }) });

/** "45 min", "2 h", "2 h 10 min": rounded to five minutes, because a drive is never that exact. */
export function formatDuration(minutes) {
  const total = Math.max(5, Math.round((Number(minutes) || 0) / 5) * 5);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return t("delivery.duration.min", { m });
  if (m === 0) return t("delivery.duration.h", { h });
  return t("delivery.duration.hm", { h, m });
}

/** "I'll collect it", "Ndapewa delivers it", "AfriAgriFed carrier". `sellerName` is the seller's name (for "delivers it"). */
export const methodName = (method, sellerName = "") =>
  t(`delivery.method.${method === "platform" || method === "collect" ? method : "seller"}`, { name: sellerName || t("tracker.seller") });

/** Why a way of getting the order is not on offer, in words. `quote` is the server's answer for that method. */
export function reasonText(quote) {
  switch (quote.reason) {
    case "too_far":
      return t("delivery.reason.tooFar", { max: quote.maxKm });
    case "too_heavy":
      return t("delivery.reason.tooHeavy");
    case "no_pickup":
      return t("delivery.reason.noPickup");
    case "no_address":
      return t("delivery.reason.needAddress");
    default:
      return t("delivery.reason.notOffered");
  }
}

/** The vehicle a load needs, in words. */
export const vehicleName = (id) => t(`delivery.vehicle.${id === "small" || id === "truck" ? id : "bakkie"}`);

/** "Today 14:05" style stamp for a position or a step. */
export function agoText(ms, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - ms) / 60000));
  if (minutes < 1) return t("delivery.justNow");
  return t("delivery.minutesAgo", { count: minutes });
}
