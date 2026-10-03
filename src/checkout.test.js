/**
 * @jest-environment node
 */
// The payment rules in server/checkout.js. Flutterwave and Firebase are replaced
// with fakes, so nothing here touches the network or a real database.

const http = require("http");
const express = require("express");
const { register, countWorkingDays } = require("../server/checkout");
const { memoryStore } = require("../server/store");
const { parseServiceAccount } = require("../server/firebaseAdmin");

const quiet = { warn: () => {}, error: () => {} };

const USERS = {
  "tok-buyer": { uid: "buyer1", email: "buyer@example.com", name: "Bea Buyer", anonymous: false },
  "tok-other": { uid: "other1", email: "other@example.com", name: "Olu Other", anonymous: false },
  "tok-seller": { uid: "seller1", email: "seller@example.com", name: "Sam Seller", anonymous: false },
  "tok-farmer": { uid: "farmer1", email: "farmer@example.com", name: "Fay Farmer", anonymous: false },
  "tok-anon": { uid: "anon1", email: "", name: "", anonymous: true },
};

const SEED = () => ({
  "marketPrices/L1": { product: "Mahangu", price: 120, sellerId: "seller1", sellerName: "Sam Seller", quantity: 10, sellerSubaccountId: "RS_LISTING_FIELD" },
  "marketPrices/SOLD": { product: "Beans", price: 50, sellerId: "seller1", sellerName: "Sam Seller", quantity: 0 },
  "marketPrices/NOPAY": { product: "Maize", price: 80, sellerId: "seller2", sellerName: "Nia Nopay" },
  "users/seller1": { flutterwaveSubaccountId: "RS_SELLER" },
  "users/seller2": {},
  // 5 Oct 2026 is a Monday, 9 Oct a Friday: five working days = N$150
  "promotions/P1": { farmerId: "farmer1", productName: "Beans", startDate: "2026-10-05", endDate: "2026-10-09", status: "pending_payment", cost: 1 },
  "promotions/PAID": { farmerId: "farmer1", productName: "Beans", startDate: "2026-10-05", endDate: "2026-10-09", status: "active" },
});

let server;
let flwCalls;
let txs;
let store;

async function start({ ready = true, seed = SEED(), flwPayments } = {}) {
  store = memoryStore(seed);
  flwCalls = [];
  txs = {};
  const fetchImpl = jest.fn(async (url, opts = {}) => {
    const path = url.replace("https://api.flutterwave.com/v3", "");
    flwCalls.push({ path, method: opts.method || "GET", body: opts.body ? JSON.parse(opts.body) : null, auth: opts.headers && opts.headers.Authorization });
    const reply = (body, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => body });
    if (path === "/payments") return flwPayments ? flwPayments() : reply({ status: "success", data: { link: "https://pay.test/checkout/abc" } });
    if (path === "/subaccounts") return reply({ status: "success", data: { id: 98765 } });
    const verify = /^\/transactions\/(\d+)\/verify$/.exec(path);
    if (verify) return txs[verify[1]] ? reply({ status: "success", data: txs[verify[1]] }) : reply({ status: "error", message: "No transaction found" }, false);
    return reply({ status: "error" }, false);
  });
  const app = express();
  app.use(express.json());
  const deps = {
    store: ready ? store : undefined,
    verifyToken: ready ? async (t) => { if (!USERS[t]) throw new Error("bad token"); return USERS[t]; } : undefined,
    fetchImpl,
    secretKey: ready ? "SK" : "",
    secretHash: "HASH",
    appBaseUrl: "https://site.test",
    log: quiet,
    nowMs: () => 1_700_000_000_000,
    random: (() => { let n = 0; return () => `r${++n}`; })(),
  };
  register(app, deps);
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

const initiate = (token, body) => call("POST", "/api/payments/initiate", { token, body });
const verify = (token, id) => call("GET", `/api/payments/verify/${id}`, { token });
const webhook = (body, hash = "HASH") => call("POST", "/api/payments/webhook", { body, headers: hash === null ? {} : { "verif-hash": hash } });
const paid = (id, txRef, amount, currency = "NAD") => { txs[id] = { id: Number(id), status: "successful", tx_ref: txRef, amount, currency }; };

afterEach(() => new Promise((r) => (server ? server.close(r) : r())));

// ---- who may start a payment ---------------------------------------------------
describe("starting a payment", () => {
  it("refuses everyone when payments are not set up, and takes no money", async () => {
    await start({ ready: false });
    const res = await initiate("tok-buyer", { kind: "order", listingId: "L1" });
    expect(res.status).toBe(503);
    expect(res.json.error).toBe("payments_not_ready");
    expect(flwCalls).toHaveLength(0);
    expect((await webhook({ event: "charge.completed", data: { id: 1 } })).status).toBe(503); // Flutterwave will retry
  });

  it("needs a valid sign-in", async () => {
    await start();
    expect((await initiate(undefined, { kind: "order", listingId: "L1" })).status).toBe(401);
    expect((await initiate("forged", { kind: "order", listingId: "L1" })).status).toBe(401);
    expect(flwCalls).toHaveLength(0);
  });

  it("rejects unknown payment types", async () => {
    await start();
    expect((await initiate("tok-buyer", { kind: "refund" })).status).toBe(400);
    expect((await initiate("tok-buyer", {})).status).toBe(400);
  });
});

// ---- marketplace orders: the price and payout are the server's, not the browser's -
describe("buying a listing", () => {
  it("charges the listing's price and pays the seller's own account, whatever the browser says", async () => {
    await start();
    const res = await initiate("tok-buyer", {
      kind: "order",
      listingId: "L1",
      amount: 1, // tampering
      price: 1,
      sellerSubaccountId: "RS_EVIL", // tampering
      sellerId: "attacker",
    });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ link: "https://pay.test/checkout/abc", amount: 120 });

    const sent = flwCalls.find((c) => c.path === "/payments").body;
    expect(sent.amount).toBe(120);
    expect(sent.currency).toBe("NAD");
    expect(sent.subaccounts).toEqual([{ id: "RS_SELLER" }]); // from users/seller1, not the listing field or the request
    expect(sent.redirect_url).toBe("https://site.test/payment-callback");
    expect(sent.customer.email).toBe("buyer@example.com");
    expect(flwCalls.find((c) => c.path === "/payments").auth).toBe("Bearer SK");

    const pending = await store.get(`payments/${res.json.txRef}`);
    expect(pending).toMatchObject({ kind: "order", buyerId: "buyer1", sellerId: "seller1", amount: 120, product: "Mahangu", status: "pending" });
  });

  it("refuses a listing that is missing, sold out, yours, unpaid-to, or a path trick", async () => {
    await start();
    expect((await initiate("tok-buyer", { kind: "order", listingId: "NOPE" })).status).toBe(404);
    expect((await initiate("tok-buyer", { kind: "order", listingId: "SOLD" })).json.error).toBe("sold_out");
    expect((await initiate("tok-seller", { kind: "order", listingId: "L1" })).json.error).toBe("own_listing");
    expect((await initiate("tok-buyer", { kind: "order", listingId: "NOPAY" })).json.error).toBe("seller_not_ready");
    expect((await initiate("tok-buyer", { kind: "order", listingId: "users/seller1" })).status).toBe(400);
    expect((await initiate("tok-buyer", { kind: "order" })).status).toBe(400);
    expect(flwCalls.filter((c) => c.path === "/payments")).toHaveLength(0);
  });

  it("does not let an anonymous visitor buy", async () => {
    await start();
    expect((await initiate("tok-anon", { kind: "order", listingId: "L1" })).status).toBe(403);
  });

  it("marks the attempt failed if Flutterwave refuses to start it", async () => {
    await start({ flwPayments: () => ({ ok: false, status: 400, json: async () => ({ status: "error" }) }) });
    const res = await initiate("tok-buyer", { kind: "order", listingId: "L1" });
    expect(res.status).toBe(502);
    expect(store.list("payments")[0].status).toBe("failed");
  });
});

// ---- promotions and page access --------------------------------------------------
describe("promotions and page access", () => {
  it("prices a promotion from its dates, ignoring the cost the browser stored", async () => {
    await start();
    const res = await initiate("tok-farmer", { kind: "promotion", promotionId: "P1", amount: 1, cost: 1 });
    expect(res.status).toBe(200);
    expect(res.json.amount).toBe(150); // 5 working days x N$30, not the N$1 saved on the document
    expect(flwCalls.find((c) => c.path === "/payments").body.subaccounts).toBeUndefined(); // platform income, no split
  });

  it("only the owner can pay for a promotion, and only once", async () => {
    await start();
    expect((await initiate("tok-other", { kind: "promotion", promotionId: "P1" })).json.error).toBe("not_yours");
    expect((await initiate("tok-farmer", { kind: "promotion", promotionId: "PAID" })).json.error).toBe("already_paid");
    expect((await initiate("tok-farmer", { kind: "promotion", promotionId: "NOPE" })).status).toBe(404);
  });

  it("charges N$5 for a page, to anyone including anonymous visitors, and only for known pages", async () => {
    await start();
    const ok = await initiate("tok-anon", { kind: "page_access", pageKey: "data", email: "visitor@example.com" });
    expect(ok.json.amount).toBe(5);
    expect(flwCalls.find((c) => c.path === "/payments").body.customer.email).toBe("visitor@example.com");
    expect((await initiate("tok-anon", { kind: "page_access", pageKey: "admin", email: "v@example.com" })).status).toBe(400);
    expect((await initiate("tok-anon", { kind: "page_access", pageKey: "data", email: "not-an-email" })).json.error).toBe("email_required");
  });
});

// ---- confirming a payment ---------------------------------------------------------
describe("confirming a paid order", () => {
  async function orderPayment() {
    const res = await initiate("tok-buyer", { kind: "order", listingId: "L1" });
    return res.json.txRef;
  }

  it("creates one correct order and tells the seller", async () => {
    await start();
    const txRef = await orderPayment();
    paid("555", txRef, 120);

    const res = await verify("tok-buyer", 555);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ verified: true, purpose: "order", orderId: "tx_555" });
    expect(res.json.buyerId).toBeUndefined(); // not leaked in the response

    const order = await store.get("orders/tx_555");
    expect(order).toMatchObject({
      buyerId: "buyer1", buyerName: "Bea Buyer", sellerId: "seller1", sellerName: "Sam Seller",
      product: "Mahangu", amount: 120, currency: "NAD", transactionId: "555", status: "paid", listingId: "L1",
    });
    expect(order.statusHistory).toEqual([expect.objectContaining({ status: "paid", by: "buyer1" })]);

    const notes = store.list("notifications");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ userId: "seller1", title: "New order", link: "/track-orders", read: false });
    expect((await store.get(`payments/${txRef}`)).status).toBe("completed");
  });

  it("never makes a second order from the same transaction (page reload, webhook, retry)", async () => {
    await start();
    const txRef = await orderPayment();
    paid("555", txRef, 120);

    await verify("tok-buyer", 555);
    await verify("tok-buyer", 555);
    expect((await webhook({ event: "charge.completed", data: { id: 555 } })).status).toBe(200);
    await Promise.all([verify("tok-buyer", 555), webhook({ event: "charge.completed", data: { id: 555 } })]);

    expect(store.list("orders")).toHaveLength(1);
    expect(store.list("notifications")).toHaveLength(1);
  });

  it("creates the order from the webhook alone when the buyer never returns to the site", async () => {
    await start();
    const txRef = await orderPayment();
    paid("777", txRef, 120);
    expect((await webhook({ event: "charge.completed", data: { id: 777 } })).status).toBe(200);
    expect(await store.get("orders/tx_777")).toMatchObject({ status: "paid", product: "Mahangu" });
    // and the buyer arriving later just sees it confirmed
    expect((await verify("tok-buyer", 777)).json).toMatchObject({ verified: true, orderId: "tx_777", already: true });
    expect(store.list("orders")).toHaveLength(1);
  });

  it("does nothing if the charge was less than the price (an underpaid or forged transaction)", async () => {
    await start();
    const txRef = await orderPayment();
    paid("556", txRef, 1);
    expect((await verify("tok-buyer", 556)).json).toMatchObject({ verified: false, reason: "amount_mismatch" });
    expect(store.list("orders")).toHaveLength(0);
    expect((await store.get(`payments/${txRef}`)).status).toBe("pending");
  });

  it("does nothing if the currency is wrong", async () => {
    await start();
    const txRef = await orderPayment();
    paid("557", txRef, 120, "USD");
    expect((await verify("tok-buyer", 557)).json.verified).toBe(false);
    expect(store.list("orders")).toHaveLength(0);
  });

  it("ignores transactions we never started, failed charges, and junk ids", async () => {
    await start();
    paid("600", "someone-elses-ref", 120);
    expect((await verify("tok-buyer", 600)).json).toMatchObject({ verified: false, reason: "unknown_reference" });

    const txRef = await orderPayment();
    txs["601"] = { id: 601, status: "failed", tx_ref: txRef, amount: 120, currency: "NAD" };
    expect((await verify("tok-buyer", 601)).json.reason).toBe("not_successful");

    expect((await verify("tok-buyer", "abc")).json.reason).toBe("bad_transaction_id");
    expect((await verify("tok-buyer", 999)).json.verified).toBe(false); // Flutterwave does not know it
    expect(store.list("orders")).toHaveLength(0);
  });

  it("shows the details only to the person who paid", async () => {
    await start();
    const txRef = await orderPayment();
    paid("558", txRef, 120);
    const res = await verify("tok-other", 558);
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.json)).not.toContain("tx_558");
  });

  it("needs a sign-in to confirm", async () => {
    await start();
    expect((await call("GET", "/api/payments/verify/1")).status).toBe(401);
  });
});

describe("confirming promotions and page access", () => {
  it("activates a promotion exactly as priced", async () => {
    await start();
    const { json } = await initiate("tok-farmer", { kind: "promotion", promotionId: "P1" });
    paid("700", json.txRef, 150);
    expect((await verify("tok-farmer", 700)).json).toMatchObject({ verified: true, purpose: "promotion", refId: "P1" });
    expect(await store.get("promotions/P1")).toMatchObject({ status: "active", paidAmount: 150, transactionId: "700" });
  });

  it("does not activate a promotion for an underpayment", async () => {
    await start();
    const { json } = await initiate("tok-farmer", { kind: "promotion", promotionId: "P1" });
    paid("701", json.txRef, 30);
    expect((await verify("tok-farmer", 701)).json.verified).toBe(false);
    expect((await store.get("promotions/P1")).status).toBe("pending_payment");
  });

  it("unlocks a page for the anonymous visitor who paid, without disturbing other flags", async () => {
    await start({ seed: { ...SEED(), "pageAccess/anon1": { studentVerified: true } } });
    const { json } = await initiate("tok-anon", { kind: "page_access", pageKey: "statistics", email: "v@example.com" });
    paid("800", json.txRef, 5);
    expect((await verify("tok-anon", 800)).json).toMatchObject({ verified: true, purpose: "page_access", refId: "statistics" });
    expect(await store.get("pageAccess/anon1")).toMatchObject({ statistics: true, studentVerified: true });
  });
});

// ---- the webhook -----------------------------------------------------------------------
describe("webhook", () => {
  it("rejects a missing or wrong signature and does not finalise anything", async () => {
    await start();
    const { json } = await initiate("tok-buyer", { kind: "order", listingId: "L1" });
    paid("900", json.txRef, 120);
    expect((await webhook({ event: "charge.completed", data: { id: 900 } }, null)).status).toBe(401);
    expect((await webhook({ event: "charge.completed", data: { id: 900 } }, "WRONG")).status).toBe(401);
    expect(store.list("orders")).toHaveLength(0);
  });

  it("accepts other events without acting on them", async () => {
    await start();
    expect((await webhook({ event: "transfer.completed", data: { id: 1 } })).status).toBe(200);
    expect(flwCalls).toHaveLength(0);
  });
});

// ---- seller payout setup ---------------------------------------------------------------
describe("seller payout setup", () => {
  const form = { businessName: "Sam's Farm", accountBank: "044", accountNumber: "0123456789" };

  it("creates the subaccount for the signed-in seller and saves it on their own record", async () => {
    await start();
    const res = await call("POST", "/api/payments/subaccounts", { token: "tok-seller", body: { ...form, sellerId: "someone-else" } });
    expect(res.status).toBe(200);
    expect(res.json.subaccountId).toBe(98765);
    const sent = flwCalls.find((c) => c.path === "/subaccounts").body;
    expect(sent.meta).toEqual([{ metaname: "sellerId", metavalue: "seller1" }]); // the token's uid, not the request's
    expect(sent.split_value).toBeCloseTo(0.95);
    expect((await store.get("users/seller1")).flutterwaveSubaccountId).toBe(98765);
    expect(await store.get("users/someone-else")).toBeNull();
  });

  it("needs a real sign-in and complete details", async () => {
    await start();
    expect((await call("POST", "/api/payments/subaccounts", { body: form })).status).toBe(401);
    expect((await call("POST", "/api/payments/subaccounts", { token: "tok-anon", body: form })).status).toBe(403);
    expect((await call("POST", "/api/payments/subaccounts", { token: "tok-seller", body: { businessName: "x" } })).status).toBe(400);
  });
});

// ---- quantities and stock ----------------------------------------------------------------
describe("buying several units", () => {
  const buy = async (token, quantity, listingId = "L1") => (await initiate(token, { kind: "order", listingId, quantity })).json;

  it("charges price x quantity and records what one unit cost", async () => {
    await start();
    const res = await buy("tok-buyer", 3);
    expect(res.amount).toBe(360);
    expect(flwCalls.find((c) => c.path === "/payments").body.amount).toBe(360);
    expect(flwCalls.find((c) => c.path === "/payments").body.customizations.description).toBe("3 x Mahangu");
    expect(await store.get(`payments/${res.txRef}`)).toMatchObject({ quantity: 3, unitPrice: 120, amount: 360 });
  });

  it("treats a missing quantity as one", async () => {
    await start();
    expect((await buy("tok-buyer", undefined)).amount).toBe(120);
  });

  it("refuses silly quantities: zero, negative, fractions, text, or more than the order limit", async () => {
    await start();
    for (const q of [0, -2, 1.5, "3", null, 1001, NaN]) {
      const res = await initiate("tok-buyer", { kind: "order", listingId: "L1", quantity: q });
      expect([400]).toContain(res.status);
      expect(res.json.error).toBe("bad_quantity");
    }
    expect(flwCalls.filter((c) => c.path === "/payments")).toHaveLength(0);
  });

  it("refuses more than is in stock, and says how many there are", async () => {
    await start();
    const res = await initiate("tok-buyer", { kind: "order", listingId: "L1", quantity: 11 });
    expect(res.status).toBe(409);
    expect(res.json).toMatchObject({ error: "not_enough_stock", message: "Only 10 are available." });
    expect((await buy("tok-buyer", 10)).amount).toBe(1200); // exactly the stock is fine
  });

  it("lets a listing with no stock limit be bought in any quantity up to the order limit", async () => {
    await start({ seed: { ...SEED(), "users/seller2": { flutterwaveSubaccountId: "RS2" } } });
    expect((await buy("tok-buyer", 500, "NOPAY")).amount).toBe(40000);
  });
});

describe("stock after a sale", () => {
  const pay = async (token, id, quantity) => {
    const { json } = await initiate(token, { kind: "order", listingId: "L1", quantity });
    paid(String(id), json.txRef, json.amount);
    return verify(token, id);
  };

  it("takes the units off the listing and records them on the order", async () => {
    await start();
    expect((await pay("tok-buyer", 1001, 3)).json.verified).toBe(true);
    expect((await store.get("marketPrices/L1")).quantity).toBe(7);
    expect(await store.get("orders/tx_1001")).toMatchObject({ quantity: 3, unitPrice: 120, amount: 360, stockApplied: true, oversold: false });
    expect(store.list("notifications")[0].body).toBe("3 x Mahangu was just paid for. Confirm it to start fulfilment.");
  });

  it("counts the stock once however many times the payment is confirmed", async () => {
    await start();
    await pay("tok-buyer", 1002, 4);
    await verify("tok-buyer", 1002);
    await webhook({ event: "charge.completed", data: { id: 1002 } });
    await Promise.all([verify("tok-buyer", 1002), webhook({ event: "charge.completed", data: { id: 1002 } })]);
    expect((await store.get("marketPrices/L1")).quantity).toBe(6); // 10 - 4, not 10 - 4 - 4 - ...
    expect(store.list("orders")).toHaveLength(1);
  });

  it("finishes the job on a retry if the server stopped after creating the order but before counting stock", async () => {
    await start();
    const { json } = await initiate("tok-buyer", { kind: "order", listingId: "L1", quantity: 2 });
    paid("1003", json.txRef, json.amount);
    const realReserve = store.reserveStock;
    store.reserveStock = async () => { throw new Error("crash"); };
    expect((await verify("tok-buyer", 1003)).status).toBe(500);
    expect((await store.get("orders/tx_1003")).stockApplied).toBe(false); // order exists, stock not yet counted
    expect((await store.get("marketPrices/L1")).quantity).toBe(10);

    store.reserveStock = realReserve; // the webhook retries
    expect((await webhook({ event: "charge.completed", data: { id: 1003 } })).status).toBe(200);
    expect((await store.get("marketPrices/L1")).quantity).toBe(8);
    expect(store.list("orders")).toHaveLength(1);
    expect(store.list("notifications")).toHaveLength(1); // the seller was not told twice
  });

  it("never lets stock go negative when two buyers pay for the last units, and flags the later order", async () => {
    await start({ seed: { ...SEED(), "marketPrices/L1": { ...SEED()["marketPrices/L1"], quantity: 3 } } });
    // both started paying while 3 were available
    const a = (await initiate("tok-buyer", { kind: "order", listingId: "L1", quantity: 2 })).json;
    const b = (await initiate("tok-other", { kind: "order", listingId: "L1", quantity: 2 })).json;
    paid("1101", a.txRef, a.amount);
    paid("1102", b.txRef, b.amount);

    await verify("tok-buyer", 1101);
    await verify("tok-other", 1102);

    expect((await store.get("marketPrices/L1")).quantity).toBe(0);
    expect(await store.get("orders/tx_1101")).toMatchObject({ oversold: false });
    expect(await store.get("orders/tx_1102")).toMatchObject({ oversold: true, status: "paid" }); // the buyer did pay: kept, not lost
    const warning = store.list("notifications").find((n) => n.title === "Order needs your attention");
    expect(warning).toMatchObject({ userId: "seller1" });
    expect(warning.body).toContain("Only 1 of 2 x Mahangu were left");
  });

  it("leaves a listing with no stock limit alone", async () => {
    await start({ seed: { ...SEED(), "users/seller2": { flutterwaveSubaccountId: "RS2" } } });
    const { json } = await initiate("tok-buyer", { kind: "order", listingId: "NOPAY", quantity: 5 });
    paid("1201", json.txRef, json.amount);
    await verify("tok-buyer", 1201);
    expect((await store.get("marketPrices/NOPAY")).quantity).toBeUndefined();
    expect(await store.get("orders/tx_1201")).toMatchObject({ quantity: 5, stockApplied: true, oversold: false });
  });

  it("refuses to sell once the last unit has gone", async () => {
    await start({ seed: { ...SEED(), "marketPrices/L1": { ...SEED()["marketPrices/L1"], quantity: 1 } } });
    await pay("tok-buyer", 1301, 1);
    expect((await store.get("marketPrices/L1")).quantity).toBe(0);
    expect((await initiate("tok-other", { kind: "order", listingId: "L1", quantity: 1 })).json.error).toBe("sold_out");
  });

  it("still handles a payment that was started before quantities existed", async () => {
    await start({
      seed: {
        ...SEED(),
        "payments/aaf-old-1": { kind: "order", buyerId: "buyer1", buyerName: "Bea", amount: 120, currency: "NAD", status: "pending", listingId: "L1", sellerId: "seller1", sellerName: "Sam", product: "Mahangu" },
      },
    });
    paid("1401", "aaf-old-1", 120);
    expect((await verify("tok-buyer", 1401)).json.verified).toBe(true);
    expect(await store.get("orders/tx_1401")).toMatchObject({ quantity: 1, unitPrice: 120 });
    expect((await store.get("marketPrices/L1")).quantity).toBe(9);
  });
});

// ---- helpers ------------------------------------------------------------------------------
describe("countWorkingDays", () => {
  it("counts Monday to Friday only", () => {
    expect(countWorkingDays("2026-10-05", "2026-10-09")).toBe(5);
    expect(countWorkingDays("2026-10-05", "2026-10-11")).toBe(5); // a full week
    expect(countWorkingDays("2026-10-03", "2026-10-04")).toBe(0); // Saturday and Sunday
    expect(countWorkingDays("2026-10-02", "2026-10-05")).toBe(2); // Friday and Monday
    expect(countWorkingDays("2026-10-07", "2026-10-07")).toBe(1);
  });
  it("is 0 for backwards or invalid dates", () => {
    expect(countWorkingDays("2026-10-09", "2026-10-05")).toBe(0);
    expect(countWorkingDays("", "2026-10-05")).toBe(0);
    expect(countWorkingDays("05/10/2026", "09/10/2026")).toBe(0);
    expect(countWorkingDays(undefined, undefined)).toBe(0);
  });
});

describe("parseServiceAccount", () => {
  const key = { type: "service_account", project_id: "demo", private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n", client_email: "a@demo.iam.gserviceaccount.com" };

  it("reads the key pasted as JSON or as base64", () => {
    expect(parseServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(key) }).account.project_id).toBe("demo");
    expect(parseServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: Buffer.from(JSON.stringify(key)).toString("base64") }).account.project_id).toBe("demo");
  });
  it("says 'missing' when nothing is set, and explains a bad key without echoing it", () => {
    expect(parseServiceAccount({})).toEqual({ missing: true });
    const bad = parseServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: "service_account", private_key: "SECRETSECRET" }) });
    expect(bad.error).toMatch(/not a service-account key/);
    expect(bad.error).not.toContain("SECRETSECRET");
    expect(parseServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: "{not json" }).error).toBeTruthy();
  });
});
