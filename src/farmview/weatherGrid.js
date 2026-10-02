// National forecast grid: wind, temperature and rain for all of Namibia from
// ONE Open-Meteo request, using the ECMWF IFS 0.25° model so the source can be
// named exactly. Values are model forecasts, not measurements.
//
// The grid is fetched through server.js (ONE Open-Meteo request an hour for every
// visitor, commercial key kept private). If the backend can't be reached we ask
// Open-Meteo directly so the map still works.

import { GRID, TTL } from "./config";
import { directFallbackAllowed, serverConfigured, serverJson } from "./serverApi";

const STORAGE_KEY = "aaf_fv:grid:v2";
let inflight = null;
let memory = null;

const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

export function gridPoints({ cols, rows, bounds: [west, south, east, north] } = GRID) {
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

// Open-Meteo gives wind as speed and the direction it blows FROM. Convert to
// the eastward (u) and northward (v) components that the animation needs.
export function windComponents(speed, directionFrom) {
  const rad = (directionFrom * Math.PI) / 180;
  return { u: -speed * Math.sin(rad), v: -speed * Math.cos(rad) };
}

/** Turn the raw API list into compact per-hour arrays. Pure, so it is tested. */
export function buildGrid(list, config = GRID) {
  const n = list.length;
  const hours = list[0].hourly.time.length;
  const make = () => Array.from({ length: hours }, () => new Array(n).fill(null));
  const grid = { ...config, model: "ECMWF IFS 0.25°", times: list[0].hourly.time.map((t) => `${t}:00Z`), u: make(), v: make(), speed: make(), temp: make(), rain: make() };

  list.forEach((loc, i) => {
    for (let t = 0; t < hours; t++) {
      const speed = loc.hourly.wind_speed_10m[t];
      const dir = loc.hourly.wind_direction_10m[t];
      grid.speed[t][i] = round1(speed);
      grid.temp[t][i] = round1(loc.hourly.temperature_2m[t]);
      grid.rain[t][i] = round1(loc.hourly.precipitation[t]);
      if (speed != null && dir != null) {
        const { u, v } = windComponents(speed, dir);
        grid.u[t][i] = round1(u);
        grid.v[t][i] = round1(v);
      }
    }
  });
  return grid;
}

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return raw && raw.expires > Date.now() ? raw : null;
  } catch {
    return null;
  }
}

// The backend returns { list, ... }; Open-Meteo itself returns the list directly.
async function loadRawGrid(points) {
  if (serverConfigured()) {
    try {
      return await serverJson("/api/weather/grid", { timeoutMs: 30000 });
    } catch (error) {
      if (!directFallbackAllowed()) throw error;
    }
  }
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(","),
    longitude: points.map((p) => p.lng).join(","),
    hourly: "wind_speed_10m,wind_direction_10m,temperature_2m,precipitation",
    wind_speed_unit: "ms",
    models: GRID.model,
    forecast_hours: String(GRID.hours),
    timezone: "GMT",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  return res.json();
}

export async function fetchNationalGrid() {
  if (memory && memory.expires > Date.now()) return memory.grid;
  const stored = readStored();
  if (stored) {
    memory = stored;
    return stored.grid;
  }
  if (inflight) return inflight;

  const points = gridPoints();
  inflight = loadRawGrid(points)
    .then((json) => {
      const list = Array.isArray(json) ? json : json.list;
      if (list.length !== points.length) throw new Error("Weather service returned an incomplete grid");
      const grid = buildGrid(list);
      memory = { grid, expires: Date.now() + TTL.grid };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
      } catch {
        // storage full or blocked: the in-memory copy still works
      }
      return grid;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Index of the forecast hour closest to `now` (the series starts at the current hour). */
export function nowIndex(times, now = Date.now()) {
  let best = 0;
  let gap = Infinity;
  times.forEach((t, i) => {
    const d = Math.abs(new Date(t).getTime() - now);
    if (d < gap) {
      gap = d;
      best = i;
    }
  });
  return best;
}

/**
 * Smoothly interpolated value at (lng, lat) from one hour's grid values.
 * Returns null outside the grid or where data is missing.
 */
export function sampleField(grid, values, lng, lat) {
  const [west, south, east, north] = grid.bounds;
  if (lng < west || lng > east || lat < south || lat > north) return null;
  const fx = ((lng - west) / (east - west)) * (grid.cols - 1);
  const fy = ((lat - south) / (north - south)) * (grid.rows - 1);
  const x0 = Math.min(Math.floor(fx), grid.cols - 2);
  const y0 = Math.min(Math.floor(fy), grid.rows - 2);
  // Cosine easing hides the square look of plain bilinear interpolation.
  const ease = (t) => (1 - Math.cos(t * Math.PI)) / 2;
  const tx = ease(fx - x0);
  const ty = ease(fy - y0);
  const at = (x, y) => values[y * grid.cols + x];
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  if (a == null || b == null || c == null || d == null) return null;
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
