// A deliberately tiny database interface, so the payment logic can be tested
// without Firebase: adminStore() wraps real Firestore (Admin SDK), memoryStore()
// is an in-memory stand-in with the same behaviour.
//
//   get(path)              -> data object, or null
//   create(path, data)     -> true if written, false if the document already exists (atomic)
//   set(path, data, opts)  -> write (opts.merge supported)
//   update(path, data)     -> change fields of an existing document
//   add(collection, data)  -> new document id
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
    now: () => FieldValue.serverTimestamp(),
  };
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
    now: clock,
    /** All documents directly inside a collection, for assertions. */
    list(collection) {
      return [...docs.entries()].filter(([p]) => p.startsWith(`${collection}/`) && !p.slice(collection.length + 1).includes("/")).map(([p, d]) => ({ id: p.split("/").pop(), ...d }));
    },
  };
}

module.exports = { adminStore, memoryStore };
