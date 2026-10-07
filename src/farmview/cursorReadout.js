// A small card that follows the pointer over the weather map and shows the
// weather for the spot underneath.
//
// Two steps, so it is both quick and accurate:
//   1. While the pointer moves: an area estimate read from the national grid
//      that is already loaded (points about 100 km apart), marked "≈".
//   2. When the pointer rests (or on a tap): Open-Meteo's forecast for that
//      exact spot, corrected for its altitude and updated every 15 minutes.
//
// Mouse: it follows the cursor. Touch: tap a spot, or touch and hold, then
// slide your finger (the map holds still while you do).

import { sampleField } from "./weatherGrid";
import { findRegion, regionLabel } from "./regions";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const HOLD_MS = 350;
const REST_MS = 300; // pointer still this long: fetch the exact spot

/** Compass point for a direction in degrees (where the wind blows FROM). */
export function compassPoint(deg) {
  if (deg == null || Number.isNaN(deg)) return "";
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** Where the wind blows FROM, as a compass point, from its u/v parts. */
export function compassFrom(u, v) {
  if (u == null || v == null || (u === 0 && v === 0)) return "";
  return compassPoint((Math.atan2(-u, -v) * 180) / Math.PI);
}

const fmt = (n, digits = 0) => (n == null || Number.isNaN(n) ? null : Number(n).toFixed(digits));
const coordsText = (lat, lng) =>
  `${Math.abs(lat).toFixed(2)}°${lat < 0 ? "S" : "N"} ${Math.abs(lng).toFixed(2)}°${lng < 0 ? "W" : "E"}`;
const placeAt = (lng, lat, regions) => {
  const region = regions ? findRegion(lng, lat, regions) : null;
  return region ? regionLabel(region.properties?.name || "") : "Outside Namibia";
};

/** Step 1: the area estimate from the grid, or null outside the forecast area. */
export function readoutAt(lng, lat, { grid, hour, regions }) {
  if (!grid) return null;
  const temp = sampleField(grid, grid.temp[hour], lng, lat);
  const rain = sampleField(grid, grid.rain[hour], lng, lat);
  const speed = sampleField(grid, grid.speed[hour], lng, lat);
  if (temp == null && rain == null && speed == null) return null;
  const u = sampleField(grid, grid.u[hour], lng, lat);
  const v = sampleField(grid, grid.v[hour], lng, lat);
  return {
    exact: false,
    place: placeAt(lng, lat, regions),
    temp: fmt(temp),
    rain: fmt(rain, 1),
    wind: fmt(speed, 1),
    from: compassFrom(u, v),
    coords: coordsText(lat, lng),
  };
}

/** Step 2: the exact-spot forecast (see dataClients.fetchSpotNow). */
export function spotReadout(lng, lat, spot, regions) {
  return {
    exact: true,
    place: placeAt(lng, lat, regions),
    temp: fmt(spot.temp, 1),
    humidity: fmt(spot.humidity),
    rain: fmt(spot.rainLastHourMm, 1),
    rainChance: fmt(spot.rainChance3h),
    wind: fmt(spot.windMs, 1),
    gust: fmt(spot.gustMs, 1),
    from: compassPoint(spot.windFrom),
    elevation: spot.elevation,
    at: spot.at,
    coords: coordsText(lat, lng),
  };
}

function render(el, r) {
  // textContent only: nothing here is HTML
  el.replaceChildren();
  el.classList.toggle("exact", r.exact);
  const add = (cls, text) => {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    el.appendChild(span);
  };
  add("fv-hover-place", r.place);
  if (r.exact) {
    if (r.temp != null) add("fv-hover-row", `🌡 ${r.temp} °C${r.humidity != null ? ` · humidity ${r.humidity}%` : ""}`);
    if (r.rain != null) add("fv-hover-row", `🌧 ${r.rain} mm in the past hour`);
    if (r.rainChance != null) add("fv-hover-row", `☔ ${r.rainChance}% chance of rain, next 3 h`);
    if (r.wind != null) add("fv-hover-row", `💨 ${r.wind} m/s${r.from ? ` from ${r.from}` : ""}${r.gust != null ? `, gusts ${r.gust}` : ""}`);
    const time = r.at ? new Date(r.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Windhoek" }) : "";
    add("fv-hover-note", `This spot${r.elevation != null ? `, ${Math.round(r.elevation)} m up` : ""}${time ? ` · as of ${time}` : ""}`);
  } else {
    if (r.temp != null) add("fv-hover-row", `🌡 ≈ ${r.temp} °C`);
    if (r.rain != null) add("fv-hover-row", `🌧 ≈ ${r.rain} mm/h`);
    if (r.wind != null) add("fv-hover-row", `💨 ≈ ${r.wind} m/s${r.from ? ` from ${r.from}` : ""}`);
    add("fv-hover-note", "Area estimate · rest here for this exact spot");
  }
  add("fv-hover-coords", r.coords);
}

/**
 * Attaches the readout to a MapLibre map. getData() returns the current
 * { grid, hour, regions }; fetchSpot(lat, lng) resolves to the exact-spot
 * forecast. Returns a function that removes it.
 */
export function attachReadout(map, getData, fetchSpot) {
  const container = map.getContainer();
  const el = document.createElement("div");
  el.className = "fv-hover";
  el.setAttribute("aria-hidden", "true"); // the side panel gives the same facts accessibly
  el.hidden = true;
  container.appendChild(el);

  let lastPoint = null;
  let token = 0; // which spot the card is showing (stale answers are dropped)
  let restTimer = null;

  const place = (point) => {
    const pad = 14;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = point.x + pad + w > container.clientWidth ? point.x - pad - w : point.x + pad;
    const y = point.y + pad + h > container.clientHeight ? point.y - pad - h : point.y + pad;
    el.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
  };

  const loadSpot = (lngLat, myToken) => {
    if (!fetchSpot) return;
    el.classList.add("loading");
    fetchSpot(lngLat.lat, lngLat.lng)
      .then((spot) => {
        if (myToken !== token || el.hidden) return;
        render(el, spotReadout(lngLat.lng, lngLat.lat, spot, getData().regions));
        if (lastPoint) place(lastPoint);
      })
      .catch(() => {
        // keep the area estimate; say why the exact value is missing
        if (myToken !== token || el.hidden) return;
        const note = el.querySelector(".fv-hover-note");
        if (note) note.textContent = "Area estimate · the exact forecast couldn't load";
      })
      .finally(() => el.classList.remove("loading"));
  };

  // immediate: true for taps (fetch the exact spot straight away)
  const show = (point, lngLat, { immediate = false } = {}) => {
    const r = readoutAt(lngLat.lng, lngLat.lat, getData());
    clearTimeout(restTimer);
    token += 1;
    if (!r) {
      el.hidden = true;
      return;
    }
    render(el, r);
    el.hidden = false;
    lastPoint = point;
    place(point);
    const myToken = token;
    if (immediate) loadSpot(lngLat, myToken);
    else restTimer = setTimeout(() => loadSpot(lngLat, myToken), REST_MS);
  };
  const hide = () => {
    clearTimeout(restTimer);
    token += 1;
    el.hidden = true;
  };

  // ---- mouse ----
  let frame = 0;
  const onMove = (e) => {
    if (e.originalEvent?.pointerType === "touch" || e.originalEvent?.sourceCapabilities?.firesTouchEvents) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => show(e.point, e.lngLat));
  };
  map.on("mousemove", onMove);
  map.on("mouseout", hide);

  // ---- touch ----
  let holdTimer = null;
  let scrubbing = false;
  const onTouchStart = (e) => {
    if (e.originalEvent.touches.length !== 1) return;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      scrubbing = true;
      map.dragPan.disable();
      show(e.point, e.lngLat);
    }, HOLD_MS);
  };
  const onTouchMove = (e) => {
    if (scrubbing) {
      e.preventDefault();
      show(e.point, e.lngLat);
    } else {
      clearTimeout(holdTimer); // a normal pan
      hide();
    }
  };
  const onTouchEnd = () => {
    clearTimeout(holdTimer);
    if (scrubbing) {
      scrubbing = false;
      map.dragPan.enable();
    }
  };
  map.on("touchstart", onTouchStart);
  map.on("touchmove", onTouchMove);
  map.on("touchend", onTouchEnd);
  map.on("touchcancel", onTouchEnd);

  // a tap (phone) or click: show that spot and fetch it straight away
  const onClick = (e) => show(e.point, e.lngLat, { immediate: true });
  map.on("click", onClick);
  const onMoveStart = (e) => {
    if (!scrubbing && e.originalEvent) hide();
  };
  map.on("movestart", onMoveStart);

  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(holdTimer);
    clearTimeout(restTimer);
    map.off("mousemove", onMove);
    map.off("mouseout", hide);
    map.off("touchstart", onTouchStart);
    map.off("touchmove", onTouchMove);
    map.off("touchend", onTouchEnd);
    map.off("touchcancel", onTouchEnd);
    map.off("click", onClick);
    map.off("movestart", onMoveStart);
    el.remove();
  };
}
