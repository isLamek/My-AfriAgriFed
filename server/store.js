// A deliberately tiny database interface, so the payment logic can be tested
// without Firebase: adminStore() wraps real Firestore (Admin SDK), memoryStore()
// is an in-memory stand-in with the same behaviour.
//
//   get(path)              -> data object, or null
//   create(path, data)     -> true if written, false if the document already exists (atomic)
//   set(path, data, opts)  -> write (opts.merge supported)
//   update(path, data)     -> change fields of an existing document
//   add(collection, data)  -> new document id
//   reserveStock({orderPath, listingPath, quantity, flag})
//                          -> subtract an order's units from its listing, once (atomic)
//   remove(path)           -> delete a document
//   query(collection, [[field, op, value], ...], {limit})
//                          -> [{ id, ...data }] (ops: == != < <= > >= in)
//   updateIf(path, decide) -> atomic read-decide-write: decide(current) returns the fields to
//                             change, or null to leave it; resolves { applied, data }
//   now()                  -> a server timestamp value

function adminStore(db, FieldValue) {
  return {
    async get(path) {
      const snap = await db.doc(path).get();
      return snap.exists ? snap.data() : null;
    },
    async create(path, data) {
      try {
        await db.doc(path).create(data);
        return true;
      } catch (error) {
        // gRPC code 6 = ALREADY_EXISTS
        if (error.code === 6 || /already exists/i.test(String(error.message))) return false;
        throw error;
      }
    },
    async set(path, data, options) {
      await db.doc(path).set(data, options || {});
    },
    async update(path, data) {
      await db.doc(path).update(data);
    },
    async add(collection, data) {
      const ref = await db.collection(collection).add(data);
      return ref.id;
    },
    async reserveStock({ orderPath, listingPath, quantity, flag }) {
      // One transaction: take the units off the listing AND mark the order as
      // counted, so two requests for the same order can never both subtract.
      return db.runTransaction(async (tx) => {
        const orderRef = db.doc(orderPath);
        const listingRef = db.doc(listingPath);
        const [orderSnap, listingSnap] = await Promise.all([tx.get(orderRef), tx.get(listingRef)]);
        return applyStock({
          order: orderSnap.exists ? orderSnap.data() : null,
          listing: listingSnap.exists ? listingSnap.data() : null,
          quantity,
          flag,
          writeOrder: (data) => tx.update(orderRef, data),
          writeListing: (data) => tx.update(listingRef, data),
        });
      });
    },
    async remove(path) {
      await db.doc(path).delete();
    },
    async query(collection, wheres = [], { limit = 200 } = {}) {
      let q = db.collection(collection);
      for (const [field, op, value] of wheres) q = q.where(field, op, value);
      const snap = await q.limit(limit).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async updateIf(path, decide) {
      return db.runTransaction(async (tx) => {
        const ref = db.doc(path);
        const snap = await tx.get(ref);
        const current = snap.exists ? snap.data() : null;
        const patch = current ? decide(current) : null;
        if (!patch) return { applied: false, data: current };
        tx.update(ref, patch);
        return { applied: true, data: { ...current, ...patch } };
      });
    },
    now: () => FieldValue.serverTimestamp(),
  };
}

/**
 * The stock rule, shared by the real database and the test double.
 * - already counted for this order: do nothing
 * - listing has no quantity (unlimited) or is gone: nothing to subtract
 * - otherwise subtract, never below zero; if there were fewer than ordered the
 *   order is flagged `oversold` so the seller can sort it out with the buyer.
 */
function applyStock({ order, listing, quantity, flag, writeOrder, writeListing }) {
  if (!order) throw new Error("Order not found while counting stock");
  // An order with several items counts each one under its own flag (stockApplied_0, stockApplied_1, ...);
  // an order with one item, and every order from before baskets existed, uses plain "stockApplied".
  const applied = flag || "stockApplied";
  const over = flag ? `oversold_${flag.split("_").pop()}` : "oversold";
  if (order[applied]) return { applied: false };

  const stock = listing && typeof listing.quantity === "number" ? listing.quantity : null;
  if (stock === null) {
    writeOrder({ [applied]: true });
    return { applied: true, oversold: false, remaining: null };
  }
  const oversold = stock < quantity;
  const remaining = Math.max(0, stock - quantity);
  writeListing({ quantity: remaining });
  writeOrder({ [applied]: true, [over]: oversold });
  return { applied: true, oversold, remaining, available: stock };
}

// A JSON round trip: like a real database, only plain data survives.
const clone = (value) => JSON.parse(JSON.stringify(value));

function memoryStore(seed = {}) {
  const docs = new Map(Object.entries(seed).map(([path, data]) => [path, clone(data)]));
  let counter = 0;
  const clock = () => ({ __serverTimestamp: true });
  return {
    docs, // exposed so tests can look inside
    async get(path) {
      return docs.has(path) ? clone(docs.get(path)) : null;
    },
    async create(path, data) {
      if (docs.has(path)) return false;
      docs.set(path, clone(data));
      return true;
    },
    async set(path, data, options) {
      docs.set(path, options && options.merge && docs.has(path) ? { ...docs.get(path), ...clone(data) } : clone(data));
    },
    async update(path, data) {
      if (!docs.has(path)) throw new Error(`No document to update: ${path}`);
      docs.set(path, { ...docs.get(path), ...clone(data) });
    },
    async add(collection, data) {
      const id = `auto${++counter}`;
      docs.set(`${collection}/${id}`, clone(data));
      return id;
    },
    async reserveStock({ orderPath, listingPath, quantity, flag }) {
      return applyStock({
        order: docs.has(orderPath) ? docs.get(orderPath) : null,
        listing: docs.has(listingPath) ? docs.get(listingPath) : null,
        quantity,
        flag,
        writeOrder: (data) => docs.set(orderPath, { ...docs.get(orderPath), ...data }),
        writeListing: (data) => docs.set(listingPath, { ...docs.get(listingPath), ...data }),
      });
    },
    async remove(path) {
      docs.delete(path);
    },
    async query(collection, wheres = [], { limit = 200 } = {}) {
      const test = { "==": (a, b) => a === b, "!=": (a, b) => a !== b, "<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b, in: (a, b) => b.includes(a) };
      return this.list(collection)
        .filter((d) => wheres.every(([field, op, value]) => d[field] !== undefined && test[op](d[field], value)))
        .slice(0, limit);
    },
    async updateIf(path, decide) {
      const current = docs.has(path) ? clone(docs.get(path)) : null;
      const patch = current ? decide(clone(current)) : null;
      if (!patch) return { applied: false, data: current };
      docs.set(path, { ...docs.get(path), ...clone(patch) });
      return { applied: true, data: clone(docs.get(path)) };
    },
    now: clock,
    /** All documents directly inside a collection, for assertions. */
    list(collection) {
      return [...docs.entries()].filter(([p]) => p.startsWith(`${collection}/`) && !p.slice(collection.length + 1).includes("/")).map(([p, d]) => ({ id: p.split("/").pop(), ...d }));
    },
  };
}

module.exports = { adminStore, memoryStore };
