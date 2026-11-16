// What is being bought, how it will get to the buyer, and what that costs: decided HERE,
// from the listings in the database. The browser only says WHICH listings, HOW MANY, and
// WHERE it wants them; it can never name a price. (server/checkout.js calls this when a
// buyer starts to pay for an order; POST /api/delivery/quote calls it to show the buyer
// the same answer before they pay.)
//
// A basket is one or more listings from ONE seller: one seller means one trip, one
// payout account and one set of delivery settings.

const rules = require("../src/delivery/rules");
const { HttpError } = require("./httpError");

const MAX_QUANTITY = 1000; // units of one listing
const MAX_LINES = 20; // different listings in one basket
const WINDOWS = ["morning", "afternoon", "anytime"];
const WINDHOEK_OFFSET_MS = 2 * 3600000; // Namibia is UTC+2 all year

const round2 = (n) => Math.round(n * 100) / 100;
const isId = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(s);

/** Today's date in Namibia as YYYY-MM-DD. */
const todayInNamibia = (nowMs) => new Date(nowMs + WINDHOEK_OFFSET_MS).toISOString().slice(0, 10);

/** A delivery or collection date: today up to two weeks ahead, or null when none was asked for. */
function cleanDate(value, nowMs) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, "bad_date", "Choose a date from today up to two weeks ahead.");
  }
  const today = todayInNamibia(nowMs);
  const last = todayInNamibia(nowMs + 14 * 86400000);
  if (value < today || value > last) throw new HttpError(400, "bad_date", "Choose a date from today up to two weeks ahead.");
  return value;
}

/** The lines of a basket as { listingId, quantity }: `items`, or one `listingId` + `quantity` as before. */
function readLines(body) {
  const raw = Array.isArray(body.items) ? body.items : [{ listingId: body.listingId, quantity: body.quantity }];
  if (raw.length < 1) throw new HttpError(400, "bad_request", "Choose a listing to buy.");
  if (raw.length > MAX_LINES) throw new HttpError(400, "too_many_items", `A basket can hold up to ${MAX_LINES} different items.`, { max: MAX_LINES });
  const seen = new Set();
  return raw.map((line) => {
    if (!line || !isId(line.listingId)) throw new HttpError(400, "bad_request", "Choose a listing to buy.");
    if (seen.has(line.listingId)) throw new HttpError(400, "bad_request", "The same listing is in the basket twice.");
    seen.add(line.listingId);
    const quantity = line.quantity === undefined ? 1 : line.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new HttpError(400, "bad_quantity", `Choose a whole number of units from 1 to ${MAX_QUANTITY}.`, { max: MAX_QUANTITY });
    }
    return { listingId: line.listingId, quantity };
  });
}

/** Look every listing up and check it can be bought. Returns { lines, sellerId, sellerName }. */
async function loadBasket(store, user, body) {
  if (user.anonymous) throw new HttpError(403, "sign_in_required", "Please sign in with your account to buy.");
  const wanted = readLines(body);
  const lines = [];
  for (const { listingId, quantity } of wanted) {
    const listing = await store.get(`marketPrices/${listingId}`);
    if (!listing) throw new HttpError(404, "listing_not_found", "That listing is no longer available.");
    const price = Number(listing.price);
    if (!Number.isFinite(price) || price <= 0) throw new HttpError(409, "listing_unpriced", "This listing has no valid price.");
    if (typeof listing.quantity === "number") {
      if (listing.quantity <= 0) throw new HttpError(409, "sold_out", "This listing is sold out.");
      if (quantity > listing.quantity) {
        throw new HttpError(409, "not_enough_stock", `Only ${listing.quantity} ${listing.quantity === 1 ? "is" : "are"} available.`, { count: listing.quantity });
      }
    }
    if (!listing.sellerId) throw new HttpError(409, "listing_unavailable", "This listing cannot be bought right now.");
    if (listing.sellerId === user.uid) throw new HttpError(400, "own_listing", "You can't buy your own listing.");
    lines.push({ listingId, quantity, listing, price });
  }
  const sellerId = lines[0].listing.sellerId;
  if (lines.some((l) => l.listing.sellerId !== sellerId)) {
    throw new HttpError(400, "mixed_sellers", "One payment can only cover one seller. Pay for each seller's items separately.");
  }
  return { lines, sellerId, sellerName: lines[0].listing.sellerName || "" };
}

/** Where the goods are collected from: the first listing that has a pin on the map. */
function pickupOf(lines) {
  const hit = lines.map((l) => l.listing.location).find((loc) => loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng));
  return hit ? { lat: hit.lat, lng: hit.lng, label: String(hit.label || "").slice(0, 60), region: String(hit.region || "").slice(0, 40) } : null;
}

/** One short line for an order that may hold several items. */
function summaryOf(items) {
  if (items.length === 1) return items[0].product;
  return `${items[0].product} + ${items.length - 1}`;
}

/** What each way of getting the goods would cost, for the checkout page. */
async function quoteBasket(store, user, body) {
  const basket = await loadBasket(store, user, body);
  const items = basket.lines.map((l) => ({ listingId: l.listingId, product: l.listing.product || "", quantity: l.quantity, unit: l.listing.unit || "", unitPrice: round2(l.price) }));
  const itemsTotal = round2(basket.lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
  const pickup = pickupOf(basket.lines);

  let dropoff = null;
  let addressProblem = null;
  if (body.address) {
    const cleaned = rules.cleanAddress({ contactName: "x", landmark: "xxx", ...body.address }); // a quote only needs the pin
    if (cleaned.ok) dropoff = { lat: cleaned.address.lat, lng: cleaned.address.lng };
    else addressProblem = cleaned.problem;
  }
  const quotes = rules.quoteAll({ listings: basket.lines.map((l) => l.listing), items, pickup, dropoff });
  return { basket, items, itemsTotal, pickup, quotes, addressProblem };
}

/**
 * Price a basket for payment. Returns what server/checkout.js needs:
 *   { amount, description, subaccount, sellerShare, record }
 * `record` is stored on the payment and copied onto the order once the payment is confirmed.
 */
async function priceBasket(store, user, body, { commissionRate = 0.05, nowMs = Date.now } = {}) {
  const { basket, items, itemsTotal, pickup, quotes } = await quoteBasket(store, user, {
    ...body,
    address: body.delivery && body.delivery.address,
  });
  const delivery = body.delivery || {};
  const method = delivery.method === undefined ? "collect" : delivery.method;
  if (!rules.METHODS.includes(method)) throw new HttpError(400, "bad_request", "Unknown delivery method.");

  // The payout account comes from the seller's own record, never from the browser.
  const seller = await store.get(`users/${basket.sellerId}`);
  const subaccount = seller && seller.flutterwaveSubaccountId;
  if (!subaccount) {
    throw new HttpError(409, "seller_not_ready", `${basket.sellerName || "This seller"} hasn't set up payouts yet. Please contact them directly.`, basket.sellerName ? { name: String(basket.sellerName).slice(0, 120) } : undefined);
  }

  // A delivery needs a complete address: say which part is missing before anything else.
  let address = null;
  if (method !== "collect") {
    const cleaned = rules.cleanAddress(delivery.address);
    if (!cleaned.ok && cleaned.problem === "contact") throw new HttpError(400, "contact_in_text", "Phone numbers, e-mails and links can't be shared here. Message each other in the app instead.");
    if (!cleaned.ok) throw new HttpError(400, "bad_address", "Please complete the delivery address.", { problem: cleaned.problem });
    address = cleaned.address;
  }

  const quote = quotes.find((q) => q.method === method);
  if (!quote.ok) {
    const code = { no_collect: "delivery_not_offered", not_offered: "delivery_not_offered", too_far: "delivery_too_far", too_heavy: "delivery_too_heavy", no_pickup: "no_pickup_location", no_address: "bad_address" }[quote.reason] || "delivery_not_offered";
    throw new HttpError(409, code, "That way of getting the order is not available.", quote.maxKm ? { max: quote.maxKm } : undefined);
  }

  let fulfilment = { method, deliveryFee: 0 };
  if (method !== "collect") {
    fulfilment = {
      method,
      deliveryFee: quote.fee,
      km: quote.km,
      etaMinutes: quote.etaMinutes,
      ...(quote.vehicle ? { vehicle: quote.vehicle } : {}),
      address,
    };
    // The buyer saw a fee on the checkout page; if it moved since (the seller changed their settings), say so rather than charge a different amount.
    if (delivery.expectedFee !== undefined && Number(delivery.expectedFee) !== quote.fee) {
      throw new HttpError(409, "delivery_price_changed", `The delivery fee is now N$${quote.fee}. Please check it and pay again.`, { fee: quote.fee, amount: `N$` + quote.fee });
    }
  }
  if (pickup) fulfilment.pickup = pickup;
  const date = cleanDate(delivery.date, nowMs());
  if (date) fulfilment.requestedDate = date;
  if (delivery.window !== undefined) {
    if (!WINDOWS.includes(delivery.window)) throw new HttpError(400, "bad_request", "Choose morning, afternoon or any time.");
    fulfilment.window = delivery.window;
  }
  const note = String(delivery.note || "").trim().slice(0, 200);
  if (rules.hasContactDetails(note)) throw new HttpError(400, "contact_in_text", "Phone numbers, e-mails and links can't be shared here. Message each other in the app instead.");
  if (note) fulfilment.note = note;

  const deliveryFee = fulfilment.deliveryFee;
  const amount = round2(itemsTotal + deliveryFee);
  // What the seller's account receives. The goods less our commission, plus the delivery fee when the
  // seller delivers (the fee for a carrier stays with AfriAgriFed, which pays the carrier).
  const sellerShare = round2(itemsTotal * (1 - commissionRate) + (method === "seller" ? deliveryFee : 0));
  const first = items[0];
  const single = items.length === 1;

  return {
    amount,
    description: items.map((i) => `${i.quantity > 1 ? `${i.quantity} x ` : ""}${i.product || "Marketplace order"}`).join(", ").slice(0, 200),
    subaccount,
    sellerShare: deliveryFee > 0 ? sellerShare : undefined,
    record: {
      sellerId: basket.sellerId,
      sellerName: basket.sellerName,
      items,
      itemsTotal,
      deliveryFee,
      fulfilment,
      // legacy single-item fields, so older screens and notifications keep working
      listingId: first.listingId,
      product: summaryOf(items),
      quantity: single ? first.quantity : null,
      unit: single ? first.unit : "",
      unitPrice: single ? first.unitPrice : null,
    },
  };
}

module.exports = { loadBasket, quoteBasket, priceBasket, pickupOf, summaryOf, todayInNamibia, cleanDate, MAX_QUANTITY, MAX_LINES, WINDOWS };
