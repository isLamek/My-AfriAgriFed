// Draws a forecast field (rain, temperature, wind speed) as a smooth image to
// lay over the map. The grid is only 15 x 13 points, so the image samples it
// with eased interpolation per pixel, in Web Mercator rows so it lines up with
// the map exactly. Pixels outside Namibia are clipped away.

import { sampleField } from "./weatherGrid";

// Colour ramps: [value, [r, g, b, alpha 0-1]]. Values below the first stop
// are transparent, so dry areas show the map through.
export const RAMPS = {
  rain: [
    [0.05, [120, 190, 255, 0]],
    [0.1, [150, 205, 255, 0.55]],
    [1, [70, 150, 235, 0.72]],
    [5, [30, 80, 200, 0.8]],
    [15, [140, 40, 190, 0.85]],
  ],
  temp: [
    [0, [49, 54, 149, 0.75]],
    [10, [69, 117, 180, 0.75]],
    [18, [171, 217, 233, 0.72]],
    [24, [255, 255, 191, 0.7]],
    [30, [253, 174, 97, 0.75]],
    [37, [215, 48, 39, 0.8]],
    [45, [127, 0, 0, 0.85]],
  ],
  speed: [
    [0, [255, 255, 255, 0]],
    [4, [150, 210, 255, 0.28]],
    [8, [90, 160, 235, 0.38]],
    [14, [120, 80, 200, 0.45]],
  ],
};

export function rampColor(stops, value) {
  if (value == null || Number.isNaN(value) || value < stops[0][0]) return [0, 0, 0, 0];
  const last = stops[stops.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i++) {
    if (value <= stops[i][0]) {
      const [v0, c0] = stops[i - 1];
      const [v1, c1] = stops[i];
      const t = (value - v0) / (v1 - v0);
      return c0.map((ch, k) => ch + (c1[k] - ch) * t);
    }
  }
  return last[1];
}

const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const latFromMercY = (y) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;

/** Canvas size that keeps pixels square in Mercator space. */
export function rasterSize([west, south, east, north], width = 420) {
  const xSpan = ((east - west) * Math.PI) / 180;
  const ySpan = mercY(north) - mercY(south);
  return { width, height: Math.round((width * ySpan) / xSpan) };
}

/**
 * @param grid    the national grid
 * @param values  one hour of grid values (array, length cols * rows)
 * @param ramp    a RAMPS entry
 * @param regions GeoJSON FeatureCollection of the regions (used as a clip mask)
 */
export function renderField(grid, values, ramp, regions, width = 420) {
  const [west, south, east, north] = grid.bounds;
  const { width: w, height: h } = rasterSize(grid.bounds, width);

  const field = document.createElement("canvas");
  field.width = w;
  field.height = h;
  const fctx = field.getContext("2d");
  const image = fctx.createImageData(w, h);

  const yTop = mercY(north);
  const yBottom = mercY(south);
  for (let py = 0; py < h; py++) {
    const lat = latFromMercY(yTop + ((yBottom - yTop) * (py + 0.5)) / h);
    for (let px = 0; px < w; px++) {
      const lng = west + ((east - west) * (px + 0.5)) / w;
      const [r, g, b, a] = rampColor(ramp, sampleField(grid, values, lng, lat));
      const i = (py * w + px) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = Math.round(a * 255);
    }
  }
  fctx.putImageData(image, 0, 0);
  if (!regions) return field;

  // Clip to Namibia: draw the image only inside the region outlines.
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  const toX = (lng) => ((lng - west) / (east - west)) * w;
  const toY = (lat) => ((yTop - mercY(lat)) / (yTop - yBottom)) * h;
  ctx.beginPath();
  for (const feature of regions.features) {
    const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const poly of polys) {
      poly.forEach((ring) => {
        ring.forEach(([lng, lat], i) => (i === 0 ? ctx.moveTo(toX(lng), toY(lat)) : ctx.lineTo(toX(lng), toY(lat))));
        ctx.closePath();
      });
    }
  }
  ctx.save();
  ctx.clip(); // non-zero rule: the union of all regions, so shared borders leave no seams
  ctx.drawImage(field, 0, 0);
  ctx.restore();
  return out;
}

/** Image-source corner coordinates, clockwise from top-left, for MapLibre. */
export const rasterCoordinates = ([west, south, east, north]) => [
  [west, north],
  [east, north],
  [east, south],
  [west, south],
];
