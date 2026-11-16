// The shopping basket. Kept in this browser (per signed-in person) so it survives a reload
// and a closed tab, and never sent anywhere until the buyer chooses to pay: the server
// works the real prices out from the listings when they do.
//
// One payment covers one seller (one trip, one payout account), so the basket groups what
// you chose by seller and each group is paid for on its own.

import { useSyncExternalStore } from "react";
import { auth } from "../firebaseConfig";
import { MAX_QUANTITY, availableUnits } from "../purchase";

export const MAX_LINES = 20; // different listings in one basket (the server enforces the same)
const round2 = (n) => Math.round(n * 100) / 100;

/** A whole number of units between 1 and what is left (or the most one order can hold). */
export function clampLine(quantity, listing) {
  const max = Math.min(availableUnits(listing), MAX_QUANTITY);
  if (max < 1) return 0;
  const n = Math.floor(Number(quantity));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}

/** What the basket remembers about a listing, so it can be drawn without asking the database again. */
const snapshot = (listing) => ({
  product: String(listing.product || "").slice(0, 120),
  price: Number(listing.price) || 0,
  unit: listing.unit || "",
  sellerId: listing.sellerId,
  sellerName: String(listing.sellerName || "").slice(0, 120),
  imageUrl: listing.imageUrl || "",
  quantityLeft: typeof listing.quantity === "number" ? listing.quantity : null,
});

/** The basket after adding units of a listing (adding the same listing again adds to its line). Never changes `items`. */
export function addToCart(items, listing, quantity = 1) {
  if (!listing || !listing.id || !listing.sellerId) return { items, changed: false, reason: "invalid" };
  const existing = items.find((i) => i.listingId === listing.id);
  if (!existing && items.length >= MAX_LINES) return { items, changed: false, reason: "full" };
  const wanted = (existing ? existing.quantity : 0) + (Math.floor(Number(quantity)) || 1);
  const next = clampLine(wanted, listing);
  if (next < 1) return { items, changed: false, reason: "sold_out" };
  const line = { listingId: listing.id, quantity: next, ...snapshot(listing) };
  const rest = items.filter((i) => i.listingId !== listing.id);
  return { items: existing ? items.map((i) => (i.listingId === listing.id ? line : i)) : [...rest, line], changed: true, atLimit: next < wanted };
}

export function setLineQuantity(items, listingId, quantity) {
  return items.map((i) => (i.listingId === listingId ? { ...i, quantity: clampLine(quantity, { quantity: i.quantityLeft }) || i.quantity } : i));
}

export const removeLine = (items, listingId) => items.filter((i) => i.listingId !== listingId);

export const countUnits = (items) => items.length; // the badge counts lines, not kilograms

export const lineTotal = (line) => round2(line.price * line.quantity);

/** The basket split by seller, in the order sellers were first added: [{ sellerId, sellerName, lines, total }]. */
export function groupBySeller(items) {
  const groups = [];
  for (const line of items) {
    let group = groups.find((g) => g.sellerId === line.sellerId);
    if (!group) {
      group = { sellerId: line.sellerId, sellerName: line.sellerName, lines: [], total: 0 };
      groups.push(group);
    }
    group.lines.push(line);
    group.total = round2(group.total + lineTotal(line));
  }
  return groups;
}

/** Bring lines up to date with the listings as they are now: gone or sold out are dropped, price and stock refreshed, quantity trimmed. */
export function refreshLines(items, listingsById) {
  const dropped = [];
  const kept = [];
  for (const line of items) {
    const live = listingsById[line.listingId];
    if (!live || (typeof live.quantity === "number" && live.quantity <= 0)) {
      dropped.push(line);
      continue;
    }
    kept.push({ ...line, ...snapshot({ ...live, id: line.listingId }), listingId: line.listingId, quantity: clampLine(line.quantity, live) });
  }
  return { items: kept, dropped };
}

// ---- storage + a tiny store for React ---------------------------------------------------------------
const keyFor = (uid) => `aaf_cart_v1_${uid}`;
const listeners = new Set();
const EMPTY = []; // one shared empty basket: React needs the same array back each time it asks
let cache = { key: null, items: EMPTY };

function read(uid) {
  if (!uid) return EMPTY;
  const key = keyFor(uid);
  if (cache.key === key) return cache.items;
  let items = EMPTY;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(parsed)) {
      items = parsed.filter((i) => i && typeof i.listingId === "string" && Number.isInteger(i.quantity) && i.quantity > 0 && typeof i.sellerId === "string").slice(0, MAX_LINES);
    }
  } catch {
    // unreadable: start with an empty basket
  }
  cache = { key, items };
  return items;
}

function write(uid, items) {
  if (!uid) return;
  cache = { key: keyFor(uid), items };
  try {
    localStorage.setItem(keyFor(uid), JSON.stringify(items));
  } catch {
    // storage full or blocked: the basket still works until the page is closed
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key && event.key.startsWith("aaf_cart_v1_")) {
      cache = { key: null, items: EMPTY };
      listeners.forEach((l) => l());
    }
  });
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The signed-in person's basket and what can be done to it. */
export function useCart() {
  const uid = auth.currentUser?.uid || null;
  const items = useSyncExternalStore(subscribe, () => read(uid), () => EMPTY);
  return {
    items,
    count: countUnits(items),
    add: (listing, quantity) => {
      const result = addToCart(read(uid), listing, quantity);
      if (result.changed) write(uid, result.items);
      return result;
    },
    setQuantity: (listingId, quantity) => write(uid, setLineQuantity(read(uid), listingId, quantity)),
    remove: (listingId) => write(uid, removeLine(read(uid), listingId)),
    removeSeller: (sellerId) => write(uid, read(uid).filter((i) => i.sellerId !== sellerId)),
    replace: (next) => write(uid, next),
    clear: () => write(uid, []),
  };
}

/** For code that is not a component: the basket as it is now. */
export const readCart = (uid) => read(uid);
export const clearSellerFromCart = (uid, sellerId) => write(uid, read(uid).filter((i) => i.sellerId !== sellerId));

/** A basket line for one listing, without adding it to the basket (for "Buy now"). */
export function lineFromListing(listing, quantity = 1) {
  return { listingId: listing.id, quantity: clampLine(quantity, listing) || 1, ...snapshot(listing) };
}

// ---- remembering what was being paid for, so a successful payment empties just those lines ----------
const PENDING = "aaf_pending_checkout";

export function savePendingCheckout(uid, listingIds) {
  try {
    localStorage.setItem(PENDING, JSON.stringify({ uid, listingIds }));
  } catch {
    // blocked storage: the basket just keeps the lines, which is the safe way to be wrong
  }
}

/** Call when a payment is confirmed: takes what was just bought out of the basket. */
export function finishPendingCheckout() {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING) || "null");
    localStorage.removeItem(PENDING);
    const uid = auth.currentUser?.uid;
    if (!pending || !uid || pending.uid !== uid || !Array.isArray(pending.listingIds)) return;
    write(uid, read(uid).filter((i) => !pending.listingIds.includes(i.listingId)));
  } catch {
    // nothing to do
  }
}
