// What a farmer records about a farm and its inputs (seed, fertiliser, water,
// labour...), plus validation and cost summaries. Pure functions only, so the
// rules can be tested; Firestore access lives in src/farms.js and the same
// limits are enforced again in firestore.rules.

import { NAMIBIA_BOUNDS } from "./config";

export const INPUT_TYPES = [
  { id: "seed", label: "Seed" },
  { id: "fertiliser", label: "Fertiliser / manure" },
  { id: "pesticide", label: "Pesticide" },
  { id: "herbicide", label: "Herbicide" },
  { id: "water", label: "Water / irrigation" },
  { id: "labour", label: "Labour" },
  { id: "feed", label: "Animal feed" },
  { id: "veterinary", label: "Veterinary / medicine" },
  { id: "equipment", label: "Equipment / fuel" },
  { id: "other", label: "Other" },
];
export const INPUT_TYPE_IDS = INPUT_TYPES.map((t) => t.id);
export const inputTypeLabel = (id) => INPUT_TYPES.find((t) => t.id === id)?.label || "Other";

export const LIMITS = { name: 80, item: 80, notes: 500, note: 300, crops: 12, unit: 20, target: 60 };

const isNumber = (n) => typeof n === "number" && Number.isFinite(n);
const trimmed = (s) => (typeof s === "string" ? s.trim() : "");

/** Parse a form field to a non-negative number, or null if empty. NaN if invalid. */
export function parseAmount(value) {
  const text = String(value ?? "").replace(/,/g, ".").trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function validateFarm({ name, lat, lng, areaHa, notes, crops }) {
  const errors = {};
  if (!trimmed(name)) errors.name = "Give your farm a name.";
  else if (trimmed(name).length > LIMITS.name) errors.name = `Keep the name under ${LIMITS.name} characters.`;

  const [west, south, east, north] = NAMIBIA_BOUNDS;
  if (!isNumber(lat) || !isNumber(lng) || lng < west || lng > east || lat < south || lat > north) {
    errors.location = "Tap a spot inside Namibia on the map.";
  }
  if (areaHa != null && areaHa !== "" && Number.isNaN(parseAmount(areaHa))) errors.areaHa = "Area must be a number of hectares.";
  if (trimmed(notes).length > LIMITS.notes) errors.notes = `Keep notes under ${LIMITS.notes} characters.`;
  if ((crops || []).length > LIMITS.crops) errors.crops = `Choose at most ${LIMITS.crops} crops.`;
  return errors;
}

export function validateInput({ date, type, item, quantity, costNad, unit, note }) {
  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || Number.isNaN(Date.parse(date))) errors.date = "Choose the date.";
  if (!INPUT_TYPE_IDS.includes(type)) errors.type = "Choose what kind of input it was.";
  if (!trimmed(item)) errors.item = "Say what it was, for example 'Mahangu seed' or 'NPK 2:3:2'.";
  else if (trimmed(item).length > LIMITS.item) errors.item = `Keep this under ${LIMITS.item} characters.`;
  if (Number.isNaN(parseAmount(quantity))) errors.quantity = "Quantity must be a number.";
  if (Number.isNaN(parseAmount(costNad))) errors.costNad = "Cost must be a number in N$.";
  if (trimmed(unit).length > LIMITS.unit) errors.unit = "Unit is too long.";
  if (trimmed(note).length > LIMITS.note) errors.note = `Keep the note under ${LIMITS.note} characters.`;
  return errors;
}

/** Document ready for Firestore: trimmed, numbers parsed, empty optional fields left out. */
export function buildFarmDoc({ name, lat, lng, region, crops, areaHa, notes }) {
  const doc = { name: trimmed(name), lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
  if (region) doc.region = region;
  if (crops?.length) doc.crops = crops;
  const area = parseAmount(areaHa);
  if (area != null && !Number.isNaN(area)) doc.areaHa = area;
  if (trimmed(notes)) doc.notes = trimmed(notes);
  return doc;
}

export function buildInputDoc({ date, type, item, quantity, unit, costNad, target, note }) {
  const doc = { date, type, item: trimmed(item) };
  const q = parseAmount(quantity);
  if (q != null && !Number.isNaN(q)) doc.quantity = q;
  if (trimmed(unit)) doc.unit = trimmed(unit);
  const c = parseAmount(costNad);
  if (c != null && !Number.isNaN(c)) doc.costNad = c;
  if (trimmed(target)) doc.target = trimmed(target);
  if (trimmed(note)) doc.note = trimmed(note);
  return doc;
}

/** Totals for the farmer: money spent overall, by type, and by crop/animal. */
export function summarizeInputs(inputs) {
  const byType = {};
  const byTarget = {};
  let totalCost = 0;
  let costedEntries = 0;
  for (const input of inputs || []) {
    const cost = isNumber(input.costNad) ? input.costNad : 0;
    if (isNumber(input.costNad)) costedEntries += 1;
    totalCost += cost;
    byType[input.type] = (byType[input.type] || 0) + cost;
    if (input.target) byTarget[input.target] = (byTarget[input.target] || 0) + cost;
  }
  const rank = (obj) => Object.entries(obj).map(([key, cost]) => ({ key, cost })).sort((a, b) => b.cost - a.cost);
  return {
    count: (inputs || []).length,
    costedEntries,
    totalCost: Math.round(totalCost * 100) / 100,
    byType: rank(byType),
    byTarget: rank(byTarget),
  };
}

/** Newest first; entries on the same day keep the order they were added in. */
export const sortInputs = (inputs) =>
  [...(inputs || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

export const todayIso = (now = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
};
