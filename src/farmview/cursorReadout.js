// A small card that follows the pointer over the weather map and shows the
// forecast for the spot underneath: region, temperature, rain and wind.
//
// Mouse: it follows the cursor. Touch: tap a spot to see it there, or touch
// and hold, then slide your finger, to scrub across the map (the map holds
// still while you do).
//
// Everything is read from the national grid that is already loaded, so moving
// around costs no network requests.

import { sampleField } from "./weatherGrid";
import { findRegion, regionLabel } from "./regions";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const HOLD_MS = 350;

/** Where the wind blows FROM, as a compass point, from its u/v parts. */
export function compassFrom(u, v) {
  if (u == null || v == null || (u === 0 && v === 0)) return "";
  const deg = (Math.atan2(-u, -v) * 180) / Math.PI;
  return COMPASS[Math.round(((deg + 360) % 360) / 45) % 8];
}

const fmt = (n, digits = 0) => (n == null || Number.isNaN(n) ? null : n.toFixed(digits));

/** The readout's lines for one spot, or null outside the forecast area. */
export function readoutAt(lng, lat, { grid, hour, regions }) {
  if (!grid) return null;
  const temp = sampleField(grid, grid.temp[hour], lng, lat);
  const rain = sampleField(grid, grid.rain[hour], lng, lat);
  const speed = sampleField(grid, grid.speed[hour], lng, lat);
  if (temp == null && rain == null && speed == null) return null;
  const u = sampleField(grid, grid.u[hour], lng, lat);
  const v = sampleField(grid, grid.v[hour], lng, lat);
  const region = regions ? findRegion(lng, lat, regions) : null;
  return {
    place: region ? regionLabel(region.properties?.name || "") : "Outside Namibia",
    temp: fmt(temp),
    rain: fmt(rain, 1),
    wind: fmt(speed, 1),
    from: compassFrom(u, v),
    coords: `${Math.abs(lat).toFixed(2)}°${lat < 0 ? "S" : "N"} ${Math.abs(lng).toFixed(2)}°${lng < 0 ? "W" : "E"}`,
  };
}

function render(el, r) {
  // textContent only: nothing here is HTML
  el.replaceChildren();
  const add = (cls, text) => {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    el.appendChild(span);
  };
  add("fv-hover-place", r.place);
  if (r.temp != null) add("fv-hover-row", `🌡 ${r.temp} °C`);
  if (r.rain != null) add("fv-hover-row", `🌧 ${r.rain} mm/h`);
  if (r.wind != null) add("fv-hover-row", `💨 ${r.wind} m/s${r.from ? ` from ${r.from}` : ""}`);
  add("fv-hover-coords", r.coords);
}

/**
 * Attaches the readout to a MapLibre map. getData() returns the current
 * { grid, hour, regions, enabled }. Returns a function that removes it.
 */
export function attachReadout(map, getData) {
  const container = map.getContainer();
  const el = document.createElement("div");
  el.className = "fv-hover";
  el.setAttribute("aria-hidden", "true"); // the side panel gives the same facts accessibly
  el.hidden = true;
  container.appendChild(el);

  const show = (point, lngLat) => {
    const data = getData();
    const r = data.enabled === false ? null : readoutAt(lngLat.lng, lngLat.lat, data);
    if (!r) {
      el.hidden = true;
      return;
    }
    render(el, r);
    el.hidden = false;
    // keep the card inside the map: flip to the left/up near the edges
    const pad = 14;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = point.x + pad + w > container.clientWidth ? point.x - pad - w : point.x + pad;
    const y = point.y + pad + h > container.clientHeight ? point.y - pad - h : point.y + pad;
    el.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
  };
  const hide = () => {
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

  // a tap (phone) or click shows the card at that spot and leaves it there
  const onClick = (e) => show(e.point, e.lngLat);
  map.on("click", onClick);
  map.on("movestart", (e) => {
    if (!scrubbing && e.originalEvent) hide();
  });

  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(holdTimer);
    map.off("mousemove", onMove);
    map.off("mouseout", hide);
    map.off("touchstart", onTouchStart);
    map.off("touchmove", onTouchMove);
    map.off("touchend", onTouchEnd);
    map.off("touchcancel", onTouchEnd);
    map.off("click", onClick);
    el.remove();
  };
}
