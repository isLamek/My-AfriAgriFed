// Delivery, handover and the life of an order after it is paid.
//
// The browser may move an order a little (the seller confirms and marks it ready: see
// firestore.rules). Everything that involves a second person, proof, or money goes
// through here, where the server checks WHO is asking and WHAT STATE the order is in:
//
//   POST /api/delivery/quote                       what each way of getting the order costs
//   POST /api/delivery/:orderId/request-carrier    seller asks AfriAgriFed for a carrier
//   POST /api/delivery/jobs/:orderId/claim         an approved carrier takes the job
//   POST /api/delivery/jobs/:orderId/release       ...or drops it before collecting
//   POST /api/delivery/:orderId/pickup             carrier collected the goods: on the way
//   POST /api/delivery/:orderId/location           the vehicle's position (carrier, or seller delivering)
//   POST /api/delivery/:orderId/arrived            "I am at the address"
//   POST /api/delivery/:orderId/handover           the buyer's 6-digit code finishes the delivery
//   POST /api/orders/:orderId/confirm              the buyer says they got it
//   POST /api/orders/:orderId/cancel               buyer or seller cancels before dispatch
//   POST /api/orders/:orderId/dispute              the buyer reports a problem
//   POST /api/orders/:orderId/resolve              support decides a problem (admins only)
//   POST /api/delivery/sweep                       timeouts (also runs on a timer): see sweep()
//
// Money is never moved here. Where it should move, the server calls the hooks in
// server/escrowHooks.js, which is where the payment work plugs in.

const crypto = require("crypto");
const rules = require("../src/delivery/rules");
const { LIMITS } = rules;
const { HttpError, route } = require("./httpError");
const { quoteBasket } = require("./basket");
const defaultHooks = require("./escrowHooks");

const isId = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const HOUR = 3600000;
const DISPUTE_REASONS = ["not_delivered", "damaged", "wrong_items", "short_quantity", "quality", "other"];
const MAX_ACTIVE_JOBS = 3; // a carrier can hold this many jobs at once
const NEAR_KM = 1; // "almost there" notice

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Milliseconds from a stored time: a plain number, a Firestore timestamp, or the test double's stand-in. */
const toMs = (v, fallback = 0) => {
  if (typeof v === "number") return v;
  if (v && typeof v.toMillis === "function") return v.toMillis();
  if (v && v._seconds !== undefined) return v._seconds * 1000;
  return fallback;
};

// ---- building the order (called by server/checkout.js when a payment is confirmed) -----------------

/** The items on an order. Orders paid before baskets existed carry a single item in plain fields. */
function itemsOf(order) {
  if (Array.isArray(order.items) && order.items.length) return order.items;
  return [{ listingId: order.listingId, product: order.product, quantity: order.quantity || 1, unit: order.unit || "", unitPrice: order.unitPrice }];
}

/** The order document for a confirmed payment. `payment` is what server/basket.js priced. */
function buildOrderDoc(payment, tx, { store, nowMs }) {
  const items = Array.isArray(payment.items) && payment.items.length ? payment.items : null;
  return {
    buyerId: payment.buyerId,
    buyerName: payment.buyerName,
    sellerId: payment.sellerId,
    sellerName: payment.sellerName,
    product: payment.product,
    listingId: payment.listingId,
    quantity: items ? payment.quantity : payment.quantity || 1, // payments started before quantities existed
    unit: payment.unit || "",
    unitPrice: payment.unitPrice ?? (items ? null : payment.amount),
    ...(items ? { items, itemsTotal: payment.itemsTotal, deliveryFee: payment.deliveryFee || 0 } : {}),
    fulfilment: payment.fulfilment || { method: "collect", deliveryFee: 0 },
    stockApplied: false,
    oversold: false,
    amount: payment.amount,
    currency: payment.currency,
    transactionId: String(tx.id),
    txRef: tx.tx_ref,
    status: "paid",
    statusHistory: [{ status: "paid", by: payment.buyerId, at: nowMs(), note: "Payment received" }],
    createdAt: store.now(),
    updatedAt: store.now(),
  };
}

/** Take the units off every listing in the order, once each. Returns the lines that could not be filled in full. */
async function reserveItems(store, orderId, order) {
  const items = itemsOf(order);
  const short = [];
  for (let i = 0; i < items.length; i += 1) {
    const flag = items.length > 1 ? `stockApplied_${i}` : undefined;
    const r = await store.reserveStock({ orderPath: `orders/${orderId}`, listingPath: `marketPrices/${items[i].listingId}`, quantity: items[i].quantity, flag });
    if (r.applied && r.oversold) short.push({ item: items[i], available: r.available });
  }
  if (items.length > 1) {
    const now = await store.get(`orders/${orderId}`);
    const all = items.every((_, i) => now[`stockApplied_${i}`]);
    if (all && !now.stockApplied) {
      await store.update(`orders/${orderId}`, { stockApplied: true, oversold: items.some((_, i) => now[`oversold_${i}`]) });
    }
  }
  return short;
}

/** Everything that must exist next to a brand-new order: the buyer's handover code. */
async function createOrderSecret(store, orderId, order, { randomInt = crypto.randomInt, nowMs = Date.now } = {}) {
  await store.create(`orderSecrets/${orderId}`, {
    buyerId: order.buyerId,
    code: rules.newHandoverCode(randomInt),
    tries: 0,
    createdAt: nowMs(),
  });
}

// ---- the routes -------------------------------------------------------------------------------------

function register(app, deps) {
  const {
    store,
    verifyToken,
    limiter,
    log = console,
    nowMs = Date.now,
    randomInt = crypto.randomInt,
    hooks = defaultHooks,
    sweepSecret = "",
  } = deps;

  const guard = limiter ? [limiter] : [];
  const ready = !!(store && verifyToken);
  const wrap = (handler) => route(handler, { log, tag: "delivery" });

  const needsSetup = (req, res, next) =>
    ready ? next() : res.status(503).json({ error: "payments_not_ready", message: "Payments are being set up. Please try again soon." });

  const requireUser = wrap(async (req, res, next) => {
    const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!match) throw new HttpError(401, "sign_in_required", "Please sign in first.");
    try {
      req.user = await verifyToken(match[1]);
    } catch {
      throw new HttpError(401, "sign_in_required", "Your sign-in has expired. Please sign in again.");
    }
    if (req.user.anonymous) throw new HttpError(403, "sign_in_required", "Please sign in with your account first.");
    next();
  });

  // ---- small helpers ----------------------------------------------------------------------------
  async function notify(userId, { key, params, title, body, link }) {
    if (!userId) return;
    try {
      await store.add("notifications", { userId, title, body, ...(key ? { key, params: params || {} } : {}), link, read: false, createdAt: store.now() });
    } catch (error) {
      log.warn("[delivery] could not notify:", error.message);
    }
  }

  async function isAdmin(user) {
    if (!user.emailVerified || !user.email) return false;
    return !!(await store.get(`admins/${user.email.toLowerCase()}`));
  }

  async function loadOrder(orderId) {
    if (!isId(orderId)) throw new HttpError(404, "order_not_found", "That order could not be found.");
    const order = await store.get(`orders/${orderId}`);
    if (!order) throw new HttpError(404, "order_not_found", "That order could not be found.");
    return order;
  }

  // Orders paid before delivery existed have no record of it and behave like "the seller delivers".
  const methodOf = (order) => (order.fulfilment && order.fulfilment.method) || "seller";
  const clip = (s, n) => String(s || "").slice(0, n);
  const itemsLine = (order) => clip(order.product, 120);

  /** The next entry of an order's history, and the fields that change with it. */
  function advance(current, to, { by, note, extra = {} }) {
    const entry = { status: to, by, at: nowMs() };
    const text = clip(note, 280).trim();
    if (text) entry.note = text;
    return { status: to, statusHistory: [...(current.statusHistory || []), entry], updatedAt: store.now(), ...extra };
  }

  /** Move an order from one of `from` to `to`, atomically; says "wrong_status" when it is somewhere else. */
  async function move(orderId, from, to, build) {
    const result = await store.updateIf(`orders/${orderId}`, (cur) => (from.includes(cur.status || "paid") ? advance(cur, to, build(cur)) : null));
    if (!result.applied) throw new HttpError(409, "wrong_status", "That cannot be done at this stage of the order.");
    return result.data;
  }

  /** Change fields inside order.fulfilment without touching anything else. */
  async function patchFulfilment(orderId, changes) {
    return store.updateIf(`orders/${orderId}`, (cur) => ({ fulfilment: { ...(cur.fulfilment || {}), ...changes }, updatedAt: store.now() }));
  }

  /** Run a money hook; a failure is logged and the sweep may try again, never the delivery step. */
  async function runHook(name, order, orderId, ...args) {
    try {
      const fields = await hooks[name]({ id: orderId, ...order }, ...args);
      if (fields && typeof fields === "object") await store.update(`orders/${orderId}`, fields);
      return fields || {};
    } catch (error) {
      log.error(`[delivery] money hook ${name} failed for ${orderId}:`, error);
      return null;
    }
  }

  /** Put the units of a cancelled order back on sale. */
  async function restock(order) {
    const items = itemsOf(order);
    for (const item of items) {
      if (!item.listingId) continue;
      await store.updateIf(`marketPrices/${item.listingId}`, (cur) => (typeof cur.quantity === "number" ? { quantity: cur.quantity + (Number(item.quantity) || 0) } : null));
    }
  }

  const releaseAtFor = (verified) => nowMs() + (verified ? LIMITS.releaseVerifiedHours : LIMITS.releaseUnverifiedHours) * HOUR;

  /** Who in this order's delivery is the user? "carrier" only counts while they hold the job. */
  async function roleIn(order, orderId, user) {
    if (order.buyerId === user.uid) return "buyer";
    if (order.sellerId === user.uid) return "seller";
    const job = await store.get(`deliveryJobs/${orderId}`);
    if (job && job.carrierId === user.uid && ["claimed", "picked_up"].includes(job.status)) return "carrier";
    return null;
  }

  // ---- quote -----------------------------------------------------------------------------------------
  app.post(
    "/api/delivery/quote",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const q = await quoteBasket(store, req.user, req.body || {});
      res.json({
        sellerName: q.basket.sellerName,
        items: q.items,
        itemsTotal: q.itemsTotal,
        pickup: q.pickup,
        quotes: q.quotes,
        addressProblem: q.addressProblem,
      });
    })
  );

  // ---- the seller asks for a carrier ------------------------------------------------------------------
  app.post(
    "/api/delivery/:orderId/request-carrier",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      if (order.sellerId !== req.user.uid) throw new HttpError(403, "not_yours", "That order belongs to someone else.");
      if (methodOf(order) !== "platform") throw new HttpError(409, "not_platform_delivery", "This order is not set up for an AfriAgriFed carrier.");
      if (!["confirmed", "dispatched"].includes(order.status)) throw new HttpError(409, "wrong_status", "That cannot be done at this stage of the order.");

      const existing = await store.get(`deliveryJobs/${orderId}`);
      if (existing && existing.status !== "cancelled") throw new HttpError(409, "job_exists", "A carrier has already been requested for this order.");

      const body = req.body || {};
      const phone = rules.cleanPhone(body.pickupPhone);
      if (!phone) throw new HttpError(400, "bad_phone", "Add a phone number the carrier can call at pick-up.");
      const now = nowMs();
      const readyAt = body.readyAt === undefined ? now + 2 * HOUR : Number(body.readyAt);
      if (!Number.isFinite(readyAt) || readyAt < now - HOUR || readyAt > now + 72 * HOUR) {
        throw new HttpError(400, "bad_ready_time", "Choose a time the goods will be ready, within the next 3 days.");
      }

      const f = order.fulfilment;
      const pickup = f.pickup || null;
      if (!pickup) throw new HttpError(409, "no_pickup_location", "This listing has no pick-up location on the map.");
      const items = itemsOf(order);
      const weightKg = Math.round(rules.orderWeightKg(items));
      const job = {
        orderId,
        sellerId: order.sellerId,
        buyerId: order.buyerId,
        status: "open",
        vehicle: f.vehicle || "bakkie",
        km: f.km,
        fee: f.deliveryFee,
        carrierPay: rules.carrierPay(f.deliveryFee),
        weightKg,
        what: clip(order.product, 120),
        pickup: { ...rules.roughPlace(pickup), label: clip(pickup.label, 60), region: clip(pickup.region, 40) },
        dropoff: { ...rules.roughPlace(f.address), label: clip(f.address.label, 60) },
        requestedDate: f.requestedDate || null,
        window: f.window || "anytime",
        readyAt,
        carrierId: null,
        carrierName: "",
        createdAt: now,
      };
      await store.set(`deliveryJobs/${orderId}`, job);
      await store.set(`deliveryPrivate/${orderId}`, {
        sellerId: order.sellerId,
        buyerId: order.buyerId,
        carrierId: null,
        pickup: { ...pickup, phone, note: clip(body.pickupNote, 200) },
        dropoff: f.address,
        note: clip(f.note, 200),
      });
      await patchFulfilment(orderId, { carrierRequestedAt: now, readyAt });

      // Tell the approved carriers whose vehicle can take it.
      const carriers = await store.query("carriers", [["status", "==", "approved"]], { limit: 200 });
      const matches = carriers.filter(
        (c) => c.available !== false && c.id !== order.buyerId && c.id !== order.sellerId && rules.vehicleFits(c.vehicle && c.vehicle.type, job.vehicle) && (!c.regions || !c.regions.length || !job.pickup.region || c.regions.includes(job.pickup.region))
      );
      await Promise.all(
        matches.slice(0, 50).map((c) =>
          notify(c.id, {
            key: "notif.delivery.jobOpen",
            params: { what: itemsLine(order), name: job.dropoff.label },
            title: "New delivery job",
            body: `${itemsLine(order)} to ${job.dropoff.label}. Open the Deliveries page to take it.`,
            link: "/carrier",
          })
        )
      );
      res.json({ ok: true, carriersNotified: Math.min(matches.length, 50) });
    })
  );

  // ---- a carrier takes (or drops) a job -----------------------------------------------------------------
  app.post(
    "/api/delivery/jobs/:orderId/claim",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      const carrier = await store.get(`carriers/${req.user.uid}`);
      if (!carrier || carrier.status !== "approved") throw new HttpError(403, "not_a_carrier", "Only approved carriers can take delivery jobs.");
      if (carrier.available === false) throw new HttpError(409, "carrier_unavailable", "You are marked as unavailable. Switch to available to take jobs.");
      if (order.buyerId === req.user.uid || order.sellerId === req.user.uid) throw new HttpError(403, "own_order", "You can't deliver your own order.");

      const job = await store.get(`deliveryJobs/${orderId}`);
      if (!job) throw new HttpError(404, "job_not_found", "That delivery job could not be found.");
      if (!rules.vehicleFits(carrier.vehicle && carrier.vehicle.type, job.vehicle)) {
        throw new HttpError(409, "vehicle_too_small", "Your vehicle is too small for this load.", { vehicle: job.vehicle });
      }
      const mine = await store.query("deliveryJobs", [["carrierId", "==", req.user.uid]]);
      if (mine.filter((j) => ["claimed", "picked_up"].includes(j.status)).length >= MAX_ACTIVE_JOBS) {
        throw new HttpError(409, "too_many_jobs", `You already have ${MAX_ACTIVE_JOBS} jobs. Finish one first.`, { max: MAX_ACTIVE_JOBS });
      }

      const name = clip(carrier.name || req.user.name || "Carrier", 80);
      const claimed = await store.updateIf(`deliveryJobs/${orderId}`, (cur) =>
        cur.status === "open" ? { status: "claimed", carrierId: req.user.uid, carrierName: name, claimedAt: nowMs() } : null
      );
      if (!claimed.applied) throw new HttpError(409, "job_taken", "Someone else just took this job.");

      await store.update(`deliveryPrivate/${orderId}`, { carrierId: req.user.uid });
      await patchFulfilment(orderId, {
        carrier: { uid: req.user.uid, name, vehicle: { type: carrier.vehicle.type, description: clip(carrier.vehicle.description, 80), plate: clip(carrier.vehicle.plate, 20) } },
      });
      const params = { name, product: itemsLine(order) };
      await notify(order.sellerId, { key: "notif.delivery.carrierAssigned", params, title: "Carrier assigned", body: `${name} will collect ${params.product}.`, link: "/track-orders" });
      await notify(order.buyerId, { key: "notif.delivery.carrierAssigned", params, title: "Carrier assigned", body: `${name} will deliver ${params.product}.`, link: "/track-orders" });
      res.json({ ok: true });
    })
  );

  app.post(
    "/api/delivery/jobs/:orderId/release",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      const dropped = await store.updateIf(`deliveryJobs/${orderId}`, (cur) =>
        cur.status === "claimed" && cur.carrierId === req.user.uid ? { status: "open", carrierId: null, carrierName: "", releasedAt: nowMs() } : null
      );
      if (!dropped.applied) throw new HttpError(409, "wrong_status", "That cannot be done at this stage of the order.");
      await store.update(`deliveryPrivate/${orderId}`, { carrierId: null });
      await store.updateIf(`orders/${orderId}`, (cur) => {
        const { carrier, ...rest } = cur.fulfilment || {}; // eslint-disable-line no-unused-vars
        return { fulfilment: rest, updatedAt: store.now() };
      });
      await notify(order.sellerId, { key: "notif.delivery.carrierDropped", params: { product: itemsLine(order) }, title: "Carrier dropped the job", body: `The carrier for ${itemsLine(order)} can no longer collect it. We are finding another.`, link: "/track-orders" });
      res.json({ ok: true });
    })
  );

  // ---- on the road ----------------------------------------------------------------------------------------
  app.post(
    "/api/delivery/:orderId/pickup",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      if ((await roleIn(order, orderId, req.user)) !== "carrier") throw new HttpError(403, "not_yours", "That job belongs to someone else.");
      const name = (order.fulfilment.carrier && order.fulfilment.carrier.name) || "The carrier";
      await move(orderId, ["confirmed", "dispatched"], "in_transit", () => ({ by: req.user.uid, note: `Collected by ${name}`, extra: {} }));
      await store.update(`deliveryJobs/${orderId}`, { status: "picked_up", pickedUpAt: nowMs() });
      await patchFulfilment(orderId, { pickedUpAt: nowMs() });
      await notify(order.buyerId, { key: "notif.order.in_transit", params: { product: itemsLine(order) }, title: "On the way", body: `${itemsLine(order)} is on its way to you.`, link: "/track-orders" });
      await notify(order.sellerId, { key: "notif.delivery.pickedUp", params: { product: itemsLine(order), name }, title: "Collected", body: `${name} collected ${itemsLine(order)}.`, link: "/track-orders" });
      res.json({ ok: true });
    })
  );

  app.post(
    "/api/delivery/:orderId/location",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      const role = await roleIn(order, orderId, req.user);
      const allowed = (role === "carrier" && methodOf(order) === "platform") || (role === "seller" && methodOf(order) === "seller");
      if (!allowed) throw new HttpError(403, "not_yours", "That job belongs to someone else.");
      if (order.status !== "in_transit") throw new HttpError(409, "not_travelling", "The order is not on its way right now.");

      const lat = Number(req.body && req.body.lat);
      const lng = Number(req.body && req.body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -35 || lat > -10 || lng < 8 || lng > 32) {
        throw new HttpError(400, "bad_location", "That position does not look right.");
      }
      const now = nowMs();
      const last = await store.get(`orderTracking/${orderId}`);
      if (last && now - last.at < LIMITS.locationEverySeconds * 1000) return res.json({ ok: true, skipped: true });

      const speed = Number(req.body.speedKmh);
      await store.set(`orderTracking/${orderId}`, {
        orderId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        carrierId: role === "carrier" ? req.user.uid : null,
        lat: Math.round(lat * 1e5) / 1e5,
        lng: Math.round(lng * 1e5) / 1e5,
        speedKmh: Number.isFinite(speed) && speed >= 0 && speed < 250 ? Math.round(speed) : null,
        at: now,
      });

      const drop = order.fulfilment.address;
      const distanceKm = drop ? Math.round(rules.roadKm({ lat, lng }, drop) * 10) / 10 : null;
      if (distanceKm != null && distanceKm <= NEAR_KM && !order.fulfilment.nearNotified) {
        await patchFulfilment(orderId, { nearNotified: true });
        await notify(order.buyerId, { key: "notif.delivery.nearby", params: { product: itemsLine(order) }, title: "Almost there", body: `Your delivery of ${itemsLine(order)} is about ${NEAR_KM} km away.`, link: "/track-orders" });
      }
      res.json({ ok: true, distanceKm, etaMinutes: distanceKm == null ? null : rules.etaMinutes(distanceKm) });
    })
  );

  app.post(
    "/api/delivery/:orderId/arrived",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      const role = await roleIn(order, orderId, req.user);
      if (!((role === "carrier" && methodOf(order) === "platform") || (role === "seller" && ["seller", "collect"].includes(methodOf(order))))) {
        throw new HttpError(403, "not_yours", "That job belongs to someone else.");
      }
      if (!["in_transit", "dispatched"].includes(order.status)) throw new HttpError(409, "wrong_status", "That cannot be done at this stage of the order.");
      if (!order.fulfilment.arrivedAt) {
        await patchFulfilment(orderId, { arrivedAt: nowMs() });
        await notify(order.buyerId, { key: "notif.delivery.arrived", params: { product: itemsLine(order) }, title: "Your delivery has arrived", body: `Give the handover code to receive ${itemsLine(order)}.`, link: "/track-orders" });
      }
      res.json({ ok: true });
    })
  );

  // ---- the handover ------------------------------------------------------------------------------------------
  // Whoever hands the goods over asks the buyer for their code and types it in. The code is the
  // buyer's "yes, I have it". If the buyer cannot show it (flat phone), the handover can still be
  // recorded WITHOUT the code, with a reason; the buyer then has longer to object before any money
  // is released.
  const HANDOVER_FROM = { platform: ["in_transit"], seller: ["dispatched", "in_transit"], collect: ["dispatched"] };

  async function finishDelivery(orderId, order, { by, verified, note, from = HANDOVER_FROM[methodOf(order)] }) {
    const done = await move(orderId, from, "delivered", (cur) => ({
      by,
      note,
      extra: {
        fulfilment: { ...(cur.fulfilment || {}), handedOverAt: nowMs(), handedOverBy: by, verified },
        releaseAt: releaseAtFor(verified),
      },
    }));
    if (await store.get(`deliveryJobs/${orderId}`)) await store.update(`deliveryJobs/${orderId}`, { status: "delivered", deliveredAt: nowMs() });
    await store.remove(`orderTracking/${orderId}`); // the route is no one's business once it is over
    await runHook("onDelivered", done, orderId);
    const other = by === order.buyerId ? order.sellerId : order.buyerId;
    await notify(other, { key: "notif.order.delivered", params: { product: itemsLine(order) }, title: "Delivered", body: `${itemsLine(order)} was delivered.`, link: "/track-orders" });
    if (by !== order.buyerId && by !== order.sellerId) await notify(order.sellerId, { key: "notif.order.delivered", params: { product: itemsLine(order) }, title: "Delivered", body: `${itemsLine(order)} was delivered.`, link: "/track-orders" });
    return done;
  }

  app.post(
    "/api/delivery/:orderId/handover",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      const method = methodOf(order);
      const role = await roleIn(order, orderId, req.user);
      const mayHandOver = (role === "carrier" && method === "platform") || (role === "seller" && (method === "seller" || method === "collect"));
      if (!mayHandOver) throw new HttpError(403, "not_yours", "That job belongs to someone else.");
      if (!HANDOVER_FROM[method].includes(order.status)) throw new HttpError(409, "wrong_status", "That cannot be done at this stage of the order.");

      const body = req.body || {};
      if (body.noCode === true) {
        if (method === "collect") throw new HttpError(400, "code_required", "At a collection the buyer's code is needed. They can also confirm in the app.");
        const reason = clip(body.reason, 200).trim();
        if (reason.length < 3) throw new HttpError(400, "reason_required", "Say why the code could not be used.");
        await finishDelivery(orderId, order, { by: req.user.uid, verified: false, note: `Handed over without the code: ${reason}` });
        return res.json({ ok: true, status: "delivered", verified: false });
      }

      const secret = await store.get(`orderSecrets/${orderId}`);
      if (!secret) throw new HttpError(409, "no_code", "This order has no handover code. Use the buyer's confirmation instead.");
      if (secret.tries >= LIMITS.codeTries) throw new HttpError(423, "code_locked", "Too many wrong codes. Contact support to finish this order.");

      const typed = rules.normaliseCode(body.code);
      if (!typed || !safeEqual(typed, secret.code)) {
        const bumped = await store.updateIf(`orderSecrets/${orderId}`, (cur) => ({ tries: (cur.tries || 0) + 1 }));
        const left = Math.max(0, LIMITS.codeTries - bumped.data.tries);
        if (left === 0) {
          await notify(order.buyerId, { key: "notif.delivery.codeLocked", params: { product: itemsLine(order) }, title: "Handover code locked", body: `Too many wrong codes were tried for ${itemsLine(order)}. Support will contact you.`, link: "/track-orders" });
        }
        throw new HttpError(400, "wrong_code", "That code is not right.", { left });
      }
      await finishDelivery(orderId, order, { by: req.user.uid, verified: true, note: "Handed over with the buyer's code" });
      res.json({ ok: true, status: "delivered", verified: true });
    })
  );

  // The buyer says they have it (the app's "Confirm delivery" button).
  app.post(
    "/api/orders/:orderId/confirm",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      if (order.buyerId !== req.user.uid) throw new HttpError(403, "not_yours", "That order belongs to someone else.");
      await finishDelivery(orderId, order, { by: req.user.uid, verified: true, note: "", from: ["dispatched", "in_transit"] });
      res.json({ ok: true, status: "delivered" });
    })
  );

  // ---- cancelling -------------------------------------------------------------------------------------------------
  async function cancelOrder(orderId, order, { by, reason, from, why }) {
    const done = await move(orderId, from, "cancelled", () => ({ by, note: reason, extra: { cancelledBy: by, cancelReason: clip(reason, 200), cancelWhy: why } }));
    await restock(order);
    if (await store.get(`deliveryJobs/${orderId}`)) await store.update(`deliveryJobs/${orderId}`, { status: "cancelled" });
    await store.remove(`orderTracking/${orderId}`);
    await runHook("onCancelled", done, orderId, why);
    return done;
  }

  app.post(
    "/api/orders/:orderId/cancel",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      const reason = clip(req.body && req.body.reason, 200).trim();
      const admin = await isAdmin(req.user);
      const isBuyer = order.buyerId === req.user.uid;
      const isSeller = order.sellerId === req.user.uid;
      if (!isBuyer && !isSeller && !admin) throw new HttpError(403, "not_yours", "That order belongs to someone else.");

      // A buyer may change their mind until the seller accepts. A seller may decline before dispatch (and must say why).
      // After that only support can cancel, because goods may already be on the road.
      let from;
      let why;
      if (admin && !isBuyer && !isSeller) {
        from = ["paid", "confirmed", "dispatched", "in_transit", "disputed"];
        why = "support";
      } else if (isBuyer) {
        from = ["paid"];
        why = "buyer";
      } else {
        from = ["paid", "confirmed"];
        why = "seller";
        if (reason.length < 3) throw new HttpError(400, "reason_required", "Say why you are declining the order.");
      }
      await cancelOrder(orderId, order, { by: req.user.uid, reason, from, why });

      const other = isBuyer ? order.sellerId : order.buyerId;
      await notify(other, { key: "notif.order.cancelled", params: { product: itemsLine(order), reason: reason || "-" }, title: "Order cancelled", body: `${itemsLine(order)} was cancelled. The buyer's money is being returned.`, link: "/track-orders" });
      if (admin && !isBuyer && !isSeller) await notify(order.sellerId, { key: "notif.order.cancelled", params: { product: itemsLine(order), reason: reason || "-" }, title: "Order cancelled", body: `${itemsLine(order)} was cancelled by support.`, link: "/track-orders" });
      res.json({ ok: true, status: "cancelled" });
    })
  );

  // ---- a problem ------------------------------------------------------------------------------------------------------
  app.post(
    "/api/orders/:orderId/dispute",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      const order = await loadOrder(orderId);
      if (order.buyerId !== req.user.uid) throw new HttpError(403, "not_yours", "That order belongs to someone else.");
      const body = req.body || {};
      if (!DISPUTE_REASONS.includes(body.reason)) throw new HttpError(400, "bad_request", "Choose what went wrong.");
      const text = clip(body.text, 500).trim();
      if (body.reason === "other" && text.length < 5) throw new HttpError(400, "reason_required", "Describe what went wrong.");

      const now = nowMs();
      const result = await store.updateIf(`orders/${orderId}`, (cur) => {
        const open = ["dispatched", "in_transit"].includes(cur.status);
        const inWindow = cur.status === "delivered" && typeof cur.releaseAt === "number" && cur.releaseAt > now && !cur.releasedAt;
        if (!open && !inWindow) return null;
        return advance(cur, "disputed", { by: req.user.uid, note: text, extra: { dispute: { reason: body.reason, text, at: now, by: req.user.uid, previousStatus: cur.status } } });
      });
      if (!result.applied) throw new HttpError(409, "window_closed", "It is too late to report a problem with this order, or it is too early. Message the seller or contact support.");
      await store.set(`disputes/${orderId}`, { orderId, buyerId: order.buyerId, sellerId: order.sellerId, reason: body.reason, text, status: "open", amount: order.amount, product: clip(order.product, 120), createdAt: now });
      await runHook("onDisputed", result.data, orderId);
      await notify(order.sellerId, { key: "notif.order.disputed", params: { product: itemsLine(order), reason: body.reason }, title: "Problem reported", body: `The buyer reported a problem with ${itemsLine(order)}. Support will look into it.`, link: "/track-orders" });
      res.json({ ok: true, status: "disputed" });
    })
  );

  app.post(
    "/api/orders/:orderId/resolve",
    ...guard,
    needsSetup,
    requireUser,
    wrap(async (req, res) => {
      const orderId = req.params.orderId;
      if (!(await isAdmin(req.user))) throw new HttpError(403, "admin_only", "Only support staff can do that.");
      const order = await loadOrder(orderId);
      const outcome = req.body && req.body.outcome;
      if (!["release", "refund"].includes(outcome)) throw new HttpError(400, "bad_request", "Choose release or refund.");
      const note = clip(req.body.note, 280);
      const to = outcome === "refund" ? "cancelled" : "delivered";
      const done = await move(orderId, ["disputed"], to, () => ({
        by: req.user.uid,
        note: note || `Support decided: ${outcome}`,
        extra: outcome === "refund" ? { cancelledBy: req.user.uid, cancelWhy: "dispute" } : { releaseAt: nowMs() },
      }));
      if (outcome === "refund") await restock(order);
      await store.update(`disputes/${orderId}`, { status: "resolved", outcome, resolvedAt: nowMs(), resolvedBy: req.user.uid }).catch(() => {});
      const paid = await runHook("onResolved", done, orderId, outcome);
      if (paid && outcome === "release") await store.update(`orders/${orderId}`, { releasedAt: nowMs() }); // the sweep must not release it a second time
      for (const uid of [order.buyerId, order.sellerId]) {
        await notify(uid, { key: "notif.order.resolved", params: { product: itemsLine(order), status: outcome }, title: "Problem resolved", body: `Support decided on ${itemsLine(order)}: ${outcome === "refund" ? "the buyer is refunded" : "the seller is paid"}.`, link: "/track-orders" });
      }
      res.json({ ok: true, status: to });
    })
  );

  // ---- timeouts ---------------------------------------------------------------------------------------------------------
  /**
   * The things that must happen even when nobody is looking:
   *  - a paid order the seller never accepted is cancelled and refunded
   *  - a delivered order whose objection window has closed gets its money released
   *  - a carrier job nobody claimed is escalated to the seller
   * Safe to run as often as you like; each step only acts on orders that are due.
   */
  async function sweep() {
    const now = nowMs();
    const done = { cancelled: 0, released: 0, escalated: 0 };

    for (const order of await store.query("orders", [["status", "==", "paid"]], { limit: 200 })) {
      const paidAt = toMs(order.statusHistory && order.statusHistory[0] && order.statusHistory[0].at, toMs(order.createdAt, now));
      if (now - paidAt < LIMITS.sellerConfirmHours * HOUR) continue;
      try {
        await cancelOrder(order.id, order, { by: "system", reason: "The seller did not confirm in time", from: ["paid"], why: "seller_timeout" });
        done.cancelled += 1;
        await notify(order.buyerId, { key: "notif.order.autoCancelled", params: { product: itemsLine(order) }, title: "Order cancelled", body: `The seller did not confirm ${itemsLine(order)} in time, so it was cancelled and your money is being returned.`, link: "/track-orders" });
        await notify(order.sellerId, { key: "notif.order.autoCancelled", params: { product: itemsLine(order) }, title: "Order cancelled", body: `${itemsLine(order)} was cancelled because it was not confirmed in time.`, link: "/track-orders" });
      } catch (error) {
        log.warn(`[delivery] sweep could not cancel ${order.id}: ${error.message}`);
      }
    }

    for (const order of await store.query("orders", [["status", "==", "delivered"]], { limit: 200 })) {
      if (typeof order.releaseAt !== "number" || order.releaseAt > now || order.releasedAt) continue;
      const fields = await runHook("onReleaseDue", order, order.id);
      if (fields) {
        await store.update(`orders/${order.id}`, { releasedAt: now });
        done.released += 1;
      }
    }

    for (const job of await store.query("deliveryJobs", [["status", "==", "open"]], { limit: 200 })) {
      if (job.escalated || now - (job.createdAt || now) < LIMITS.carrierClaimHours * HOUR) continue;
      await store.update(`deliveryJobs/${job.id}`, { escalated: true });
      await notify(job.sellerId, { key: "notif.delivery.noCarrier", params: { product: clip(job.what, 120) }, title: "No carrier yet", body: `No carrier has taken the delivery of ${clip(job.what, 120)} yet. Support has been alerted.`, link: "/track-orders" });
      done.escalated += 1;
    }
    return done;
  }

  // An outside timer (a free cron service) can call this instead of, or as well as, the server's own timer.
  app.post(
    "/api/delivery/sweep",
    wrap(async (req, res) => {
      if (!ready) return res.status(503).end();
      if (!sweepSecret || !safeEqual(req.headers["x-sweep-secret"] || "", sweepSecret)) return res.status(401).end();
      res.json(await sweep());
    })
  );

  return { ready, sweep };
}

module.exports = { register, buildOrderDoc, reserveItems, createOrderSecret, itemsOf, toMs, DISPUTE_REASONS, MAX_ACTIVE_JOBS };
