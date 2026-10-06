// The visitor's choice about optional analytics, made in the cookie banner.
//
// Essential storage (staying signed in, remembering the sidebar, caching map
// data) needs no consent. Optional analytics (src/telemetry.js) only runs
// after an explicit "Allow". Declining is as easy as allowing, and the choice
// can be changed at any time from the Cookie policy page.

const KEY = "aaf_consent_v1";
const listeners = new Set();

export const CONSENT = { ALLOWED: "allowed", DECLINED: "declined" };

export function getConsent() {
  try {
    const value = localStorage.getItem(KEY);
    return value === CONSENT.ALLOWED || value === CONSENT.DECLINED ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // storage blocked: treat as "not allowed", which is the safe default
  }
  listeners.forEach((fn) => fn(value));
}

export const analyticsAllowed = () => getConsent() === CONSENT.ALLOWED;

export function onConsentChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
