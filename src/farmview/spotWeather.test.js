import { spotKey, summariseSpot } from "./dataClients";
import { compassFrom, compassPoint, spotReadout } from "./cursorReadout";

describe("exact-spot weather", () => {
  const realNow = Date.now;
  afterEach(() => {
    Date.now = realNow;
  });

  it("reports rain for the hour that just ended and the chance over the next 3 hours", () => {
    Date.now = () => Date.parse("2026-10-07T20:30:00Z");
    const s = summariseSpot({
      utc_offset_seconds: 0,
      elevation: 1097,
      current: { time: "2026-10-07T20:30", temperature_2m: 25.9, relative_humidity_2m: 13, precipitation: 0.1, wind_speed_10m: 1.07, wind_direction_10m: 118, wind_gusts_10m: 1.6 },
      hourly: {
        time: ["2026-10-07T19:00", "2026-10-07T20:00", "2026-10-07T21:00", "2026-10-07T22:00", "2026-10-07T23:00", "2026-10-08T00:00"],
        precipitation: [0, 2.4, 0.5, 0, 0, 0],
        precipitation_probability: [10, 80, 60, 30, 20, 95],
      },
    });
    expect(s.rainLastHourMm).toBe(2.4); // the 20:00 total (the hour before 20:00)
    expect(s.rainChance3h).toBe(60); // highest of 21:00, 22:00, 23:00 (not 00:00, beyond 3 h)
    expect(s.temp).toBe(25.9);
    expect(s.windFrom).toBe(118);
    expect(s.at).toBe(Date.parse("2026-10-07T20:30:00Z"));
  });

  it("handles local times (Namibia, UTC+2) correctly", () => {
    Date.now = () => Date.parse("2026-10-07T20:30:00Z"); // 22:30 in Windhoek
    const s = summariseSpot({
      utc_offset_seconds: 7200,
      current: { time: "2026-10-07T22:30" },
      hourly: { time: ["2026-10-07T21:00", "2026-10-07T22:00", "2026-10-07T23:00"], precipitation: [1, 3, 9], precipitation_probability: [0, 0, 40] },
    });
    expect(s.rainLastHourMm).toBe(3); // 22:00 local = 20:00 UTC
    expect(s.rainChance3h).toBe(40);
    expect(s.at).toBe(Date.parse("2026-10-07T20:30:00Z"));
  });

  it("shares a cache cell only for spots within about 1 km", () => {
    expect(spotKey(-17.788, 15.699)).toBe(spotKey(-17.791, 15.702));
    expect(spotKey(-26.58, 18.13)).toBe("-26.58,18.13");
    expect(spotKey(-17.788, 15.699)).not.toBe(spotKey(-17.75, 15.699));
  });
});

describe("wind direction", () => {
  it.each([
    [0, "N"], [44, "NE"], [90, "E"], [118, "SE"], [180, "S"], [225, "SW"], [270, "W"], [337, "NW"], [359, "N"], [-90, "W"],
  ])("%s° is %s", (deg, point) => expect(compassPoint(deg)).toBe(point));

  it("agrees between the grid's wind parts and degrees", () => {
    // wind FROM the south-east (135°) blows toward the north-west: u < 0, v > 0
    const speed = 5;
    const rad = (135 * Math.PI) / 180;
    expect(compassFrom(-speed * Math.sin(rad), -speed * Math.cos(rad))).toBe("SE");
  });
});

describe("the readout card for an exact spot", () => {
  it("rounds sensibly and keeps the facts", () => {
    const r = spotReadout(15.7, -17.79, { temp: 25.94, humidity: 13, rainLastHourMm: 0, rainChance3h: 5, windMs: 1.07, gustMs: 1.6, windFrom: 118, elevation: 1097, at: 0 }, null);
    expect(r).toMatchObject({ exact: true, temp: "25.9", humidity: "13", rain: "0.0", rainChance: "5", wind: "1.1", gust: "1.6", from: "SE" });
  });
});
