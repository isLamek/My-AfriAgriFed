// Marketplace listing rules shared by My listings (sellers), the Marketplace
// (buyers) and the map's "Find produce" view. Pure functions, unit tested.

// Namibia's 14 regions, as named in public/data/namibia-regions.geojson.
export const REGIONS = [
  "Erongo",
  "Hardap",
  "Karas",
  "Kavango East",
  "Kavango West",
  "Khomas",
  "Kunene",
  "Ohangwena",
  "Omaheke",
  "Omusati",
  "Oshana",
  "Oshikoto",
  "Otjozondjupa",
  "Zambezi",
];

export const CATEGORIES = [
  { id: "vegetables", label: "Vegetables" },
  { id: "fruit", label: "Fruit" },
  { id: "grain", label: "Grain & pulses" },
  { id: "livestock", label: "Livestock" },
  { id: "meat", label: "Meat" },
  { id: "poultry", label: "Poultry & eggs" },
  { id: "dairy", label: "Dairy" },
  { id: "other", label: "Other" },
];

export const UNITS = [
  { id: "kg", label: "per kg" },
  { id: "unit", label: "per unit" },
  { id: "tray", label: "per tray" },
  { id: "bunch", label: "per bunch" },
  { id: "bag", label: "per bag" },
  { id: "litre", label: "per litre" },
  { id: "head", label: "per head (livestock)" },
];

// How the buyer gets the goods. Shown on every listing so nobody pays first and
// discovers afterwards that they have to drive 300 km to collect.
export const FULFILMENT = [
  { id: "collect", label: "Buyer collects" },
  { id: "deliver", label: "Seller delivers" },
  { id: "both", label: "Collect or delivery" },
];

export const LIMITS = { product: 80, description: 400, deliveryNote: 160, maxPrice: 1000000 };

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || "";
export const fulfilmentLabel = (id) => FULFILMENT.find((f) => f.id === id)?.label || "";
export const unitLabel = (id) => UNITS.find((u) => u.id === id)?.label || (id ? `per ${id}` : "");

/** Checks the seller's form. Returns { ok, errors, value } with a cleaned listing. */
export function validateListing(form) {
  const errors = {};
  const product = String(form.product || "").trim();
  const description = String(form.description || "").trim();
  const deliveryNote = String(form.deliveryNote || "").trim();
  const price = Number(form.price);

  if (!product) errors.product = "Name the product.";
  else if (product.length > LIMITS.product) errors.product = `Keep the name under ${LIMITS.product} characters.`;
  if (form.price === "" || form.price == null || !Number.isFinite(price) || price <= 0) errors.price = "Enter a price above N$0.";
  else if (price > LIMITS.maxPrice) errors.price = "That price looks too high. Check it.";
  if (!REGIONS.includes(form.region)) errors.region = "Choose the region the produce is in.";
  if (!FULFILMENT.some((f) => f.id === form.fulfilment)) errors.fulfilment = "Say how buyers get the goods.";
  if (!UNITS.some((u) => u.id === form.unit)) errors.unit = "Choose a unit.";
  if (description.length > LIMITS.description) errors.description = `Keep the description under ${LIMITS.description} characters.`;
  if (deliveryNote.length > LIMITS.deliveryNote) errors.deliveryNote = `Keep this under ${LIMITS.deliveryNote} characters.`;

  let quantity = null;
  if (form.quantity !== "" && form.quantity != null) {
    quantity = Math.floor(Number(form.quantity));
    if (!Number.isFinite(quantity) || quantity < 0) errors.quantity = "Enter a whole number, or leave it empty.";
  }

  const value = {
    product,
    description,
    category: CATEGORIES.some((c) => c.id === form.category) ? form.category : "other",
    price: Math.round(price * 100) / 100,
    unit: form.unit,
    quantity,
    region: form.region,
    fulfilment: form.fulfilment,
    deliveryNote,
  };
  return { ok: Object.keys(errors).length === 0, errors, value };
}

/** Buyer-side filtering: search text, category and region. Sold-out listings go last. */
export function filterListings(listings, { search = "", category = "", region = "" } = {}) {
  const term = search.trim().toLowerCase();
  return (listings || [])
    .filter((l) => !term || [l.product, l.description, l.sellerName].some((v) => String(v || "").toLowerCase().includes(term)))
    .filter((l) => !category || l.category === category)
    .filter((l) => !region || l.region === region)
    .sort((a, b) => {
      const soldA = a.quantity === 0 ? 1 : 0;
      const soldB = b.quantity === 0 ? 1 : 0;
      if (soldA !== soldB) return soldA - soldB;
      return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    });
}

/** Listings that can be bought right now, counted per region (for the map). */
export function countByRegion(listings) {
  const counts = {};
  (listings || []).forEach((l) => {
    if (!l.region || l.quantity === 0) return;
    counts[l.region] = (counts[l.region] || 0) + 1;
  });
  return counts;
}
