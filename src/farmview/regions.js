// Namibia's 14 regions (2013 delimitation: Zambezi replaced Caprivi, Kavango
// split into East and West). Boundaries come from OpenStreetMap relations,
// checked against the official areas in the 2023 census table: every region
// is within 0.5% except Zambezi (-1.9%), and 18 well-known towns all fall in
// the right region. See docs/DATA_SOURCES.md.
//
// Pure functions - no DOM, no network - so they can be unit tested.

export const REGIONS_URL = "/data/namibia-regions.geojson";

// Display names: the data file uses plain ASCII for ǁKaras.
const DISPLAY = { Karas: "ǁKaras" };
export const regionLabel = (name) => DISPLAY[name] || name;

const polygonsOf = (geometry) => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates);

function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(lng, lat, geometry) {
  return polygonsOf(geometry).some(
    (poly) => inRing(lng, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lng, lat, hole))
  );
}

/** Which region contains this point? Returns the feature, or null if outside Namibia. */
export function findRegion(lng, lat, collection) {
  return (collection?.features || []).find((f) => pointInGeometry(lng, lat, f.geometry)) || null;
}

// Distance from a point to the nearest ring vertex, in degrees (cheap proxy
// for "how far inside"): good enough to choose a label position.
function nearestVertexDistance(lng, lat, rings) {
  let best = Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      const d = (x - lng) * (x - lng) + (y - lat) * (y - lat);
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}

/**
 * A good spot to put a region's name: inside the polygon and as far from its
 * edge as we can cheaply find (a centroid can land outside odd shapes such as
 * Zambezi's strip or Oshana's tail).
 */
export function labelPoint(geometry, samples = 30) {
  const polys = polygonsOf(geometry);
  // Use the largest part so an island or exclave cannot win.
  const area = (ring) => {
    let a = 0;
    for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    return Math.abs(a / 2);
  };
  const main = polys.reduce((best, p) => (area(p[0]) > area(best[0]) ? p : best), polys[0]);
  const xs = main[0].map((p) => p[0]);
  const ys = main[0].map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];

  let best = null;
  let bestDist = -1;
  for (let i = 0; i <= samples; i++) {
    for (let j = 0; j <= samples; j++) {
      const lng = minX + ((maxX - minX) * i) / samples;
      const lat = minY + ((maxY - minY) * j) / samples;
      if (!inRing(lng, lat, main[0]) || main.slice(1).some((h) => inRing(lng, lat, h))) continue;
      const d = nearestVertexDistance(lng, lat, [main[0]]);
      if (d > bestDist) {
        bestDist = d;
        best = [lng, lat];
      }
    }
  }
  return best || [(minX + maxX) / 2, (minY + maxY) / 2];
}

/** Spherical polygon area in km2, accurate at any latitude. */
export function areaKm2(geometry) {
  const R = 6371.0088;
  const rad = Math.PI / 180;
  let total = 0;
  for (const poly of polygonsOf(geometry)) {
    poly.forEach((ring, idx) => {
      let a = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[i + 1];
        a += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
      }
      total += (idx === 0 ? 1 : -1) * Math.abs((a * R * R) / 2);
    });
  }
  return total;
}
