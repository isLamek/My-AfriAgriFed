// Per-IP request limit so the public weather/fire endpoints can't be used to
// run up the Open-Meteo bill. Fixed window, in memory (one server instance).

function rateLimit({ windowMs = 60000, max = 120, now = Date.now } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }

  const sweep = setInterval(() => {
    const t = now();
    for (const [ip, h] of hits) if (t >= h.resetAt) hits.delete(ip);
  }, windowMs);
  if (sweep.unref) sweep.unref();

  return function limiter(req, res, next) {
    const t = now();
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    let h = hits.get(ip);
    if (!h || t >= h.resetAt) {
      h = { count: 0, resetAt: t + windowMs };
      hits.set(ip, h);
    }
    h.count += 1;
    if (h.count > max) {
      res.set("Retry-After", String(Math.ceil((h.resetAt - t) / 1000)));
      return res.status(429).json({ error: "rate_limited", message: "Too many requests. Please slow down." });
    }
    return next();
  };
}

module.exports = { rateLimit };
