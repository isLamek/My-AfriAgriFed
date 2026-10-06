// Crop suitability rules for northern Namibia.
//
// This is an INDICATIVE screening tool, not agronomic advice. It scores a
// location from three things we can measure keylessly: rainfall in the rainy
// season (NASA POWER 30-year normals), growing-season temperature, and
// current topsoil moisture. The thresholds are broad, published-range style
// values for these crops; they should be reviewed by an extension officer
// (e.g. the Ministry of Agriculture, Water and Land Reform) before being
// presented as recommendations.
//
// Pure functions only - no network, no DOM - so they are easy to test.

export const RAINY_MONTHS = ["NOV", "DEC", "JAN", "FEB", "MAR", "APR"];
const MONTH_DAYS = { JAN: 31, FEB: 28, MAR: 31, APR: 30, MAY: 31, JUN: 30, JUL: 31, AUG: 31, SEP: 30, OCT: 31, NOV: 30, DEC: 31 };

// rain: seasonal (Nov-Apr) rainfall in mm. temp: mean growing-season °C.
// Each range is [min viable, ideal low, ideal high, max viable].
export const CROPS = [
  { id: "mahangu", name: "Mahangu (pearl millet)", color: "#d9a441", rain: [250, 350, 600, 900], temp: [20, 25, 33, 38], note: "Most drought-tolerant staple; the backbone of Oshana farming." },
  { id: "sorghum", name: "Sorghum", color: "#b5651d", rain: [300, 400, 650, 1000], temp: [20, 24, 33, 38], note: "Tolerates heat and dry spells; good where mahangu is risky for birds." },
  { id: "cowpea", name: "Cowpeas (nawa)", color: "#7a8b3a", rain: [250, 350, 600, 900], temp: [20, 24, 32, 37], note: "Fixes nitrogen; fits well in rotation with mahangu." },
  { id: "groundnut", name: "Groundnuts", color: "#c98f5e", rain: [400, 500, 700, 1000], temp: [20, 24, 30, 35], note: "Needs lighter, well-drained soil and steadier rain." },
  { id: "bambara", name: "Bambara groundnut", color: "#8a6f4e", rain: [250, 350, 600, 900], temp: [20, 24, 32, 37], note: "Hardy traditional legume that copes with poor soils." },
  { id: "maize", name: "Maize", color: "#e6c229", rain: [450, 600, 900, 1200], temp: [18, 22, 30, 35], note: "Higher yield but riskier in the dry north without irrigation." },
  { id: "watermelon", name: "Watermelon / melons", color: "#4e9f5b", rain: [300, 400, 650, 900], temp: [22, 25, 32, 38], note: "Warm-season crop; suits sandy soils and short rains." },
];

// Linear score for a value against [min, idealLow, idealHigh, max].
export function rangeScore(value, [min, idealLow, idealHigh, max]) {
  if (value == null || Number.isNaN(value)) return null;
  if (value < min || value > max) return 0;
  if (value >= idealLow && value <= idealHigh) return 1;
  if (value < idealLow) return (value - min) / (idealLow - min);
  return (max - value) / (max - idealHigh);
}

// Seasonal rainfall (mm) from NASA POWER monthly climatology in mm/day.
export function seasonalRainMm(prectotcorr) {
  if (!prectotcorr) return null;
  let total = 0;
  for (const m of RAINY_MONTHS) {
    if (typeof prectotcorr[m] !== "number") return null;
    total += prectotcorr[m] * MONTH_DAYS[m];
  }
  return Math.round(total);
}

// Mean temperature (°C) across the rainy months.
export function seasonalTempC(t2m) {
  if (!t2m) return null;
  const vals = RAINY_MONTHS.map((m) => t2m[m]);
  if (vals.some((v) => typeof v !== "number")) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// Score every crop for a climate summary. Rain is the limiting factor in
// Oshana, so it counts for more than temperature. A factor outside the
// crop's viable range is a hard stop (law of the minimum): good temperatures
// cannot make up for rainfall the crop cannot survive on.
export function scoreCrops({ seasonRainMm, seasonTempC }) {
  return CROPS.map((crop) => {
    const rain = rangeScore(seasonRainMm, crop.rain);
    const temp = rangeScore(seasonTempC, crop.temp);
    let score = null;
    if (rain != null && temp != null) {
      score = rain === 0 || temp === 0 ? 0 : Math.round((rain * 0.65 + temp * 0.35) * 100);
    }
    return { ...crop, score, label: suitabilityLabel(score) };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

export function suitabilityLabel(score) {
  if (score == null) return "No data";
  if (score >= 80) return "Well suited";
  if (score >= 55) return "Suitable";
  if (score >= 30) return "Marginal";
  return "Not recommended";
}

export function bestCrop(climate) {
  const [top] = scoreCrops(climate);
  return top && top.score != null && top.score >= 30 ? top : null;
}

// When has the rainy season usually started? First month, counting from
// October, whose normal rainfall passes ~1 mm/day. Returns a month code or
// null if the rains never reach that level.
export function typicalRainOnset(prectotcorr) {
  if (!prectotcorr) return null;
  for (const m of ["OCT", "NOV", "DEC", "JAN", "FEB", "MAR"]) {
    if (prectotcorr[m] >= 1) return m;
  }
  return null;
}
