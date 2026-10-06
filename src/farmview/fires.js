// Fire hotspots (NASA FIRMS via server.js). A hotspot is a satellite detection
// of heat, not a confirmed fire; satellites pass a few times a day, so a map
// with no dots does not prove there is no fire. The wording in the UI says so.

import { serverJson } from "./serverApi";

const EARTH_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;

export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Hours since the satellite saw it. `date` is YYYY-MM-DD and `time` HH:MM, both UTC. */
export function ageHours(fire, now = Date.now()) {
  const t = Date.parse(`${fire.date}T${fire.time}:00Z`);
  return Number.isFinite(t) ? Math.max(0, (now - t) / 3600000) : null;
}

/** Fires within `km` of a point and no older than `hours`, nearest first. */
export function firesNear(point, fires, { km = 25, hours = 48, now = Date.now() } = {}) {
  const found = [];
  for (const fire of fires || []) {
    const age = ageHours(fire, now);
    if (age == null || age > hours) continue;
    const d = distanceKm(point, fire);
    if (d <= km) found.push({ ...fire, distanceKm: Math.round(d * 10) / 10, ageHours: Math.round(age * 10) / 10 });
  }
  found.sort((a, b) => a.distanceKm - b.distanceKm);
  return { count: found.length, nearest: found[0] || null, fires: found };
}

/** "close" within 10 km, "near" within 25 km, otherwise "none". */
export function fireLevel(near) {
  if (!near.nearest) return "none";
  return near.nearest.distanceKm <= 10 ? "close" : "near";
}

export function describeAge(hours) {
  if (hours == null) return "unknown time";
  if (hours < 1) return "under an hour ago";
  if (hours < 24) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? "" : "s"} ago`;
}

/** GeoJSON for the map layer; each point carries its age band so the style can colour it. */
export function toGeoJson(fires, now = Date.now()) {
  return {
    type: "FeatureCollection",
    features: (fires || [])
      .map((f) => ({ f, age: ageHours(f, now) }))
      .filter(({ age }) => age != null)
      .map(({ f, age }) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [f.lng, f.lat] },
        properties: { age: Math.round(age * 10) / 10, band: age < 6 ? "fresh" : age < 24 ? "today" : "older", frp: f.frp, confidence: f.confidence },
      })),
  };
}

let cached = null; // { value, expires }
const CACHE_MS = 10 * 60 * 1000;

/** { fires, fetchedAt, source }. Throws a ServerApiError (code "fires_not_configured" when switched off). */
export async function fetchFires() {
  if (cached && cached.expires > Date.now()) return cached.value;
  const value = await serverJson("/api/fires", { timeoutMs: 30000 });
  cached = { value, expires: Date.now() + CACHE_MS };
  return value;
}
