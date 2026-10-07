// Where a listing or a Demand Board request is, for the Market Map.
//
// Stored on the post as location: { lat, lng, label, region }. A spot from
// the phone's GPS is rounded to 2 decimals (about 1 km) before it is saved,
// so a pin shows the area, never someone's exact farm gate or house.

import { NAMIBIA_BOUNDS, TOWNS } from "./farmview/config";

export const LABEL_MAX = 60;

export const round2 = (n) => Math.round(n * 100) / 100;

export function inNamibia(lat, lng) {
  const [west, south, east, north] = NAMIBIA_BOUNDS;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/** The closest known town, for labelling a GPS spot ("Near Oshakati"). */
export function nearestTown(lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const t of TOWNS) {
    const d = (t.lat - lat) ** 2 + ((t.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

export const TOWN_CHOICES = [...TOWNS].sort((a, b) => a.name.localeCompare(b.name));

export function locationFromTown(name) {
  const town = TOWNS.find((t) => t.name === name);
  return town ? { lat: town.lat, lng: town.lng, label: town.name, region: town.region } : null;
}

export function locationFromGps(lat, lng) {
  if (!inNamibia(lat, lng)) return null;
  const town = nearestTown(lat, lng);
  return { lat: round2(lat), lng: round2(lng), label: town ? `Near ${town.name}` : "Namibia", region: town?.region || "" };
}

/** Safe to save? (the database rules check the same things) */
export function validLocation(loc) {
  if (loc == null) return true;
  return (
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    inNamibia(loc.lat, loc.lng) &&
    typeof loc.label === "string" &&
    loc.label.length > 0 &&
    loc.label.length <= LABEL_MAX &&
    typeof (loc.region ?? "") === "string" &&
    (loc.region ?? "").length <= 40
  );
}

/** Asks the browser for the current spot; resolves to a rounded location. */
export function currentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser can't share your location. Pick a town instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = locationFromGps(coords.latitude, coords.longitude);
        if (loc) resolve(loc);
        else reject(new Error("You seem to be outside Namibia. Pick a town instead."));
      },
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Location is blocked for this site. Allow it in your browser, or pick a town."
              : "Your location couldn't be found. Pick a town instead."
          )
        ),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  });
}
