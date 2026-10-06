// Weather proxy: the national forecast grid, point forecasts and flood outlooks.
//
// Why this exists: Open-Meteo's free API is non-commercial and rate limited per
// IP. Here ONE server asks Open-Meteo (with the commercial key, once set) and
// everyone shares the cached answer: the national grid is fetched once an
// hour for all visitors, point forecasts are cached per ~10 km cell.
// The key never leaves the server.

const fs = require("fs");
const path = require("path");
const grid = require("../src/farmview/gridConfig.json");

const FREE_HOST = "https://api.open-meteo.com";
const FREE_FLOOD_HOST = "https://flood-api.open-meteo.com";
const PAID_HOST = "https://customer-api.open-meteo.com"; // commercial plans use one host for every API

const TIMEZONE = "Africa/Windhoek";
const TTL = {
  grid: { ttlMs: 60 * 60 * 1000, staleMs: 12 * 60 * 60 * 1000 },
  point: { ttlMs: 30 * 60 * 1000, staleMs: 6 * 60 * 60 * 1000 },
  flood: { ttlMs: 3 * 60 * 60 * 1000, staleMs: 24 * 60 * 60 * 1000 },
};

// Only Namibia (plus a margin) is served, so this can't be used as a free
// general-purpose weather proxy.
const SERVICE_BOUNDS = { west: 10.9, south: -29.9, east: 26.1, north: -16.2 };

function gridPoints({ cols, rows, bounds: [west, south, east, north] } = grid) {
  const points = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      points.push({
        lng: Math.round((west + ((east - west) * c) / (cols - 1)) * 100) / 100,
        lat: Math.round((south + ((north - south) * r) / (rows - 1)) * 100) / 100,
      });
    }
  }
  return points;
}

/** Parse ?lat&lng. Returns { lat, lng } rounded to 0.1 degrees (~11 km), or { error }. */
function parseCoords(query) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const missing = query.lat === undefined || query.lng === undefined || query.lat === "" || query.lng === "";
  if (missing || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "lat and lng are required numbers" };
  }
  if (lat < SERVICE_BOUNDS.south || lat > SERVICE_BOUNDS.north || lng < SERVICE_BOUNDS.west || lng > SERVICE_BOUNDS.east) {
    return { error: "This service only covers Namibia" };
  }
  // The forecast models are 0.25 degrees wide at best, so finer is the same data.
  return { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 };
}

function hosts(apiKey) {
  return apiKey ? { forecast: PAID_HOST, flood: PAID_HOST } : { forecast: FREE_HOST, flood: FREE_FLOOD_HOST };
}

function withKey(params, apiKey) {
  if (apiKey) params.set("apikey", apiKey);
  return params;
}

function gridUrl(apiKey) {
  const points = gridPoints();
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lng).join(","),
    hourly: "wind_speed_10m,wind_direction_10m,temperature_2m,precipitation",
    wind_speed_unit: "ms",
    models: grid.model,
    forecast_hours: String(grid.hours),
    timezone: "GMT",
  });
  return `${hosts(apiKey).forecast}/v1/forecast?${withKey(params, apiKey)}`;
}

function pointUrl({ lat, lng }, apiKey) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    daily: "precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration",
    hourly: "soil_moisture_0_to_1cm,soil_temperature_6cm",
    forecast_days: "7",
    timezone: TIMEZONE,
  });
  return `${hosts(apiKey).forecast}/v1/forecast?${withKey(params, apiKey)}`;
}

function floodUrl({ lat, lng }, apiKey) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily: "river_discharge,river_discharge_mean,river_discharge_max",
    forecast_days: "7",
  });
  return `${hosts(apiKey).flood}/v1/flood?${withKey(params, apiKey)}`;
}

// An upstream failure message must never contain the API key.
const redact = (text, apiKey) => (apiKey ? String(text).split(apiKey).join("***") : String(text));

async function getJson(fetchImpl, url, apiKey) {
  let res;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
  } catch (error) {
    throw new Error(redact(`Weather provider unreachable: ${error.message}`, apiKey));
  }
  if (!res.ok) throw new Error(`Weather provider returned ${res.status}`);
  return res.json();
}

/**
 * Open-Meteo repeats the `time` array for every one of the 195 locations. The
 * client only reads the first, so drop the rest to shrink the payload.
 */
function slimGrid(list) {
  return list.map((loc, i) => (i === 0 ? loc : { ...loc, hourly: { ...loc.hourly, time: undefined } }));
}

function register(app, { cache, fetchImpl = globalThis.fetch, apiKey = "", limiter, cacheFile, log = console } = {}) {
  const guard = limiter ? [limiter] : [];

  // ---- national grid ----------------------------------------------------------
  const loadGrid = async () => {
    const data = await getJson(fetchImpl, gridUrl(apiKey), apiKey);
    const arr = Array.isArray(data) ? data : [data];
    const points = gridPoints();
    if (arr.length !== points.length) throw new Error("Weather provider returned an incomplete grid");
    return { model: grid.model, cols: grid.cols, rows: grid.rows, bounds: grid.bounds, points, list: slimGrid(arr) };
  };

  const getGrid = async () => {
    const result = await cache.get("grid", TTL.grid, loadGrid);
    if (result.status === "miss" && cacheFile) {
      fs.promises
        .mkdir(path.dirname(cacheFile), { recursive: true })
        .then(() => fs.promises.writeFile(cacheFile, JSON.stringify({ fetchedAt: result.fetchedAt, value: result.value })))
        .catch(() => {}); // a copy on disk is a bonus, never a requirement
    }
    return result;
  };

  // Restore the last copy after a restart so the first visitor isn't waiting on the provider.
  if (cacheFile) {
    try {
      const saved = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (saved && saved.value && Number.isFinite(saved.fetchedAt)) cache.seed("grid", saved.value, saved.fetchedAt, TTL.grid.ttlMs);
    } catch {
      // no saved copy yet
    }
  }

  const send = (res, result, maxAge, body) => {
    res.set("X-Cache", result.status);
    res.set("X-Fetched-At", new Date(result.fetchedAt).toISOString());
    res.set("Cache-Control", `public, max-age=${maxAge}`);
    res.json(body);
  };
  const fail = (res, error) => {
    log.warn("[weather]", error.message);
    res.status(502).json({ error: "weather_unavailable", message: "Weather data is temporarily unavailable." });
  };

  app.get("/api/weather/grid", ...guard, async (req, res) => {
    try {
      const result = await getGrid();
      send(res, result, 300, { fetchedAt: new Date(result.fetchedAt).toISOString(), ...result.value });
    } catch (error) {
      fail(res, error);
    }
  });

  const pointRoute = (name, ttl, build) =>
    app.get(`/api/weather/${name}`, ...guard, async (req, res) => {
      const coords = parseCoords(req.query);
      if (coords.error) return res.status(400).json({ error: "bad_request", message: coords.error });
      try {
        const result = await cache.get(`${name}:${coords.lat},${coords.lng}`, ttl, () => getJson(fetchImpl, build(coords, apiKey), apiKey));
        send(res, result, 300, result.value);
      } catch (error) {
        fail(res, error);
      }
    });
  pointRoute("point", TTL.point, pointUrl);
  pointRoute("flood", TTL.flood, floodUrl);

  return {
    getGrid,
    /** Keep the grid warm in the background so no visitor ever waits for it. */
    startWarming(intervalMs = 50 * 60 * 1000) {
      const warm = () => getGrid().catch((e) => log.warn("[weather] warm-up failed:", e.message));
      warm();
      const timer = setInterval(warm, intervalMs);
      if (timer.unref) timer.unref();
      return timer;
    },
  };
}

module.exports = { register, gridPoints, parseCoords, gridUrl, pointUrl, floodUrl, slimGrid, redact, TTL, SERVICE_BOUNDS };
