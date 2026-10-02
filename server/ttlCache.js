// A small in-memory cache for upstream API responses.
//
//  - Entries are fresh for `ttlMs`.
//  - Concurrent requests for the same key share ONE upstream call.
//  - If the upstream fails, an entry younger than `staleMs` is served instead
//    (status "stale") so a provider outage doesn't blank the map.
//  - The cache never grows past `maxEntries`; the oldest entries go first.

class TtlCache {
  constructor({ now = Date.now, maxEntries = 2000 } = {}) {
    this.now = now;
    this.maxEntries = maxEntries;
    this.entries = new Map(); // key -> { value, fetchedAt, expires }
    this.inflight = new Map(); // key -> Promise
  }

  /** Put a value in directly (used to restore a copy saved on disk). */
  seed(key, value, fetchedAt, ttlMs) {
    this.entries.delete(key);
    this.entries.set(key, { value, fetchedAt, expires: fetchedAt + ttlMs });
    this.trim();
  }

  peek(key) {
    return this.entries.get(key) || null;
  }

  async get(key, { ttlMs, staleMs = ttlMs * 6 }, loader) {
    const entry = this.entries.get(key);
    const t = this.now();
    if (entry && t < entry.expires) return { value: entry.value, status: "hit", fetchedAt: entry.fetchedAt };

    if (this.inflight.has(key)) return this.inflight.get(key);

    const job = (async () => {
      try {
        const value = await loader();
        const fetchedAt = this.now();
        this.entries.delete(key); // re-insert so it counts as newest
        this.entries.set(key, { value, fetchedAt, expires: fetchedAt + ttlMs });
        this.trim();
        return { value, status: "miss", fetchedAt };
      } catch (error) {
        if (entry && this.now() < entry.fetchedAt + staleMs) {
          return { value: entry.value, status: "stale", fetchedAt: entry.fetchedAt, error };
        }
        throw error;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, job);
    return job;
  }

  trim() {
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }
}

module.exports = { TtlCache };
