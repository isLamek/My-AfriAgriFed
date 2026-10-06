// Fire hotspots from NASA FIRMS (VIIRS satellites, ~375 m, near real time).
//
// A "hotspot" is a satellite detection of heat, not a confirmed fire, and
// satellites pass a few times a day, so the absence of a dot does not mean
// the absence of fire. The MAP_KEY stays on the server.

const AREA = "10.9,-29.9,26.1,-16.2"; // west,south,east,north (Namibia + margin)
const SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT"];
const DAYS = 2;
const TTL = { ttlMs: 15 * 60 * 1000, staleMs: 3 * 60 * 60 * 1000 };
const BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

/**
 * Parse FIRMS CSV by column NAME (column order differs between satellites).
 * Low-confidence VIIRS detections ("l") are mostly false alarms and are dropped.
 */
function parseFirmsCsv(text) {
  const lines = String(text || "").trim().split(/\r?\n/);
  const header = (lines[0] || "").split(",").map((h) => h.trim());
  const col = (name) => header.indexOf(name);
  if (col("latitude") < 0 || col("longitude") < 0) {
    throw new Error(`Unexpected FIRMS response: ${lines[0] ? lines[0].slice(0, 80) : "empty"}`);
  }
  const fires = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const c = line.split(",");
    const lat = Number(c[col("latitude")]);
    const lng = Number(c[col("longitude")]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const confidence = String(c[col("confidence")] || "").trim().toLowerCase();
    if (confidence === "l" || confidence === "low") continue;
    const time = String(c[col("acq_time")] || "").padStart(4, "0"); // "0042" = 00:42 UTC
    const frp = Number(c[col("frp")]);
    fires.push({
      lat: Math.round(lat * 1e4) / 1e4,
      lng: Math.round(lng * 1e4) / 1e4,
      date: c[col("acq_date")],
      time: `${time.slice(0, 2)}:${time.slice(2)}`,
      confidence: confidence === "h" || confidence === "high" ? "high" : "nominal",
      frp: Number.isFinite(frp) ? Math.round(frp * 10) / 10 : null, // fire radiative power, MW
      dayNight: String(c[col("daynight")] || "").trim() || null,
      satellite: String(c[col("satellite")] || "").trim() || null,
    });
  }
  return fires;
}

async function loadFires(fetchImpl, mapKey) {
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      const url = `${BASE}/${mapKey}/${source}/${AREA}/${DAYS}`;
      let res;
      try {
        res = await fetchImpl(url, { signal: AbortSignal.timeout(25000) });
      } catch (error) {
        throw new Error(`FIRMS unreachable: ${String(error.message).split(mapKey).join("***")}`);
      }
      if (!res.ok) throw new Error(`FIRMS returned ${res.status}`);
      return parseFirmsCsv(await res.text());
    })
  );
  return results.flat();
}

function register(app, { cache, fetchImpl = globalThis.fetch, mapKey = "", limiter, log = console } = {}) {
  const guard = limiter ? [limiter] : [];

  app.get("/api/fires", ...guard, async (req, res) => {
    if (!mapKey) {
      return res.status(503).json({ error: "fires_not_configured", message: "Fire data is not switched on yet." });
    }
    try {
      const result = await cache.get("fires", TTL, () => loadFires(fetchImpl, mapKey));
      res.set("X-Cache", result.status);
      res.set("Cache-Control", "public, max-age=300");
      res.json({
        fetchedAt: new Date(result.fetchedAt).toISOString(),
        source: "NASA FIRMS (VIIRS S-NPP and NOAA-20)",
        days: DAYS,
        count: result.value.length,
        fires: result.value,
      });
    } catch (error) {
      log.warn("[fires]", error.message);
      res.status(502).json({ error: "fires_unavailable", message: "Fire data is temporarily unavailable." });
    }
  });
}

module.exports = { register, parseFirmsCsv, TTL, AREA, SOURCES };
