// Keyless data sources for FarmView (browser-side, CORS-enabled):
//   - Open-Meteo forecast + soil   https://open-meteo.com
//   - Open-Meteo flood (GloFAS)    https://open-meteo.com/en/docs/flood-api
//   - NASA POWER climatology       https://power.larc.nasa.gov
//
// Open-Meteo's free tier is for non-commercial use, so the forecast and flood
// calls go through server.js first (cached, commercial key kept private) and
// only fall back to the public API if the backend can't be reached.
// NASA POWER is public domain and is always called directly.

import { TIMEZONE, TTL } from "./config";
import { directFallbackAllowed, serverConfigured, serverJson } from "./serverApi";

const memory = new Map(); // key -> { value, expires }
const inflight = new Map(); // key -> Promise (de-duplicates identical requests)
const STORAGE_PREFIX = "aaf_fv:";

function readStored(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry && entry.expires > Date.now() ? entry : null;
  } catch {
    return null;
  }
}

function writeStored(key, entry) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // storage full or disabled - the in-memory cache still works
  }
}

async function plainJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data request failed (${res.status})`);
  return res.json();
}

// Ask the backend first; if it is down (or not set up) use the public API.
// A 4xx from the backend is a real answer (bad request), so it is not retried.
async function viaServer(serverPath, directUrl) {
  if (!serverPath || !serverConfigured()) return plainJson(directUrl);
  try {
    return await serverJson(serverPath);
  } catch (error) {
    const clientError = error.status >= 400 && error.status < 500 && error.status !== 429;
    if (clientError || !directFallbackAllowed()) throw error;
    return plainJson(directUrl);
  }
}

// Fetch JSON with a TTL cache and request de-duplication.
async function cachedJson(key, url, ttl, serverPath) {
  const hit = memory.get(key) || readStored(key);
  if (hit && hit.expires > Date.now()) {
    memory.set(key, hit);
    return hit.value;
  }
  if (inflight.has(key)) return inflight.get(key);

  const request = viaServer(serverPath, url)
    .then((value) => {
      const entry = { value, expires: Date.now() + ttl };
      memory.set(key, entry);
      writeStored(key, entry);
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}

// Round to ~1 km so nearby taps share one cached response.
const r2 = (n) => Math.round(n * 100) / 100;

// ---- Point forecast: current conditions, 7-day outlook, topsoil ----------
export function fetchPointWeather(lat, lng) {
  const la = r2(lat);
  const ln = r2(lng);
  const params = new URLSearchParams({
    latitude: la,
    longitude: ln,
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    daily: "precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration",
    hourly: "soil_moisture_0_to_1cm,soil_temperature_6cm,precipitation,precipitation_probability",
    wind_speed_unit: "ms",
    forecast_days: "7",
    timezone: TIMEZONE,
  });
  return cachedJson(
    `pt2:${la},${ln}`, // v2: adds wind and hourly rain (older cached answers lack them)
    `https://api.open-meteo.com/v1/forecast?${params}`,
    TTL.forecast,
    `/api/weather/point?lat=${la}&lng=${ln}`
  ).then(summarisePointWeather);
}

function summarisePointWeather(data) {
  const hourlySoil = data.hourly?.soil_moisture_0_to_1cm || [];
  const soilNow = latestNumber(hourlySoil, data.hourly?.time);
  return {
    current: data.current,
    now: summariseSpot(data), // the same "now" numbers as the map readout
    days: (data.daily?.time || []).map((date, i) => ({
      date,
      rainMm: data.daily.precipitation_sum[i],
      maxC: data.daily.temperature_2m_max[i],
      minC: data.daily.temperature_2m_min[i],
      et0Mm: data.daily.et0_fao_evapotranspiration[i],
    })),
    soilMoisturePct: soilNow == null ? null : Math.round(soilNow * 1000) / 10,
  };
}

// Pick the hourly value closest to "now" (the series starts at midnight).
function latestNumber(values, times) {
  if (!values.length) return null;
  const now = Date.now();
  let best = null;
  let bestGap = Infinity;
  values.forEach((v, i) => {
    if (typeof v !== "number") return;
    const gap = Math.abs(new Date(times?.[i]).getTime() - now);
    if (gap < bestGap) {
      bestGap = gap;
      best = v;
    }
  });
  return best;
}

// ---- 30-year climate normals (monthly mm/day, °C, MJ/m²/day) -------------
export async function fetchClimate(lat, lng) {
  const la = r2(lat);
  const ln = r2(lng);
  const params = new URLSearchParams({
    parameters: "PRECTOTCORR,T2M,ALLSKY_SFC_SW_DWN",
    community: "AG",
    longitude: ln,
    latitude: la,
    format: "JSON",
  });
  const data = await cachedJson(
    `clim:${la},${ln}`,
    `https://power.larc.nasa.gov/api/temporal/climatology/point?${params}`,
    TTL.climate
  );
  const p = data.properties?.parameter || {};
  return { prectotcorr: p.PRECTOTCORR, t2m: p.T2M, solar: p.ALLSKY_SFC_SW_DWN };
}

// ---- River flood outlook --------------------------------------------------
// Oshana's iishana flood in the rainy season; discharge well above the
// seasonal mean is the signal worth surfacing.
export async function fetchFlood(lat, lng) {
  const la = r2(lat);
  const ln = r2(lng);
  const params = new URLSearchParams({
    latitude: la,
    longitude: ln,
    daily: "river_discharge,river_discharge_mean,river_discharge_max",
    forecast_days: "7",
  });
  const data = await cachedJson(
    `flood:${la},${ln}`,
    `https://flood-api.open-meteo.com/v1/flood?${params}`,
    TTL.flood,
    `/api/weather/flood?lat=${la}&lng=${ln}`
  );
  const d = data.daily || {};
  const mean = d.river_discharge_mean || [];
  const flow = d.river_discharge || [];
  const peakRatio = Math.max(
    0,
    ...flow.map((v, i) => (typeof v === "number" && mean[i] > 0 ? v / mean[i] : 0))
  );
  const level = peakRatio >= 3 ? "high" : peakRatio >= 1.5 ? "elevated" : "normal";
  return { level, peakRatio: Math.round(peakRatio * 10) / 10, days: d.time || [], flow };
}

// ---- Exact-spot conditions for the map readout ------------------------------
// Open-Meteo's forecast for one spot: its best model for the area, corrected
// for the spot's altitude, with "current" values updated every 15 minutes.
// Far more accurate than reading between the national grid's points (about
// 100 km apart). Cached per ~1 km cell for 10 minutes, so moving around a
// little costs nothing.
const SPOT_TTL = 10 * 60 * 1000;
const spotCache = new Map(); // cell -> { value, expires }
const spotInflight = new Map();
// 0.01° ≈ 1 km; toFixed avoids float edges (18.13 * 100 = 1812.9999...)
const cell = (n) => Number(n.toFixed(2));

export function spotKey(lat, lng) {
  return `${cell(lat)},${cell(lng)}`;
}

export function summariseSpot(data) {
  const c = data.current || {};
  // times come without a zone; utc_offset_seconds says which (0 for GMT requests)
  const offset = (data.utc_offset_seconds || 0) * 1000;
  const toMs = (t) => Date.parse(t.endsWith("Z") ? t : `${t}Z`) - offset;
  // chance of rain over the next 3 hours: the highest hourly chance
  const times = data.hourly?.time || [];
  const chances = data.hourly?.precipitation_probability || [];
  const amounts = data.hourly?.precipitation || [];
  const nowMs = Date.now();
  let next3 = null;
  let lastHour = null; // the hourly total for the hour that ended most recently
  let lastHourAt = -Infinity;
  times.forEach((t, i) => {
    const ms = toMs(t);
    if (ms > nowMs && ms <= nowMs + 3 * 3600000 && typeof chances[i] === "number") next3 = Math.max(next3 ?? 0, chances[i]);
    if (ms <= nowMs && ms > lastHourAt && typeof amounts[i] === "number") {
      lastHour = amounts[i];
      lastHourAt = ms;
    }
  });
  return {
    at: c.time ? toMs(c.time) : nowMs,
    temp: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    rainLastHourMm: lastHour ?? (typeof c.precipitation === "number" ? c.precipitation : null),
    windMs: c.wind_speed_10m,
    windFrom: c.wind_direction_10m,
    gustMs: c.wind_gusts_10m,
    rainChance3h: next3,
    elevation: data.elevation,
  };
}

/** Exact-spot "now" for several places in one request (used by the no-map list). */
export async function fetchSpotsNow(places) {
  const params = new URLSearchParams({
    latitude: places.map((p) => p.lat).join(","),
    longitude: places.map((p) => p.lng).join(","),
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly: "precipitation_probability,precipitation",
    forecast_hours: "4",
    past_hours: "1",
    wind_speed_unit: "ms",
    timezone: "GMT",
  });
  const data = await plainJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  return (Array.isArray(data) ? data : [data]).map(summariseSpot);
}

export function fetchSpotNow(lat, lng) {
  const key = spotKey(lat, lng);
  const hit = spotCache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
  if (spotInflight.has(key)) return spotInflight.get(key);
  const [la, ln] = key.split(",");
  const params = new URLSearchParams({
    latitude: la,
    longitude: ln,
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly: "precipitation_probability,precipitation",
    forecast_hours: "4",
    past_hours: "1",
    wind_speed_unit: "ms",
    timezone: "GMT",
  });
  const request = plainJson(`https://api.open-meteo.com/v1/forecast?${params}`)
    .then((data) => {
      const value = summariseSpot(data);
      spotCache.set(key, { value, expires: Date.now() + SPOT_TTL });
      return value;
    })
    .finally(() => spotInflight.delete(key));
  spotInflight.set(key, request);
  return request;
}
