import {
  bestCrop,
  rangeScore,
  scoreCrops,
  seasonalRainMm,
  seasonalTempC,
  suitabilityLabel,
  typicalRainOnset,
} from "./cropRules";

// NASA POWER monthly normals for Oshakati (mm/day), as returned by the API.
const OSHAKATI_RAIN = { JAN: 3.18, FEB: 3.64, MAR: 2.81, APR: 0.8, MAY: 0.07, JUN: 0, JUL: 0, AUG: 0, SEP: 0.04, OCT: 0.36, NOV: 1.0, DEC: 1.92 };
const WARM = { JAN: 26, FEB: 26, MAR: 25.5, APR: 23, MAY: 19, JUN: 16, JUL: 16, AUG: 19, SEP: 23, OCT: 26, NOV: 27, DEC: 26.5 };

describe("rangeScore", () => {
  const range = [250, 350, 600, 900];
  it("is 1 inside the ideal band", () => expect(rangeScore(400, range)).toBe(1));
  it("is 0 outside the viable range", () => {
    expect(rangeScore(100, range)).toBe(0);
    expect(rangeScore(1200, range)).toBe(0);
  });
  it("ramps linearly on both sides", () => {
    expect(rangeScore(300, range)).toBeCloseTo(0.5);
    expect(rangeScore(750, range)).toBeCloseTo(0.5);
  });
  it("returns null for missing data", () => {
    expect(rangeScore(null, range)).toBeNull();
    expect(rangeScore(NaN, range)).toBeNull();
  });
});

describe("seasonal summaries", () => {
  it("sums Nov-Apr rainfall for Oshakati to ~400 mm", () => {
    const mm = seasonalRainMm(OSHAKATI_RAIN);
    expect(mm).toBeGreaterThan(380);
    expect(mm).toBeLessThan(420);
  });
  it("returns null if a rainy month is missing", () => {
    expect(seasonalRainMm({ NOV: 1 })).toBeNull();
    expect(seasonalRainMm(undefined)).toBeNull();
  });
  it("averages the rainy-season temperature", () => {
    // (27 + 26.5 + 26 + 26 + 25.5 + 23) / 6 = 25.67
    expect(seasonalTempC(WARM)).toBeCloseTo(25.7, 1);
  });
  it("finds November as the typical onset at Oshakati", () => {
    expect(typicalRainOnset(OSHAKATI_RAIN)).toBe("NOV");
  });
  it("returns null onset when it never rains enough", () => {
    expect(typicalRainOnset({ OCT: 0, NOV: 0.2, DEC: 0.3, JAN: 0.4, FEB: 0.2, MAR: 0.1 })).toBeNull();
  });
});

describe("crop scoring", () => {
  const oshakati = { seasonRainMm: seasonalRainMm(OSHAKATI_RAIN), seasonTempC: seasonalTempC(WARM) };

  it("ranks drought-tolerant crops first for Oshana-like rainfall", () => {
    const ranked = scoreCrops(oshakati).map((c) => c.id);
    expect(["mahangu", "cowpea", "bambara", "sorghum"]).toContain(ranked[0]);
  });
  it("marks maize as not viable at ~400 mm without irrigation", () => {
    const maize = scoreCrops(oshakati).find((c) => c.id === "maize");
    expect(maize.score).toBe(0);
    expect(maize.label).toBe("Not recommended");
  });
  it("gives every crop a null score when data is missing", () => {
    expect(scoreCrops({ seasonRainMm: null, seasonTempC: 26 }).every((c) => c.score === null)).toBe(true);
  });
  it("bestCrop returns null when nothing is suitable", () => {
    expect(bestCrop({ seasonRainMm: 50, seasonTempC: 26 })).toBeNull();
  });
  it("labels scores in bands", () => {
    expect(suitabilityLabel(90)).toBe("Well suited");
    expect(suitabilityLabel(60)).toBe("Suitable");
    expect(suitabilityLabel(40)).toBe("Marginal");
    expect(suitabilityLabel(10)).toBe("Not recommended");
    expect(suitabilityLabel(null)).toBe("No data");
  });
});
