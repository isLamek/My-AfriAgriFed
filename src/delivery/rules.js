// Delivery rules: how an order gets from the seller to the buyer, what that costs,
// how long it takes, and how the handover is proved.
//
// This file is plain CommonJS with no imports, so the website AND the server
// (server/delivery.js, server/checkout.js) use the very same numbers. The server
// is the authority on prices; the website only shows the same answer early.
//
// Three ways to receive an order:
//   collect   the buyer fetches it from the seller (no fee)
//   seller    the seller delivers it themselves, in their own vehicle, at a fee
//             THEY set (flat fee + per km, a maximum distance)
//   platform  AfriAgriFed arranges a carrier (a registered transporter with a
//             bakkie or truck). We own no vehicles: carriers claim the job.
//
// Every figure below is a starting point the owner can change in one place.

const METHODS = ["collect", "seller", "platform"];

// ---- time limits (hours) -----------------------------------------------------------------
const LIMITS = {
  sellerConfirmHours: 24, // the seller must accept a paid order, or it is cancelled and refunded
  carrierClaimHours: 6, // an open job nobody claimed in this time goes to the support team
  remindHours: 6, // an accepted order the seller has done nothing with (or not asked a carrier for) gets one reminder
  stalledHours: 72, // an accepted order that has not moved this long: the buyer may cancel it and be refunded
  releaseVerifiedHours: 24, // payout may be released this long after a code-verified handover...
  releaseUnverifiedHours: 72, // ...or this long after a handover without the code (buyer can still object)
  codeTries: 5, // wrong handover codes allowed before the order is locked for support
  locationEverySeconds: 10, // the most often a vehicle's position is saved
  locationStaleMinutes: 5, // older than this, the map says "last seen"
};

// ---- distance ----------------------------------------------------------------------------
const EARTH_KM = 6371;
const ROAD_FACTOR = 1.3; // roads are longer than a straight line; Namibian gravel routes even more
const AVERAGE_SPEED_KMH = 55; // bakkie on mixed tar and gravel
const HANDLING_MINUTES = 30; // loading, unloading and finding the address

const toRad = (d) => (d * Math.PI) / 180;

/** Straight-line distance between two points, in km. */
function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Estimated driving distance, in km, to one decimal. */
function roadKm(a, b) {
  return Math.round(haversineKm(a, b) * ROAD_FACTOR * 10) / 10;
}

/** Minutes of driving for `km` of road (no loading or finding the address). */
function driveMinutes(km) {
  return Math.round((km / AVERAGE_SPEED_KMH) * 60);
}

/** Estimated minutes door to door for a drive of `km`. */
function etaMinutes(km) {
  return driveMinutes(km) + HANDLING_MINUTES;
}

// ---- how heavy is an order, and which vehicle does it need ---------------------------------------
// Listings are sold per kg / unit / tray / bunch / litre. Rough weights, only used to pick a vehicle.
const UNIT_KG = { kg: 1, unit: 1.5, tray: 6, bunch: 0.5, litre: 1 };

function orderWeightKg(items) {
  return (items || []).reduce((sum, i) => sum + (UNIT_KG[i.unit] ?? 1) * (Number(i.quantity) || 0), 0);
}

// Vehicle classes, smallest first. `rate` multiplies the platform fee.
const VEHICLES = [
  { id: "small", maxKg: 40, rate: 0.7 }, // a car or motorbike
  { id: "bakkie", maxKg: 1000, rate: 1 }, // pick-up
  { id: "truck", maxKg: 8000, rate: 1.9 }, // light truck
];

/** The smallest vehicle that can carry this load, or null when it is too big for any. */
function vehicleFor(weightKg) {
  return VEHICLES.find((v) => weightKg <= v.maxKg) || null;
}

/** Can a carrier whose vehicle class is `have` take a job that needs `need`? A bigger vehicle can always do a smaller job. */
function vehicleFits(have, need) {
  const h = VEHICLES.findIndex((v) => v.id === have);
  const n = VEHICLES.findIndex((v) => v.id === need);
  return h >= 0 && n >= 0 && h >= n;
}

// ---- fees ------------------------------------------------------------------------------------------
const PLATFORM_RATE = {
  base: 35, // N$ to start the trip
  perKm: 8, // N$ per km of road
  minimum: 60, // N$ never less than this
  maxKm: 800, // beyond this we do not arrange delivery
  carrierShare: 0.85, // share of the fee that goes to the carrier; the rest keeps the service running
};

const SELLER_FEE_LIMITS = { baseMax: 500, perKmMax: 50, maxKmMax: 1000 };

const round2 = (n) => Math.round(n * 100) / 100;
const whole = (n) => Math.ceil(n - 1e-9) || 0; // "|| 0" turns -0 into 0

/** What AfriAgriFed charges to have a carrier deliver `km` of road with `vehicleId`. */
function platformFee(km, vehicleId) {
  const vehicle = VEHICLES.find((v) => v.id === vehicleId) || VEHICLES[1];
  return whole(Math.max(PLATFORM_RATE.minimum, (PLATFORM_RATE.base + PLATFORM_RATE.perKm * km) * vehicle.rate));
}

/** What the carrier earns from that fee. */
function carrierPay(fee) {
  return round2(fee * PLATFORM_RATE.carrierShare);
}

/** A seller's own delivery fee, from the settings they put on the listing. */
function sellerFee(km, own) {
  return whole((Number(own.baseFee) || 0) + (Number(own.perKm) || 0) * km);
}

/** Are a seller's delivery settings sane? Returns the cleaned settings, or null. */
function cleanDelivery(input) {
  if (input == null) return null;
  if (typeof input !== "object") return null;
  const out = { collect: input.collect !== false, platform: input.platform === true, own: null };
  const own = input.own;
  if (own && own.enabled === true) {
    const baseFee = Number(own.baseFee);
    const perKm = Number(own.perKm);
    const maxKm = Number(own.maxKm);
    if (![baseFee, perKm, maxKm].every(Number.isFinite)) return null;
    if (baseFee < 0 || baseFee > SELLER_FEE_LIMITS.baseMax) return null;
    if (perKm < 0 || perKm > SELLER_FEE_LIMITS.perKmMax) return null;
    if (maxKm < 1 || maxKm > SELLER_FEE_LIMITS.maxKmMax) return null;
    out.own = { enabled: true, baseFee: round2(baseFee), perKm: round2(perKm), maxKm: Math.round(maxKm) };
  }
  if (!out.collect && !out.platform && !out.own) return null; // the buyer must have some way to get it
  return out;
}

/** What a listing allows when its seller never set anything (older listings): collection only, as before. */
function deliveryOf(listing) {
  return cleanDelivery(listing && listing.delivery) || { collect: true, platform: false, own: null };
}

// ---- the drop-off address -------------------------------------------------------------------------------
// Many places have no street address, so the buyer drops a pin and describes it in words.
const NAMIBIA = { south: -29.7, north: -16.4, west: 11.0, east: 25.9 };

const inNamibia = (lat, lng) => lat >= NAMIBIA.south && lat <= NAMIBIA.north && lng >= NAMIBIA.west && lng <= NAMIBIA.east;

function cleanPhone(raw) {
  const digits = String(raw || "").replace(/[^\d+]/g, "");
  const only = digits.replace(/\+/g, "");
  return only.length >= 7 && only.length <= 15 ? digits.slice(0, 18) : "";
}

// Free text on an order (where to find the place, a note for the carrier) must not carry a way to
// talk or pay outside the app. This is the same idea as src/contactGuard.js and the chat rules in
// firestore.rules, written here so the server can apply it too.
const CONTACT_PATTERNS = [
  /(?:\+|\b00)?\(?\d(?:[\s().\-/]{0,2}\d){8,}(?![\d:])/, // a phone number
  /[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[A-Za-z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[A-Za-z0-9-]+)+/i, // an e-mail
  /\b(?:https?:\/\/|www\.)\S+/i, // a link
  /\b(?:wa\.me|whatsapp|whats\s?app|watsapp|telegram|t\.me|signal\s+me|imo|facebook\.com|fb\.me|instagram|insta)\b/i, // a messenger
  /\b(?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|nul|een|twee|drie|vier|vyf|ses|sewe|agt|nege)[\s,.-]*){7,}/i, // a number spelt out
];

/** Does this text carry a phone number, e-mail, link or messenger name? */
function hasContactDetails(text) {
  const s = String(text || "");
  return CONTACT_PATTERNS.some((p) => p.test(s));
}

/** The buyer's drop-off details, cleaned. No phone number: everyone talks in the app. Returns { ok, address } or { ok: false, problem }. */
function cleanAddress(input) {
  const a = input || {};
  const lat = Number(a.lat);
  const lng = Number(a.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inNamibia(lat, lng)) return { ok: false, problem: "pin" };
  const landmark = String(a.landmark || "").trim().slice(0, 200);
  if (landmark.length < 3) return { ok: false, problem: "landmark" };
  if (hasContactDetails(landmark)) return { ok: false, problem: "contact" };
  const contactName = String(a.contactName || "").trim().slice(0, 80);
  if (!contactName) return { ok: false, problem: "name" };
  if (hasContactDetails(contactName)) return { ok: false, problem: "contact" };
  const label = String(a.label || "").trim().slice(0, 60) || "Namibia";
  return { ok: true, address: { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, label, landmark, contactName } };
}

/** A pin rounded to about 1 km: enough for a carrier to judge the job, not enough to find the house. */
function roughPlace(point) {
  return { lat: Math.round(point.lat * 100) / 100, lng: Math.round(point.lng * 100) / 100 };
}

// ---- the handover code -------------------------------------------------------------------------------------
// The buyer sees a 6-digit code on their order. Whoever hands the goods over (carrier, seller, or
// the seller at a collection) asks for it; typing it in is the buyer's "yes, I got it".
function newHandoverCode(randomInt) {
  const n = randomInt(0, 1000000);
  return String(n).padStart(6, "0");
}

const normaliseCode = (s) => String(s || "").replace(/\D/g, "");

// ---- one answer for the checkout page and the server ---------------------------------------------------------
/**
 * What each delivery method would cost for these items going from `pickup` to `dropoff`.
 * Returns an array of { method, ok, fee, km, etaMinutes, vehicle, reason }.
 * `reason` is a short code when a method is not available ("too_far", "no_pickup", ...).
 */
function quoteAll({ listings, items, pickup, dropoff }) {
  const delivery = listings.map(deliveryOf);
  const weight = orderWeightKg(items);
  const out = [];

  out.push({ method: "collect", ok: delivery.every((d) => d.collect), fee: 0, reason: delivery.every((d) => d.collect) ? null : "no_collect" });

  const dest = dropoff || null;
  const km = pickup && dest ? roadKm(pickup, dest) : null;

  const own = delivery.map((d) => d.own);
  if (own.every(Boolean)) {
    // Several items from one seller share one trip: the strictest settings apply.
    const maxKm = Math.min(...own.map((o) => o.maxKm));
    const baseFee = Math.max(...own.map((o) => o.baseFee));
    const perKm = Math.max(...own.map((o) => o.perKm));
    if (km == null) out.push({ method: "seller", ok: false, reason: dest ? "no_pickup" : "no_address" });
    else if (km > maxKm) out.push({ method: "seller", ok: false, km, reason: "too_far", maxKm });
    else out.push({ method: "seller", ok: true, km, fee: sellerFee(km, { baseFee, perKm }), etaMinutes: etaMinutes(km) });
  } else {
    out.push({ method: "seller", ok: false, reason: "not_offered" });
  }

  if (delivery.every((d) => d.platform)) {
    const vehicle = vehicleFor(weight);
    if (km == null) out.push({ method: "platform", ok: false, reason: dest ? "no_pickup" : "no_address" });
    else if (!vehicle) out.push({ method: "platform", ok: false, km, reason: "too_heavy" });
    else if (km > PLATFORM_RATE.maxKm) out.push({ method: "platform", ok: false, km, reason: "too_far", maxKm: PLATFORM_RATE.maxKm });
    else out.push({ method: "platform", ok: true, km, fee: platformFee(km, vehicle.id), vehicle: vehicle.id, etaMinutes: etaMinutes(km) });
  } else {
    out.push({ method: "platform", ok: false, reason: "not_offered" });
  }
  return out;
}

module.exports = {
  METHODS,
  LIMITS,
  ROAD_FACTOR,
  VEHICLES,
  PLATFORM_RATE,
  SELLER_FEE_LIMITS,
  UNIT_KG,
  haversineKm,
  roadKm,
  etaMinutes,
  driveMinutes,
  orderWeightKg,
  vehicleFor,
  vehicleFits,
  platformFee,
  carrierPay,
  sellerFee,
  cleanDelivery,
  deliveryOf,
  cleanAddress,
  cleanPhone,
  hasContactDetails,
  roughPlace,
  inNamibia,
  newHandoverCode,
  normaliseCode,
  quoteAll,
};
