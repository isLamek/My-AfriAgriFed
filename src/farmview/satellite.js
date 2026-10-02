// Live Meteosat imagery from EUMETSAT's EUMETView map service (observations,
// not forecasts). Each layer advertises its time range; we read the newest
// timestamp from that small capabilities file and then ask for tiles at a
// given frame time. Imagery is © EUMETSAT: free for non-commercial use, but a
// commercial launch needs EUMETSAT's authorisation (docs/LAUNCH_CHECKLIST.md).

import { TTL } from "./config";

const BASE = "https://view.eumetsat.int/geoserver";
const cache = new Map(); // layerKey -> { value, expires }

const MINUTE = 60 * 1000;

function parseIsoDuration(text) {
  // Only the minute/hour forms EUMETView uses: PT5M, PT10M, PT15M, PT1H.
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(text || "");
  if (!m) return null;
  return ((Number(m[1]) || 0) * 60 + (Number(m[2]) || 0)) * MINUTE;
}

/**
 * Newest frame time and step from a WMS capabilities document. The time
 * dimension looks like "2020-09-01T00:00:00.000Z/2026-10-02T10:45:00.000Z/PT15M"
 * (sometimes several comma-separated ranges; the last one is the current one).
 */
export function parseTimeExtent(xml) {
  const dim = /<Dimension[^>]*name="time"[^>]*>([^<]*)<\/Dimension>/.exec(xml);
  if (!dim) return null;
  const ranges = dim[1].trim().split(",");
  const [start, end, period] = ranges[ranges.length - 1].trim().split("/");
  const endMs = new Date(end || start).getTime();
  const stepMs = parseIsoDuration(period);
  if (!Number.isFinite(endMs)) return null;
  return { latest: endMs, stepMs: stepMs || 15 * MINUTE };
}

/** The last `count` frame times (ms), oldest first, ending at the newest. */
export function frameTimes({ latest, stepMs }, count = 12) {
  return Array.from({ length: count }, (_, i) => latest - (count - 1 - i) * stepMs);
}

export async function fetchSatelliteTimes(layerDef) {
  const key = `${layerDef.workspace}:${layerDef.layer}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const url = `${BASE}/${layerDef.workspace}/${layerDef.layer}/ows?service=WMS&version=1.3.0&request=GetCapabilities`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Satellite service returned ${res.status}`);
  const extent = parseTimeExtent(await res.text());
  if (!extent) throw new Error("Satellite layer has no time information");
  cache.set(key, { value: extent, expires: Date.now() + TTL.satelliteTimes });
  return extent;
}

/** MapLibre raster tile template for one frame. */
export function satelliteTileUrl(layerDef, timeMs) {
  const time = new Date(timeMs).toISOString();
  return (
    `${BASE}/ows?service=WMS&version=1.3.0&request=GetMap` +
    `&layers=${layerDef.workspace}:${layerDef.layer}&styles=&format=image/png&transparent=true` +
    `&crs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}&time=${encodeURIComponent(time)}`
  );
}
