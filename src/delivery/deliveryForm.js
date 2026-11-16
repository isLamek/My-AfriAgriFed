// The seller's "how can buyers get this?" settings on a listing: the form's state, and the
// document that is saved. The server re-checks everything (src/delivery/rules.js cleanDelivery),
// so a hand-made listing with silly settings simply falls back to "collect only".

import { cleanDelivery, deliveryOf, PLATFORM_RATE, SELLER_FEE_LIMITS } from "./rules";

const REMEMBER = "aaf_last_delivery_settings";

export const defaultDelivery = () => ({ collect: true, platform: false, ownEnabled: false, baseFee: "20", perKm: "5", maxKm: "30" });

/** The form state for a listing already saved. */
export function fromListing(listing) {
  const d = deliveryOf(listing);
  return {
    collect: d.collect,
    platform: d.platform,
    ownEnabled: !!d.own,
    baseFee: d.own ? String(d.own.baseFee) : "20",
    perKm: d.own ? String(d.own.perKm) : "5",
    maxKm: d.own ? String(d.own.maxKm) : "30",
  };
}

/**
 * The document to save from the form, or { problem } when something is wrong.
 * problem: "none" (no way to get it), "fees" (numbers out of range), "pin" (delivery needs a place on the map).
 */
export function toDoc(state, { hasPin }) {
  const doc = cleanDelivery({
    collect: state.collect,
    platform: state.platform,
    own: state.ownEnabled ? { enabled: true, baseFee: state.baseFee, perKm: state.perKm, maxKm: state.maxKm } : null,
  });
  if (!doc) return { problem: !state.collect && !state.platform && !state.ownEnabled ? "none" : "fees" };
  if ((doc.platform || doc.own) && !hasPin) return { problem: "pin" };
  return { doc };
}

/** What the seller used last time, so the next listing starts from it. */
export function rememberDelivery(state) {
  try {
    localStorage.setItem(REMEMBER, JSON.stringify(state));
  } catch {
    // fine: the next listing starts from the defaults
  }
}

export function lastDelivery() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER) || "null");
    return saved && typeof saved === "object" ? { ...defaultDelivery(), ...saved } : defaultDelivery();
  } catch {
    return defaultDelivery();
  }
}

export const LIMITS = { ...SELLER_FEE_LIMITS, platformShare: PLATFORM_RATE.carrierShare };
