import { ageHours, describeAge, distanceKm, fireLevel, firesNear, toGeoJson } from "./fires";

const NOW = Date.parse("2026-10-02T12:00:00Z");
const oshakati = { lat: -17.79, lng: 15.7 };
const fire = (over = {}) => ({ lat: -17.79, lng: 15.7, date: "2026-10-02", time: "10:00", confidence: "high", frp: 5, ...over });

describe("distanceKm", () => {
  it("is zero for the same point", () => expect(distanceKm(oshakati, oshakati)).toBe(0));
  it("matches known distances", () => {
    // One degree of latitude is about 111 km.
    expect(distanceKm({ lat: -17, lng: 15 }, { lat: -18, lng: 15 })).toBeCloseTo(111.2, 0);
    // Windhoek to Oshakati is roughly 600 km by air.
    const windhoek = { lat: -22.56, lng: 17.08 };
    expect(distanceKm(windhoek, oshakati)).toBeGreaterThan(520);
    expect(distanceKm(windhoek, oshakati)).toBeLessThan(580);
  });
});

describe("ageHours", () => {
  it("measures from the satellite's UTC time", () => {
    expect(ageHours(fire({ time: "10:00" }), NOW)).toBe(2);
    expect(ageHours(fire({ date: "2026-10-01", time: "12:00" }), NOW)).toBe(24);
  });
  it("is null for a bad timestamp and never negative", () => {
    expect(ageHours(fire({ date: "nope" }), NOW)).toBeNull();
    expect(ageHours(fire({ time: "13:00" }), NOW)).toBe(0); // clock skew
  });
});

describe("firesNear", () => {
  const fires = [
    fire({ lat: -17.79, lng: 15.76 }), // ~6 km east, 2 h old
    fire({ lat: -17.79, lng: 15.95 }), // ~26 km east: outside 25 km
    fire({ lat: -17.9, lng: 15.7 }), // ~12 km south
    fire({ lat: -17.8, lng: 15.7, date: "2026-09-29" }), // ~1 km but 3 days old
  ];

  it("keeps only recent fires inside the radius, nearest first", () => {
    const near = firesNear(oshakati, fires, { now: NOW });
    expect(near.count).toBe(2);
    expect(near.fires.map((f) => f.distanceKm)).toEqual([...near.fires.map((f) => f.distanceKm)].sort((a, b) => a - b));
    expect(near.nearest.distanceKm).toBeLessThan(7);
    expect(near.nearest.ageHours).toBe(2);
  });

  it("honours custom radius and age", () => {
    expect(firesNear(oshakati, fires, { km: 5, now: NOW }).count).toBe(0);
    expect(firesNear(oshakati, fires, { km: 50, hours: 24 * 5, now: NOW }).count).toBe(4);
  });

  it("copes with no data", () => {
    expect(firesNear(oshakati, undefined, { now: NOW })).toEqual({ count: 0, nearest: null, fires: [] });
  });
});

describe("fireLevel and wording", () => {
  it("grades by the nearest fire", () => {
    expect(fireLevel({ nearest: null })).toBe("none");
    expect(fireLevel({ nearest: { distanceKm: 4 } })).toBe("close");
    expect(fireLevel({ nearest: { distanceKm: 10 } })).toBe("close");
    expect(fireLevel({ nearest: { distanceKm: 18 } })).toBe("near");
  });
  it("describes ages", () => {
    expect(describeAge(0.4)).toBe("under an hour ago");
    expect(describeAge(5.4)).toBe("5 h ago");
    expect(describeAge(24)).toBe("1 day ago");
    expect(describeAge(49)).toBe("2 days ago");
    expect(describeAge(null)).toBe("unknown time");
  });
});

describe("toGeoJson", () => {
  it("makes [lng, lat] points banded by age and skips unreadable timestamps", () => {
    const gj = toGeoJson(
      [fire({ time: "09:00" }), fire({ time: "03:00" }), fire({ date: "2026-09-30" }), fire({ date: "bad" })],
      NOW
    );
    expect(gj.features).toHaveLength(3);
    expect(gj.features[0].geometry.coordinates).toEqual([15.7, -17.79]);
    expect(gj.features.map((f) => f.properties.band)).toEqual(["fresh", "today", "older"]);
  });
});
