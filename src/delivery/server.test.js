/**
 * @jest-environment node
 */
// The delivery rules in server/delivery.js and server/basket.js: who may do what to an order
// after it is paid. Flutterwave and Firebase are replaced with fakes.

const http = require("http");
const express = require("express");
const checkout = require("../../server/checkout");
const delivery = require("../../server/delivery");
const { memoryStore } = require("../../server/store");

const quiet = { warn: () => {}, error: () => {} };
const HOUR = 3600000;
const T0 = 1_760_000_000_000; // a fixed "now"

const USERS = {
  "tok-buyer": { uid: "buyer1", email: "buyer@example.com", name: "Bea Buyer" },
  "tok-seller": { uid: "seller1", email: "seller@example.com", name: "Sam Seller" },
  "tok-carrier": { uid: "carrier1", email: "carrier@example.com", name: "Cal Carrier" },
  "tok-carrier2": { uid: "carrier2", email: "carrier2@example.com", name: "Cy Carrier" },
  "tok-small": { uid: "carrier3", email: "small@example.com", name: "Mo Motorbike" },
  "tok-other": { uid: "other1", email: "other@example.com", name: "Olu Other" },
  "tok-admin": { uid: "admin1", email: "admin@example.com", emailVerified: true, name: "Ada Admin" },
  "tok-fakeadmin": { uid: "fake1", email: "admin@example.com", emailVerified: false, name: "Not Ada" },
  "tok-anon": { uid: "anon1", anonymous: true },
};

const EVERYTHING = { collect: true, platform: true, own: { enabled: true, baseFee: 20, perKm: 5, maxKm: 60 } };
const OSHAKATI = { lat: -17.788, lng: 15.699, label: "Oshakati", region: "Oshana" };
const ADDRESS = { lat: -17.785, lng: 15.767, label: "Near Ongwediva", landmark: "Blue gate behind the Engen garage", contactName: "Bea" };

const SEED = () => ({
  "marketPrices/L1": { product: "Mahangu", price: 120, unit: "kg", sellerId: "seller1", sellerName: "Sam Seller", quantity: 100, location: OSHAKATI, delivery: EVERYTHING },
  "marketPrices/L2": { product: "Beans", price: 50, unit: "kg", sellerId: "seller1", sellerName: "Sam Seller", quantity: 10, location: OSHAKATI, delivery: EVERYTHING },
  "marketPrices/COLLECT": { product: "Eggs", price: 60, unit: "tray", sellerId: "seller1", sellerName: "Sam Seller", quantity: 10, location: OSHAKATI }, // no delivery settings: collection only
  "marketPrices/OTHERSELLER": { product: "Maize", price: 80, unit: "kg", sellerId: "seller2", sellerName: "Nia", quantity: 10, location: OSHAKATI },
  "marketPrices/NOPIN": { product: "Spinach", price: 10, unit: "bunch", sellerId: "seller1", sellerName: "Sam Seller", quantity: 10, delivery: EVERYTHING },
  "users/seller1": { flutterwaveSubaccountId: "RS_SELLER" },
  "users/seller2": { flutterwaveSubaccountId: "RS_SELLER2" },
  "carriers/carrier1": { status: "approved", name: "Cal Carrier", vehicle: { type: "bakkie", description: "White Hilux", plate: "N 123 W" }, regions: [], available: true },
  "carriers/carrier2": { status: "approved", name: "Cy Carrier", vehicle: { type: "truck", description: "Isuzu", plate: "N 9 W" }, regions: ["Oshana"] },
  "carriers/carrier3": { status: "approved", name: "Mo Motorbike", vehicle: { type: "small", description: "Honda", plate: "N 5 W" } },
  "carriers/pending1": { status: "pending", name: "New Person", vehicle: { type: "bakkie" } },
  "admins/admin@example.com": { role: "founder" },
});

let server;
let store;
let now;
let hookCalls;
let txs;

async function start({ seed = SEED(), hooks: hookOverrides = {} } = {}) {
  store = memoryStore(seed);
  now = T0;
  hookCalls = [];
  txs = {};
  const hooks = {
    onDelivered: async (o) => { hookCalls.push(["delivered", o.id]); return { payoutStatus: "held" }; },
    onReleaseDue: async (o) => { hookCalls.push(["release", o.id]); return { payoutStatus: "release_requested" }; },
    onCancelled: async (o, why) => { hookCalls.push(["cancelled", o.id, why]); return { payoutStatus: "refund_requested" }; },
    onDisputed: async (o) => { hookCalls.push(["disputed", o.id]); return { payoutStatus: "on_hold" }; },
    onResolved: async (o, outcome) => { hookCalls.push(["resolved", o.id, outcome]); return { payoutStatus: outcome === "refund" ? "refund_requested" : "release_requested" }; },
    ...hookOverrides,
  };
  const fetchImpl = jest.fn(async (url, opts = {}) => {
    const path = url.replace("https://api.flutterwave.com/v3", "");
    const reply = (body, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => body });
    if (path === "/payments") {
      fetchImpl.sent = JSON.parse(opts.body);
      return reply({ status: "success", data: { link: "https://pay.test/checkout/abc" } });
    }
    const verify = /^\/transactions\/(\d+)\/verify$/.exec(path);
    if (verify && txs[verify[1]]) return reply({ status: "success", data: txs[verify[1]] });
    return reply({ status: "error" }, false);
  });
  const app = express();
  app.use(express.json());
  const common = { store, verifyToken: async (t) => { if (!USERS[t]) throw new Error("bad token"); return { anonymous: false, emailVerified: false, ...USERS[t] }; }, log: quiet, nowMs: () => now };
  checkout.register(app, { ...common, fetchImpl, secretKey: "SK", secretHash: "HASH", appBaseUrl: "https://site.test", random: (() => { let n = 0; return () => `r${++n}`; })(), randomInt: () => 123456 });
  const svc = delivery.register(app, { ...common, hooks, sweepSecret: "SWEEP" });
  start.fetchImpl = fetchImpl;
  start.sweep = svc.sweep;
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
}

function call(method, path, { token, body, headers = {} } = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      { port, host: "127.0.0.1", path, method, headers: { ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null }));
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
const post = (path, token, body) => call("POST", path, { token, body });

afterEach(() => new Promise((r) => (server ? server.close(r) : r())));

// ---- helpers that put the shop in a given state ------------------------------------------------------
const order = (id = "tx_1") => store.docs.get(`orders/${id}`);

/** Pay for something and let the server make the order, the way the real flow does. */
async function buy(body, { token = "tok-buyer", txId = "1" } = {}) {
  const started = await post("/api/payments/initiate", token, { kind: "order", ...body });
  if (started.status !== 200) return { started };
  const txRef = started.json.txRef;
  txs[txId] = { id: Number(txId), status: "successful", tx_ref: txRef, amount: started.json.amount, currency: "NAD" };
  const verified = await call("GET", `/api/payments/verify/${txId}`, { token });
  return { started, verified, orderId: verified.json && verified.json.orderId };
}

const toStatus = (id, status, extra = {}) => {
  const o = order(id);
  store.docs.set(`orders/${id}`, { ...o, status, statusHistory: [...o.statusHistory, { status, by: "x", at: now }], ...extra });
};

const platformOrder = { items: [{ listingId: "L1", quantity: 50 }], delivery: { method: "platform", address: ADDRESS } };
const sellerOrder = { items: [{ listingId: "L1", quantity: 5 }], delivery: { method: "seller", address: ADDRESS } };
const collectOrder = { items: [{ listingId: "L1", quantity: 5 }], delivery: { method: "collect" } };

// ---- quoting and pricing ----------------------------------------------------------------------------------
describe("quoting a delivery", () => {
  it("needs a real sign-in", async () => {
    await start();
    expect((await post("/api/delivery/quote", undefined, { items: [{ listingId: "L1", quantity: 1 }] })).status).toBe(401);
    expect((await post("/api/delivery/quote", "tok-anon", { items: [{ listingId: "L1", quantity: 1 }] })).status).toBe(403);
  });

  it("returns every way of getting the order with the server's own prices", async () => {
    await start();
    const res = await post("/api/delivery/quote", "tok-buyer", { items: [{ listingId: "L1", quantity: 50 }], address: { lat: ADDRESS.lat, lng: ADDRESS.lng } });
    expect(res.status).toBe(200);
    expect(res.json.itemsTotal).toBe(6000);
    const q = Object.fromEntries(res.json.quotes.map((x) => [x.method, x]));
    expect(q.collect).toMatchObject({ ok: true, fee: 0 });
    expect(q.seller.ok).toBe(true);
    expect(q.platform).toMatchObject({ ok: true, vehicle: "bakkie" });
    expect(q.platform.fee).toBeGreaterThanOrEqual(60);
  });

  it("only offers collection for a listing whose seller never set delivery up", async () => {
    await start();
    const res = await post("/api/delivery/quote", "tok-buyer", { items: [{ listingId: "COLLECT", quantity: 1 }], address: { lat: ADDRESS.lat, lng: ADDRESS.lng } });
    const q = Object.fromEntries(res.json.quotes.map((x) => [x.method, x]));
    expect(q.collect.ok).toBe(true);
    expect(q.seller.reason).toBe("not_offered");
    expect(q.platform.reason).toBe("not_offered");
  });

  it("refuses a basket that mixes sellers, an empty one, and your own listing", async () => {
    await start();
    expect((await post("/api/delivery/quote", "tok-buyer", { items: [{ listingId: "L1", quantity: 1 }, { listingId: "OTHERSELLER", quantity: 1 }] })).json.error).toBe("mixed_sellers");
    expect((await post("/api/delivery/quote", "tok-buyer", { items: [] })).status).toBe(400);
    expect((await post("/api/delivery/quote", "tok-seller", { items: [{ listingId: "L1", quantity: 1 }] })).json.error).toBe("own_listing");
    expect((await post("/api/delivery/quote", "tok-buyer", { items: [{ listingId: "L1", quantity: 1 }, { listingId: "L1", quantity: 2 }] })).status).toBe(400);
  });
});

describe("paying for an order with delivery", () => {
  it("adds the server's delivery fee, and tells the seller's account exactly what it gets", async () => {
    await start();
    const res = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...platformOrder, delivery: { ...platformOrder.delivery, expectedFee: undefined } });
    expect(res.status).toBe(200);
    const fee = res.json.amount - 6000;
    expect(fee).toBeGreaterThanOrEqual(60);
    const sent = start.fetchImpl.sent;
    expect(sent.amount).toBe(res.json.amount);
    // a carrier's fee stays with AfriAgriFed: the seller's account gets the goods less 5% commission
    expect(sent.subaccounts).toEqual([{ id: "RS_SELLER", transaction_charge_type: "flat_subaccount", transaction_charge: 5700 }]);
  });

  it("gives the seller the delivery fee when the seller delivers", async () => {
    await start();
    const res = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...sellerOrder });
    const fee = res.json.amount - 600;
    expect(fee).toBeGreaterThan(0);
    expect(start.fetchImpl.sent.subaccounts[0].transaction_charge).toBe(570 + fee);
  });

  it("charges only the goods for a collection, and keeps the plain 95% split", async () => {
    await start();
    const res = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...collectOrder });
    expect(res.json.amount).toBe(600);
    expect(start.fetchImpl.sent.subaccounts).toEqual([{ id: "RS_SELLER" }]);
  });

  it("still takes the old single-listing request, as collection", async () => {
    await start();
    const res = await post("/api/payments/initiate", "tok-buyer", { kind: "order", listingId: "L1", quantity: 2 });
    expect(res.json.amount).toBe(240);
  });

  it("will not charge a different delivery fee than the buyer was shown", async () => {
    await start();
    const res = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...platformOrder, delivery: { ...platformOrder.delivery, expectedFee: 1 } });
    expect(res.status).toBe(409);
    expect(res.json.error).toBe("delivery_price_changed");
    expect(res.json.params.fee).toBeGreaterThan(1);
  });

  it("insists on a complete address, and a way the seller really offers", async () => {
    await start();
    const noLandmark = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...sellerOrder, delivery: { method: "seller", address: { ...ADDRESS, landmark: "" } } });
    expect(noLandmark.json).toMatchObject({ error: "bad_address", params: { problem: "landmark" } });
    const phoneInWords = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...sellerOrder, delivery: { method: "seller", address: { ...ADDRESS, landmark: "Gate 3, call 081 123 4567" } } });
    expect(phoneInWords.json.error).toBe("contact_in_text");
    const phoneInNote = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...sellerOrder, delivery: { method: "seller", address: ADDRESS, note: "whatsapp me" } });
    expect(phoneInNote.json.error).toBe("contact_in_text");
    const noAddress = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...sellerOrder, delivery: { method: "seller" } });
    expect(noAddress.json.error).toBe("bad_address");
    const notOffered = await post("/api/payments/initiate", "tok-buyer", { kind: "order", items: [{ listingId: "COLLECT", quantity: 1 }], delivery: { method: "platform", address: ADDRESS } });
    expect(notOffered.json.error).toBe("delivery_not_offered");
    const noPin = await post("/api/payments/initiate", "tok-buyer", { kind: "order", items: [{ listingId: "NOPIN", quantity: 1 }], delivery: { method: "platform", address: ADDRESS } });
    expect(noPin.json.error).toBe("no_pickup_location");
    const unknown = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...sellerOrder, delivery: { method: "drone", address: ADDRESS } });
    expect(unknown.status).toBe(400);
  });

  it("refuses an address outside Namibia and a seller's own delivery beyond their limit", async () => {
    await start();
    const far = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...sellerOrder, delivery: { method: "seller", address: { ...ADDRESS, lat: -22.57, lng: 17.083 } } });
    expect(far.json).toMatchObject({ error: "delivery_too_far", params: { max: 60 } });
    const abroad = await post("/api/payments/initiate", "tok-buyer", { kind: "order", ...sellerOrder, delivery: { method: "seller", address: { ...ADDRESS, lat: 51, lng: 0 } } });
    expect(abroad.json.error).toBe("bad_address");
  });

  it("checks the delivery date is real and soon", async () => {
    await start();
    const base = { kind: "order", ...collectOrder };
    const today = new Date(T0 + 2 * HOUR).toISOString().slice(0, 10);
    expect((await post("/api/payments/initiate", "tok-buyer", { ...base, delivery: { method: "collect", date: today, window: "morning" } })).status).toBe(200);
    expect((await post("/api/payments/initiate", "tok-buyer", { ...base, delivery: { method: "collect", date: "2020-01-01" } })).json.error).toBe("bad_date");
    expect((await post("/api/payments/initiate", "tok-buyer", { ...base, delivery: { method: "collect", date: "next week" } })).json.error).toBe("bad_date");
    expect((await post("/api/payments/initiate", "tok-buyer", { ...base, delivery: { method: "collect", window: "midnight" } })).status).toBe(400);
  });
});

describe("the order that a payment creates", () => {
  it("keeps the items, the delivery details and a handover code only the buyer can read", async () => {
    await start();
    const { orderId } = await buy({ items: [{ listingId: "L1", quantity: 5 }, { listingId: "L2", quantity: 2 }], delivery: { method: "seller", address: ADDRESS, note: "Ring the bell" } });
    const o = order(orderId);
    expect(o.items).toHaveLength(2);
    expect(o.product).toBe("Mahangu + 1");
    expect(o.itemsTotal).toBe(700);
    expect(o.amount).toBe(700 + o.deliveryFee);
    expect(JSON.stringify(o)).not.toMatch(/phone/i); // no phone number kept on the order
    expect(o.fulfilment).toMatchObject({ method: "seller", address: { contactName: "Bea" }, note: "Ring the bell", pickup: { label: "Oshakati" } });
    expect(store.docs.get(`orderSecrets/${orderId}`)).toMatchObject({ buyerId: "buyer1", code: "123456", tries: 0 });
    expect(store.docs.get("marketPrices/L1").quantity).toBe(95);
    expect(store.docs.get("marketPrices/L2").quantity).toBe(8);
    expect(o.stockApplied).toBe(true);
    expect(o.oversold).toBe(false);
  });

  it("keeps a single-item order looking exactly as before", async () => {
    await start();
    const { orderId } = await buy({ listingId: "L1", quantity: 3 });
    const o = order(orderId);
    expect(o).toMatchObject({ product: "Mahangu", quantity: 3, unit: "kg", unitPrice: 120, amount: 360, status: "paid" });
    expect(o.fulfilment).toMatchObject({ method: "collect", deliveryFee: 0 });
  });

  it("flags only the line that ran short when another buyer got there first", async () => {
    await start();
    const first = await post("/api/payments/initiate", "tok-buyer", { kind: "order", items: [{ listingId: "L1", quantity: 5 }, { listingId: "L2", quantity: 8 }], delivery: { method: "collect" } });
    store.docs.set("marketPrices/L2", { ...store.docs.get("marketPrices/L2"), quantity: 3 }); // sold elsewhere meanwhile
    txs["7"] = { id: 7, status: "successful", tx_ref: first.json.txRef, amount: first.json.amount, currency: "NAD" };
    const done = await call("GET", "/api/payments/verify/7", { token: "tok-buyer" });
    const o = order(done.json.orderId);
    expect(o.oversold).toBe(true);
    expect(o.oversold_0).toBe(false);
    expect(o.oversold_1).toBe(true);
    expect(store.docs.get("marketPrices/L2").quantity).toBe(0);
    const warn = store.list("notifications").filter((n) => n.key === "notif.order.oversold");
    expect(warn).toHaveLength(1);
    expect(warn[0].params.what).toContain("Beans");
  });

  it("makes one order and one code however often the payment is confirmed", async () => {
    await start();
    const { started, orderId } = await buy({ ...platformOrder });
    txs["1"].amount = started.json.amount;
    await call("GET", "/api/payments/verify/1", { token: "tok-buyer" });
    await post("/api/payments/webhook", undefined, {});
    expect(store.list("orders")).toHaveLength(1);
    expect(store.list("orderSecrets")).toHaveLength(1);
    expect(store.docs.get(`orderSecrets/${orderId}`).tries).toBe(0);
    expect(store.docs.get("marketPrices/L1").quantity).toBe(50);
  });
});

// ---- a carrier delivers ------------------------------------------------------------------------------------------------
describe("an AfriAgriFed carrier delivers", () => {
  async function confirmed() {
    const { orderId } = await buy(platformOrder);
    toStatus(orderId, "confirmed");
    return orderId;
  }

  it("lets only the seller of a platform order ask for a carrier, once", async () => {
    await start();
    const id = await confirmed();
    const body = { pickupNote: "Brown gate" };
    expect((await post(`/api/delivery/${id}/request-carrier`, "tok-buyer", body)).status).toBe(403);
    expect((await post(`/api/delivery/${id}/request-carrier`, "tok-seller", { pickupNote: "call me on 081 555 1234" })).json.error).toBe("contact_in_text");
    expect((await post(`/api/delivery/${id}/request-carrier`, "tok-seller", { ...body, readyAt: T0 + 100 * HOUR })).json.error).toBe("bad_ready_time");
    const ok = await post(`/api/delivery/${id}/request-carrier`, "tok-seller", body);
    expect(ok.status).toBe(200);
    expect((await post(`/api/delivery/${id}/request-carrier`, "tok-seller", body)).json.error).toBe("job_exists");

    const job = store.docs.get(`deliveryJobs/${id}`);
    expect(job).toMatchObject({ status: "open", vehicle: "bakkie", carrierId: null, what: "Mahangu" });
    expect(job.carrierPay).toBeCloseTo(job.fee * 0.85, 2);
    // before anyone takes the job, the drop-off is only a rough area: no landmark, no phone
    expect(job.dropoff).toEqual({ lat: -17.78, lng: 15.77, label: "Near Ongwediva" });
    expect(JSON.stringify(job)).not.toContain("264811234567");
    // the names are kept for the in-app chat; no phone numbers are kept at all
    const priv = store.docs.get(`deliveryPrivate/${id}`);
    expect(priv).toMatchObject({ buyerId: "buyer1", sellerId: "seller1", carrierId: null });
    expect(typeof priv.buyerName).toBe("string");
    expect(JSON.stringify(priv)).not.toMatch(/\d{9}/);
    // carriers who can take a bakkie load are told; the motorbike and the unapproved are not
    const told = store.list("notifications").filter((n) => n.key === "notif.delivery.jobOpen").map((n) => n.userId).sort();
    expect(told).toEqual(["carrier1", "carrier2"]);
  });

  it("does not offer a job to the wrong kind of order or at the wrong time", async () => {
    await start();
    const sellerDelivers = (await buy(sellerOrder, { txId: "2" })).orderId;
    toStatus(sellerDelivers, "confirmed");
    expect((await post(`/api/delivery/${sellerDelivers}/request-carrier`, "tok-seller", {})).json.error).toBe("not_platform_delivery");
    const unpaidYet = (await buy(platformOrder, { txId: "3" })).orderId; // still "paid": not accepted
    expect((await post(`/api/delivery/${unpaidYet}/request-carrier`, "tok-seller", {})).json.error).toBe("wrong_status");
  });

  async function openJob() {
    const id = await confirmed();
    await post(`/api/delivery/${id}/request-carrier`, "tok-seller", {});
    return id;
  }

  it("lets one approved carrier with a big enough vehicle take it, and nobody else", async () => {
    await start();
    const id = await openJob();
    expect((await post(`/api/delivery/jobs/${id}/claim`, "tok-other")).json.error).toBe("not_a_carrier");
    expect((await post(`/api/delivery/jobs/${id}/claim`, "tok-small")).json).toMatchObject({ error: "vehicle_too_small" });
    expect((await post(`/api/delivery/jobs/${id}/claim`, "tok-seller")).json.error).toBe("not_a_carrier");
    expect((await post(`/api/delivery/jobs/nothing/claim`, "tok-carrier")).status).toBe(404);

    const [a, b] = await Promise.all([post(`/api/delivery/jobs/${id}/claim`, "tok-carrier"), post(`/api/delivery/jobs/${id}/claim`, "tok-carrier2")]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? "carrier1" : "carrier2";
    expect(store.docs.get(`deliveryJobs/${id}`)).toMatchObject({ status: "claimed", carrierId: winner });
    expect(store.docs.get(`deliveryPrivate/${id}`).carrierId).toBe(winner);
    expect(order(id).fulfilment.carrier.uid).toBe(winner);
    expect(store.list("notifications").filter((n) => n.key === "notif.delivery.carrierAssigned").map((n) => n.userId).sort()).toEqual(["buyer1", "seller1"]);
  });

  it("refuses a carrier who is pending, unavailable or already busy", async () => {
    await start();
    const id = await openJob();
    USERS["tok-pending"] = { uid: "pending1", email: "p@example.com", name: "P" };
    store.docs.set("carriers/pending1", { status: "pending", vehicle: { type: "truck" } });
    expect((await post(`/api/delivery/jobs/${id}/claim`, "tok-pending")).json.error).toBe("not_a_carrier");
    store.docs.set("carriers/carrier1", { ...store.docs.get("carriers/carrier1"), available: false });
    expect((await post(`/api/delivery/jobs/${id}/claim`, "tok-carrier")).json.error).toBe("carrier_unavailable");
    store.docs.set("carriers/carrier1", { ...store.docs.get("carriers/carrier1"), available: true });
    for (const n of [1, 2, 3]) store.docs.set(`deliveryJobs/busy${n}`, { carrierId: "carrier1", status: "claimed" });
    expect((await post(`/api/delivery/jobs/${id}/claim`, "tok-carrier")).json).toMatchObject({ error: "too_many_jobs", params: { max: 3 } });
  });

  it("lets a carrier hand a job back before collecting it, and puts it back on the board", async () => {
    await start();
    const id = await openJob();
    await post(`/api/delivery/jobs/${id}/claim`, "tok-carrier");
    expect((await post(`/api/delivery/jobs/${id}/release`, "tok-carrier2")).status).toBe(409);
    expect((await post(`/api/delivery/jobs/${id}/release`, "tok-carrier")).status).toBe(200);
    expect(store.docs.get(`deliveryJobs/${id}`)).toMatchObject({ status: "open", carrierId: null });
    expect(order(id).fulfilment.carrier).toBeUndefined();
    expect(store.docs.get(`deliveryPrivate/${id}`).carrierId).toBeNull();
    expect((await post(`/api/delivery/jobs/${id}/claim`, "tok-carrier2")).status).toBe(200);
  });

  async function onTheRoad() {
    const id = await openJob();
    await post(`/api/delivery/jobs/${id}/claim`, "tok-carrier");
    expect((await post(`/api/delivery/${id}/pickup`, "tok-carrier")).status).toBe(200);
    return id;
  }

  it("moves the order to in transit only when the assigned carrier collects it", async () => {
    await start();
    const id = await openJob();
    expect((await post(`/api/delivery/${id}/pickup`, "tok-carrier")).status).toBe(403); // not claimed yet
    await post(`/api/delivery/jobs/${id}/claim`, "tok-carrier");
    expect((await post(`/api/delivery/${id}/pickup`, "tok-carrier2")).status).toBe(403);
    expect((await post(`/api/delivery/${id}/pickup`, "tok-seller")).status).toBe(403);
    expect((await post(`/api/delivery/${id}/pickup`, "tok-carrier")).status).toBe(200);
    expect(order(id).status).toBe("in_transit");
    expect(order(id).statusHistory.at(-1)).toMatchObject({ status: "in_transit", by: "carrier1" });
    expect(store.docs.get(`deliveryJobs/${id}`).status).toBe("picked_up");
    expect((await post(`/api/delivery/${id}/pickup`, "tok-carrier")).json.error).toBe("wrong_status"); // not twice
    expect((await post(`/api/delivery/jobs/${id}/release`, "tok-carrier")).status).toBe(409); // too late to drop it
  });

  it("saves the vehicle's position, no more than every few seconds, only while travelling, only from the right person", async () => {
    await start();
    const id = await openJob();
    await post(`/api/delivery/jobs/${id}/claim`, "tok-carrier");
    expect((await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: -17.8, lng: 15.7 })).json.error).toBe("not_travelling");
    await post(`/api/delivery/${id}/pickup`, "tok-carrier");

    expect((await post(`/api/delivery/${id}/location`, "tok-buyer", { lat: -17.8, lng: 15.7 })).status).toBe(403);
    expect((await post(`/api/delivery/${id}/location`, "tok-carrier2", { lat: -17.8, lng: 15.7 })).status).toBe(403);
    expect((await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: 10, lng: 15.7 })).json.error).toBe("bad_location");
    expect((await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: "x", lng: 15.7 })).json.error).toBe("bad_location");

    const first = await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: -17.7881234567, lng: 15.699, speedKmh: 62.4 });
    expect(first.json.distanceKm).toBeGreaterThan(0);
    expect(store.docs.get(`orderTracking/${id}`)).toMatchObject({ lat: -17.78812, lng: 15.699, speedKmh: 62, carrierId: "carrier1", buyerId: "buyer1" });
    now += 3000;
    expect((await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: -17.79, lng: 15.7 })).json.skipped).toBe(true);
    expect(store.docs.get(`orderTracking/${id}`).lat).toBe(-17.78812);
    now += 10000;
    expect((await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: -17.79, lng: 15.7 })).json.skipped).toBeUndefined();
    expect(store.docs.get(`orderTracking/${id}`).lat).toBe(-17.79);
  });

  it("tells the buyer once when the vehicle is within a kilometre, and when it arrives", async () => {
    await start();
    const id = await onTheRoad();
    await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: -17.7852, lng: 15.7665 });
    now += 20000;
    await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: -17.7851, lng: 15.7668 });
    expect(store.list("notifications").filter((n) => n.key === "notif.delivery.nearby")).toHaveLength(1);
    expect((await post(`/api/delivery/${id}/arrived`, "tok-carrier2")).status).toBe(403);
    await post(`/api/delivery/${id}/arrived`, "tok-carrier");
    await post(`/api/delivery/${id}/arrived`, "tok-carrier");
    expect(store.list("notifications").filter((n) => n.key === "notif.delivery.arrived")).toHaveLength(1);
    expect(order(id).fulfilment.arrivedAt).toBe(now);
  });

  it("finishes the delivery with the buyer's code, locks after five wrong tries, and records the handover", async () => {
    await start();
    const id = await onTheRoad();
    await post(`/api/delivery/${id}/location`, "tok-carrier", { lat: -17.8, lng: 15.7 });

    expect((await post(`/api/delivery/${id}/handover`, "tok-buyer", { code: "123456" })).status).toBe(403); // the buyer gives the code, they don't type it
    expect((await post(`/api/delivery/${id}/handover`, "tok-carrier2", { code: "123456" })).status).toBe(403);
    const wrong = await post(`/api/delivery/${id}/handover`, "tok-carrier", { code: "000000" });
    expect(wrong.json).toMatchObject({ error: "wrong_code", params: { left: 4 } });
    expect(order(id).status).toBe("in_transit");

    now += 5 * 60000;
    const ok = await post(`/api/delivery/${id}/handover`, "tok-carrier", { code: "123 456" });
    expect(ok.json).toMatchObject({ ok: true, status: "delivered", verified: true });
    const o = order(id);
    expect(o.status).toBe("delivered");
    expect(o.statusHistory.at(-1)).toMatchObject({ status: "delivered", by: "carrier1" });
    expect(o.fulfilment).toMatchObject({ verified: true, handedOverBy: "carrier1" });
    expect(o.releaseAt).toBe(now + 24 * HOUR);
    expect(o.payoutStatus).toBe("held");
    expect(store.docs.get(`deliveryJobs/${id}`).status).toBe("delivered");
    expect(store.docs.has(`orderTracking/${id}`)).toBe(false); // the route is deleted
    expect(hookCalls).toEqual([["delivered", id]]);
    expect(store.list("notifications").filter((n) => n.key === "notif.order.delivered").map((n) => n.userId).sort()).toEqual(["buyer1", "seller1"]);
    expect((await post(`/api/delivery/${id}/handover`, "tok-carrier", { code: "123456" })).status).toBe(403); // not twice: the job is over
  });

  it("locks the order for support after too many wrong codes, even for the right one", async () => {
    await start();
    const id = await onTheRoad();
    for (let i = 0; i < 5; i += 1) expect((await post(`/api/delivery/${id}/handover`, "tok-carrier", { code: "111111" })).json.error).toBe("wrong_code");
    const locked = await post(`/api/delivery/${id}/handover`, "tok-carrier", { code: "123456" });
    expect(locked.status).toBe(423);
    expect(locked.json.error).toBe("code_locked");
    expect(order(id).status).toBe("in_transit");
    expect(store.list("notifications").filter((n) => n.key === "notif.delivery.codeLocked")).toHaveLength(1);
  });

  it("lets a carrier finish without the code only with a reason, and gives the buyer longer to object", async () => {
    await start();
    const id = await onTheRoad();
    expect((await post(`/api/delivery/${id}/handover`, "tok-carrier", { noCode: true })).json.error).toBe("reason_required");
    const res = await post(`/api/delivery/${id}/handover`, "tok-carrier", { noCode: true, reason: "Buyer's phone is flat" });
    expect(res.json).toMatchObject({ status: "delivered", verified: false });
    expect(order(id).releaseAt).toBe(now + 72 * HOUR);
    expect(order(id).statusHistory.at(-1).note).toContain("without the code");
  });
});

// ---- the seller delivers, or the buyer collects --------------------------------------------------------------------------------
describe("the seller delivers", () => {
  it("lets the seller share a position and hand over with the code, but not a stranger", async () => {
    await start();
    const { orderId: id } = await buy(sellerOrder);
    toStatus(id, "in_transit");
    expect((await post(`/api/delivery/${id}/location`, "tok-other", { lat: -17.8, lng: 15.7 })).status).toBe(403);
    expect((await post(`/api/delivery/${id}/location`, "tok-seller", { lat: -17.8, lng: 15.7 })).status).toBe(200);
    expect(store.docs.get(`orderTracking/${id}`).carrierId).toBeNull();
    expect((await post(`/api/delivery/${id}/handover`, "tok-other", { code: "123456" })).status).toBe(403);
    expect((await post(`/api/delivery/${id}/handover`, "tok-seller", { code: "123456" })).json.verified).toBe(true);
    expect(order(id).status).toBe("delivered");
  });
});

describe("the buyer collects", () => {
  it("is finished by the seller typing the buyer's code, and never without it", async () => {
    await start();
    const { orderId: id } = await buy(collectOrder);
    toStatus(id, "dispatched");
    expect((await post(`/api/delivery/${id}/location`, "tok-seller", { lat: -17.8, lng: 15.7 })).status).toBe(403); // nobody travels
    expect((await post(`/api/delivery/${id}/handover`, "tok-seller", { noCode: true, reason: "forgot" })).json.error).toBe("code_required");
    expect((await post(`/api/delivery/${id}/handover`, "tok-seller", { code: "654321" })).json.error).toBe("wrong_code");
    expect((await post(`/api/delivery/${id}/handover`, "tok-seller", { code: "123456" })).json.status).toBe("delivered");
  });
});

describe("the buyer confirms", () => {
  it("confirms receipt themselves from dispatched or in transit, and only the buyer can", async () => {
    await start();
    const { orderId: id } = await buy(sellerOrder);
    expect((await post(`/api/orders/${id}/confirm`, "tok-buyer")).json.error).toBe("wrong_status"); // nothing sent yet
    toStatus(id, "in_transit");
    expect((await post(`/api/orders/${id}/confirm`, "tok-seller")).status).toBe(403);
    expect((await post(`/api/orders/${id}/confirm`, "tok-buyer")).json.status).toBe("delivered");
    expect(order(id).releaseAt).toBe(now + 24 * HOUR);
  });

  it("works for an order paid before delivery existed", async () => {
    await start({ seed: { ...SEED(), "orders/old1": { buyerId: "buyer1", sellerId: "seller1", product: "Mahangu", quantity: 2, status: "in_transit", statusHistory: [{ status: "paid", by: "buyer1", at: T0 - HOUR }], amount: 100 } } });
    expect((await post("/api/orders/old1/confirm", "tok-buyer")).json.status).toBe("delivered");
  });
});

// ---- cancelling -------------------------------------------------------------------------------------------------------------------
describe("cancelling an order", () => {
  it("lets the buyer cancel before the seller accepts, puts the goods back on sale, and asks for a refund", async () => {
    await start();
    const { orderId: id } = await buy({ items: [{ listingId: "L1", quantity: 5 }, { listingId: "L2", quantity: 2 }], delivery: { method: "collect" } });
    expect(store.docs.get("marketPrices/L1").quantity).toBe(95);
    expect((await post(`/api/orders/${id}/cancel`, "tok-other", {})).status).toBe(403);
    const res = await post(`/api/orders/${id}/cancel`, "tok-buyer", { reason: "Changed my mind" });
    expect(res.json.status).toBe("cancelled");
    expect(order(id)).toMatchObject({ status: "cancelled", cancelledBy: "buyer1", payoutStatus: "refund_requested" });
    expect(store.docs.get("marketPrices/L1").quantity).toBe(100);
    expect(store.docs.get("marketPrices/L2").quantity).toBe(10);
    expect(hookCalls).toEqual([["cancelled", id, "buyer"]]);
    expect(store.list("notifications").filter((n) => n.key === "notif.order.cancelledByBuyer").map((n) => n.userId)).toEqual(["seller1"]);
    expect((await post(`/api/orders/${id}/cancel`, "tok-buyer", {})).json.error).toBe("wrong_status"); // not twice, and no second restock
    expect(store.docs.get("marketPrices/L1").quantity).toBe(100);
  });

  it("puts back only the units that were really taken off the listing", async () => {
    await start();
    const first = await post("/api/payments/initiate", "tok-buyer", { kind: "order", items: [{ listingId: "L2", quantity: 8 }], delivery: { method: "collect" } });
    store.docs.set("marketPrices/L2", { ...store.docs.get("marketPrices/L2"), quantity: 3 }); // another buyer took most of it
    txs["9"] = { id: 9, status: "successful", tx_ref: first.json.txRef, amount: first.json.amount, currency: "NAD" };
    const done = await call("GET", "/api/payments/verify/9", { token: "tok-buyer" });
    expect(order(done.json.orderId).stockTaken).toBe(3);
    expect(store.docs.get("marketPrices/L2").quantity).toBe(0);
    await post(`/api/orders/${done.json.orderId}/cancel`, "tok-buyer", {});
    expect(store.docs.get("marketPrices/L2").quantity).toBe(3); // not 8
  });

  it("does not put back stock that was never taken", async () => {
    await start();
    const { orderId: id } = await buy(collectOrder);
    store.docs.set(`orders/${id}`, { ...order(id), stockApplied: false, stockTaken: undefined }); // the payment confirmation stopped before counting stock
    const before = store.docs.get("marketPrices/L1").quantity;
    await post(`/api/orders/${id}/cancel`, "tok-buyer", {});
    expect(store.docs.get("marketPrices/L1").quantity).toBe(before);
  });

  it("stops the buyer cancelling once the seller has accepted", async () => {
    await start();
    const { orderId: id } = await buy(collectOrder);
    toStatus(id, "confirmed");
    expect((await post(`/api/orders/${id}/cancel`, "tok-buyer", {})).json.error).toBe("wrong_status");
  });

  it("lets the buyer cancel an accepted order the seller has not moved for three days, and not before", async () => {
    await start();
    const { orderId: id } = await buy(collectOrder);
    toStatus(id, "confirmed");
    now += 71 * HOUR;
    expect((await post(`/api/orders/${id}/cancel`, "tok-buyer", {})).json.error).toBe("wrong_status");
    now += 2 * HOUR;
    expect((await post(`/api/orders/${id}/cancel`, "tok-buyer", { reason: "Never sent" })).json.status).toBe("cancelled");
    expect(order(id)).toMatchObject({ status: "cancelled", payoutStatus: "refund_requested" });
    expect(store.docs.get("marketPrices/L1").quantity).toBe(100);
  });

  it("does not let the buyer cancel once it is on the road, however long it takes", async () => {
    await start();
    const { orderId: id } = await buy(sellerOrder);
    toStatus(id, "in_transit");
    now += 200 * HOUR;
    expect((await post(`/api/orders/${id}/cancel`, "tok-buyer", {})).json.error).toBe("wrong_status");
  });

  it("lets the seller decline, with a reason, until they have dispatched", async () => {
    await start();
    const { orderId: id } = await buy(collectOrder);
    expect((await post(`/api/orders/${id}/cancel`, "tok-seller", {})).json.error).toBe("reason_required");
    toStatus(id, "confirmed");
    expect((await post(`/api/orders/${id}/cancel`, "tok-seller", { reason: "Out of stock after all" })).json.status).toBe("cancelled");
    expect(hookCalls[0][2]).toBe("seller");
  });

  it("closes a carrier job when its order is cancelled", async () => {
    await start();
    const { orderId: id } = await buy(platformOrder);
    toStatus(id, "confirmed");
    await post(`/api/delivery/${id}/request-carrier`, "tok-seller", {});
    await post(`/api/orders/${id}/cancel`, "tok-seller", { reason: "Crop failed" });
    expect(store.docs.get(`deliveryJobs/${id}`).status).toBe("cancelled");
    expect((await post(`/api/delivery/jobs/${id}/claim`, "tok-carrier")).json.error).toBe("job_taken");
  });

  it("lets support cancel an order that is on the road, but not a stranger", async () => {
    await start();
    const { orderId: id } = await buy(sellerOrder);
    toStatus(id, "in_transit");
    expect((await post(`/api/orders/${id}/cancel`, "tok-fakeadmin", {})).status).toBe(403); // unverified e-mail is not an admin
    expect((await post(`/api/orders/${id}/cancel`, "tok-admin", { reason: "Vehicle broke down" })).json.status).toBe("cancelled");
    expect(hookCalls[0][2]).toBe("support");
  });
});

// ---- problems --------------------------------------------------------------------------------------------------------------------------
describe("reporting a problem", () => {
  async function delivered() {
    const { orderId } = await buy(sellerOrder);
    toStatus(orderId, "in_transit");
    await post(`/api/delivery/${orderId}/handover`, "tok-seller", { code: "123456" });
    hookCalls.length = 0;
    return orderId;
  }

  it("lets the buyer, and only the buyer, report a problem while the objection window is open", async () => {
    await start();
    const id = await delivered();
    expect((await post(`/api/orders/${id}/dispute`, "tok-seller", { reason: "damaged" })).status).toBe(403);
    expect((await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "my own made up reason" })).status).toBe(400);
    expect((await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "other" })).json.error).toBe("reason_required");
    const res = await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "damaged", text: "Half the bags were split" });
    expect(res.json.status).toBe("disputed");
    expect(order(id)).toMatchObject({ status: "disputed", payoutStatus: "on_hold", dispute: { reason: "damaged", previousStatus: "delivered" } });
    expect(store.docs.get(`disputes/${id}`)).toMatchObject({ status: "open", amount: order(id).amount });
    expect(hookCalls).toEqual([["disputed", id]]);
  });

  it("refuses once the window has closed or the money is released", async () => {
    await start();
    const id = await delivered();
    now += 25 * HOUR;
    expect((await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "damaged" })).json.error).toBe("window_closed");
  });

  it("also works before delivery (goods that never came), but not on a brand-new order", async () => {
    await start();
    const { orderId: id } = await buy(sellerOrder);
    expect((await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "not_delivered" })).json.error).toBe("window_closed");
    toStatus(id, "in_transit");
    expect((await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "not_delivered" })).json.status).toBe("disputed");
  });

  it("is decided by support only: release pays the seller, refund returns the goods to stock and the money to the buyer", async () => {
    await start();
    const id = await delivered();
    await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "short_quantity" });
    hookCalls.length = 0;
    expect((await post(`/api/orders/${id}/resolve`, "tok-buyer", { outcome: "refund" })).status).toBe(403);
    expect((await post(`/api/orders/${id}/resolve`, "tok-fakeadmin", { outcome: "refund" })).status).toBe(403);
    expect((await post(`/api/orders/${id}/resolve`, "tok-admin", { outcome: "maybe" })).status).toBe(400);
    const stockBefore = store.docs.get("marketPrices/L1").quantity;
    expect((await post(`/api/orders/${id}/resolve`, "tok-admin", { outcome: "refund", note: "Photos show the damage" })).json.status).toBe("cancelled");
    expect(store.docs.get("marketPrices/L1").quantity).toBe(stockBefore + 5);
    expect(order(id).payoutStatus).toBe("refund_requested");
    expect(store.docs.get(`disputes/${id}`)).toMatchObject({ status: "resolved", outcome: "refund" });
    expect((await post(`/api/orders/${id}/resolve`, "tok-admin", { outcome: "refund" })).json.error).toBe("wrong_status");
  });

  it("releases the seller's money when support decides for the seller, and the sweep does not pay twice", async () => {
    await start();
    const id = await delivered();
    await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "quality" });
    expect((await post(`/api/orders/${id}/resolve`, "tok-admin", { outcome: "release" })).json.status).toBe("delivered");
    expect(order(id)).toMatchObject({ payoutStatus: "release_requested" });
    now += 100 * HOUR;
    const done = await start.sweep();
    expect(done.released).toBe(0);
    expect(hookCalls.filter((c) => c[0] === "release")).toHaveLength(0);
  });
});

// ---- timeouts ------------------------------------------------------------------------------------------------------------------------------
describe("the sweep", () => {
  it("cancels and refunds an order the seller never accepted, and restocks it", async () => {
    await start();
    const { orderId: id } = await buy(collectOrder);
    now += 23 * HOUR;
    expect((await start.sweep()).cancelled).toBe(0);
    now += 2 * HOUR;
    expect((await start.sweep()).cancelled).toBe(1);
    expect(order(id)).toMatchObject({ status: "cancelled", cancelWhy: "seller_timeout", payoutStatus: "refund_requested" });
    expect(store.docs.get("marketPrices/L1").quantity).toBe(100);
    expect(store.list("notifications").filter((n) => n.key.startsWith("notif.order.autoCancelled")).map((n) => n.userId).sort()).toEqual(["buyer1", "seller1"]);
    expect((await start.sweep()).cancelled).toBe(0);
  });

  it("leaves accepted orders alone however old they are", async () => {
    await start();
    const { orderId: id } = await buy(collectOrder);
    toStatus(id, "confirmed");
    now += 500 * HOUR;
    expect((await start.sweep()).cancelled).toBe(0);
    expect(order(id).status).toBe("confirmed");
  });

  it("releases the money once, after the objection window, and never from a disputed order", async () => {
    await start();
    const { orderId: id } = await buy(sellerOrder);
    toStatus(id, "in_transit");
    await post(`/api/delivery/${id}/handover`, "tok-seller", { code: "123456" });
    hookCalls.length = 0;
    now += 23 * HOUR;
    expect((await start.sweep()).released).toBe(0);
    now += 2 * HOUR;
    expect((await start.sweep()).released).toBe(1);
    expect(order(id)).toMatchObject({ payoutStatus: "release_requested", releasedAt: now });
    expect((await start.sweep()).released).toBe(0);
    expect(hookCalls).toEqual([["release", id]]);
    expect((await post(`/api/orders/${id}/dispute`, "tok-buyer", { reason: "damaged" })).json.error).toBe("window_closed");
  });

  it("does not release money for an old order that has no release time", async () => {
    await start({ seed: { ...SEED(), "orders/old1": { buyerId: "buyer1", sellerId: "seller1", status: "delivered", statusHistory: [], amount: 5 } } });
    expect((await start.sweep()).released).toBe(0);
  });

  it("reminds the seller once about an accepted order they have not touched, and says what to do", async () => {
    await start();
    const a = (await buy(platformOrder, { txId: "11" })).orderId;
    const b = (await buy(collectOrder, { txId: "12" })).orderId;
    toStatus(a, "confirmed");
    toStatus(b, "confirmed");
    now += 5 * HOUR;
    expect((await start.sweep()).reminded).toBe(0);
    now += 2 * HOUR;
    expect((await start.sweep()).reminded).toBe(2);
    expect((await start.sweep()).reminded).toBe(0);
    const keys = store.list("notifications").map((n) => n.key).filter((k) => /Reminder$/.test(k)).sort();
    expect(keys).toEqual(["notif.delivery.requestReminder", "notif.order.readyReminder"]);
  });

  it("does not remind about a carrier when one was already asked for", async () => {
    await start();
    const { orderId: id } = await buy(platformOrder);
    toStatus(id, "confirmed");
    await post(`/api/delivery/${id}/request-carrier`, "tok-seller", {});
    now += 8 * HOUR;
    await start.sweep();
    expect(store.list("notifications").filter((n) => n.key === "notif.delivery.requestReminder")).toHaveLength(0);
  });

  it("alerts the seller when no carrier takes a job in time, once", async () => {
    await start();
    const { orderId: id } = await buy(platformOrder);
    toStatus(id, "confirmed");
    await post(`/api/delivery/${id}/request-carrier`, "tok-seller", {});
    now += 5 * HOUR;
    expect((await start.sweep()).escalated).toBe(0);
    now += 2 * HOUR;
    expect((await start.sweep()).escalated).toBe(1);
    expect((await start.sweep()).escalated).toBe(0);
    expect(store.list("notifications").filter((n) => n.key === "notif.delivery.noCarrier").map((n) => n.userId)).toEqual(["seller1"]);
  });

  it("can be run by an outside timer with the secret, and by nobody else", async () => {
    await start();
    expect((await call("POST", "/api/delivery/sweep", {})).status).toBe(401);
    expect((await call("POST", "/api/delivery/sweep", { headers: { "x-sweep-secret": "wrong" } })).status).toBe(401);
    const ok = await call("POST", "/api/delivery/sweep", { headers: { "x-sweep-secret": "SWEEP" } });
    expect(ok.status).toBe(200);
    expect(ok.json).toEqual({ cancelled: 0, released: 0, escalated: 0, reminded: 0 });
  });

  it("keeps going when the money step fails, and tries it again next time", async () => {
    let attempts = 0;
    await start({
      hooks: {
        onReleaseDue: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("payment provider is down");
          return { payoutStatus: "release_requested" };
        },
      },
    });
    const { orderId: id } = await buy(sellerOrder);
    toStatus(id, "in_transit");
    await post(`/api/delivery/${id}/handover`, "tok-seller", { code: "123456" });
    now += 30 * HOUR;
    expect((await start.sweep()).released).toBe(0);
    expect(order(id).releasedAt).toBeUndefined();
    expect((await start.sweep()).released).toBe(1);
    expect(order(id)).toMatchObject({ payoutStatus: "release_requested", releasedAt: now });
  });

  it("still finishes a delivery when the money step fails", async () => {
    await start({ hooks: { onDelivered: async () => { throw new Error("payment provider is down"); } } });
    const { orderId: id } = await buy(sellerOrder);
    toStatus(id, "in_transit");
    expect((await post(`/api/delivery/${id}/handover`, "tok-seller", { code: "123456" })).json.status).toBe("delivered");
    expect(order(id).status).toBe("delivered");
  });
});
