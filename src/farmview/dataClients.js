// Keyless data sources for FarmView (browser-side, CORS-enabled):
//   - Open-Meteo forecast + soil   https://open-meteo.com
//   - Open-Meteo flood (GloFAS)    https://open-meteo.com/en/docs/flood-api
//   - NASA POWER climatology       https://power.larc.nasa.gov
//
// Open-Meteo's free tier is for non-commercial use. Before AfriAgriFed
// launches commercially, route these calls through server.js with an
// OPEN_METEO_API_KEY (see docs/FARMVIEW_PLAN.md).

import { TIMEZONE, TTL } from "./config";

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

// Fetch JSON with a TTL cache and request de-duplication.
async function cachedJson(key, url, ttl) {
  const hit = memory.get(key) || readStored(key);
  if (hit && hit.expires > Date.now()) {
    memory.set(key, hit);
    return hit.value;
  }
  if (inflight.has(key)) return inflight.get(key);

  const request = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Data request failed (${res.status})`);
      return res.json();
    })
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
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    daily: "precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration",
    hourly: "soil_moisture_0_to_1cm,soil_temperature_6cm",
    forecast_days: "7",
    timezone: TIMEZONE,
  });
  return cachedJson(`pt:${la},${ln}`, `https://api.open-meteo.com/v1/forecast?${params}`, TTL.forecast).then(
    summarisePointWeather
  );
}

function summarisePointWeather(data) {
  const hourlySoil = data.hourly?.soil_moisture_0_to_1cm || [];
  const soilNow = latestNumber(hourlySoil, data.hourly?.time);
  return {
    current: data.current,
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
  const data = await cachedJson(`flood:${la},${ln}`, `https://flood-api.open-meteo.com/v1/flood?${params}`, TTL.flood);
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
