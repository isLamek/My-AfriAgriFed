import { buildGrid, gridPoints, nowIndex, sampleField, windComponents } from "./weatherGrid";

describe("wind components", () => {
  // Open-Meteo direction is where the wind blows FROM.
  it("a north wind (from 0°) blows toward the south", () => {
    const { u, v } = windComponents(10, 0);
    expect(u).toBeCloseTo(0);
    expect(v).toBeCloseTo(-10);
  });
  it("a west wind (from 270°) blows toward the east", () => {
    const { u, v } = windComponents(10, 270);
    expect(u).toBeCloseTo(10);
    expect(v).toBeCloseTo(0);
  });
  it("keeps the speed", () => {
    const { u, v } = windComponents(7.5, 123);
    expect(Math.hypot(u, v)).toBeCloseTo(7.5);
  });
});

describe("grid", () => {
  it("has 195 points covering the bounds exactly", () => {
    const pts = gridPoints();
    expect(pts).toHaveLength(195);
    expect(pts[0]).toEqual({ lng: 11.5, lat: -29.2 });
    expect(pts[194]).toEqual({ lng: 25.4, lat: -16.8 });
  });

  const small = { cols: 2, rows: 2, bounds: [0, 0, 10, 10], hours: 1, model: "x" };
  const loc = (speed, dir, temp, rain) => ({
    hourly: { time: ["2026-10-02T11:00"], wind_speed_10m: [speed], wind_direction_10m: [dir], temperature_2m: [temp], precipitation: [rain] },
  });

  it("builds per-hour arrays with ISO UTC times", () => {
    const g = buildGrid([loc(10, 270, 20, 0), loc(5, 0, 22, 1.24), loc(0, 0, 25, 0), loc(2, 90, 30, 0)], small);
    expect(g.times[0]).toBe("2026-10-02T11:00:00Z");
    expect(g.u[0][0]).toBeCloseTo(10, 0);
    expect(g.rain[0][1]).toBe(1.2);
    expect(g.temp[0][3]).toBe(30);
  });

  it("interpolates smoothly and returns exact values at grid points", () => {
    const values = [0, 10, 20, 30]; // (0,0)=0 (10,0)=10 (0,10)=20 (10,10)=30
    const g = { ...small };
    expect(sampleField(g, values, 0, 0)).toBeCloseTo(0);
    expect(sampleField(g, values, 10, 0)).toBeCloseTo(10);
    expect(sampleField(g, values, 10, 10)).toBeCloseTo(30);
    expect(sampleField(g, values, 5, 5)).toBeCloseTo(15); // centre = mean of the four
  });

  it("returns null outside the grid or where data is missing", () => {
    expect(sampleField(small, [0, 1, 2, 3], -1, 5)).toBeNull();
    expect(sampleField(small, [0, null, 2, 3], 5, 5)).toBeNull();
  });

  it("finds the forecast hour closest to now", () => {
    const times = ["2026-10-02T11:00:00Z", "2026-10-02T12:00:00Z", "2026-10-02T13:00:00Z"];
    expect(nowIndex(times, Date.parse("2026-10-02T12:10:00Z"))).toBe(1);
    expect(nowIndex(times, Date.parse("2026-10-02T12:40:00Z"))).toBe(2);
  });
});
