/**
 * @jest-environment node
 */
// Tests for the cached weather and fire endpoints in server/*.js. The upstream
// providers are replaced with fakes, so nothing here touches the network.

const http = require("http");
const express = require("express");
const { TtlCache } = require("../../server/ttlCache");
const { rateLimit } = require("../../server/rateLimit");
const weather = require("../../server/weather");
const fires = require("../../server/fires");
const { gridPoints: clientGridPoints } = require("./weatherGrid");

// ---- helpers -------------------------------------------------------------------
function clock(start = 1_000_000) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => {
    t += ms;
  };
  return now;
}

function get(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http
      .get({ port, path, host: "127.0.0.1" }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, json: body ? JSON.parse(body) : null }));
      })
      .on("error", reject);
  });
}

const quiet = { warn: () => {} };

function gridResponse() {
  const points = weather.gridPoints();
  return points.map(() => ({
    hourly: {
      time: ["2026-10-02T10:00", "2026-10-02T11:00"],
      wind_speed_10m: [3, 4],
      wind_direction_10m: [90, 90],
      temperature_2m: [25, 26],
      precipitation: [0, 0],
    },
  }));
}

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

// ---- TtlCache ------------------------------------------------------------------
describe("TtlCache", () => {
  it("serves a fresh entry without calling the loader again", async () => {
    const now = clock();
    const cache = new TtlCache({ now });
    const loader = jest.fn(async () => "a");
    expect((await cache.get("k", { ttlMs: 1000 }, loader)).status).toBe("miss");
    now.advance(500);
    expect((await cache.get("k", { ttlMs: 1000 }, loader)).status).toBe("hit");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("refreshes after the ttl", async () => {
    const now = clock();
    const cache = new TtlCache({ now });
    let n = 0;
    const loader = async () => `v${++n}`;
    await cache.get("k", { ttlMs: 1000 }, loader);
    now.advance(1001);
    expect((await cache.get("k", { ttlMs: 1000 }, loader)).value).toBe("v2");
  });

  it("makes ONE upstream call for simultaneous requests", async () => {
    const cache = new TtlCache();
    const loader = jest.fn(() => new Promise((r) => setTimeout(() => r("x"), 20)));
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => cache.get("k", { ttlMs: 1000 }, loader)));
    expect(loader).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.value === "x")).toBe(true);
  });

  it("serves the old copy when the provider fails, but not forever", async () => {
    const now = clock();
    const cache = new TtlCache({ now });
    await cache.get("k", { ttlMs: 1000, staleMs: 5000 }, async () => "old");
    now.advance(2000);
    const failing = async () => {
      throw new Error("down");
    };
    const stale = await cache.get("k", { ttlMs: 1000, staleMs: 5000 }, failing);
    expect(stale).toMatchObject({ value: "old", status: "stale" });
    now.advance(10000); // older than staleMs
    await expect(cache.get("k", { ttlMs: 1000, staleMs: 5000 }, failing)).rejects.toThrow("down");
  });

  it("fails when there is nothing cached and the provider is down", async () => {
    const cache = new TtlCache();
    await expect(cache.get("k", { ttlMs: 1000 }, async () => { throw new Error("down"); })).rejects.toThrow("down");
  });

  it("keeps to maxEntries by dropping the oldest", async () => {
    const cache = new TtlCache({ maxEntries: 2 });
    for (const k of ["a", "b", "c"]) await cache.get(k, { ttlMs: 1000 }, async () => k);
    expect(cache.peek("a")).toBeNull();
    expect(cache.peek("c")).not.toBeNull();
  });
});

// ---- weather helpers -------------------------------------------------------------
describe("weather helpers", () => {
  it("asks the provider for exactly the points the browser code expects", () => {
    expect(weather.gridPoints()).toEqual(clientGridPoints());
    expect(weather.gridPoints()).toHaveLength(195);
  });

  it("validates and rounds coordinates, and refuses places outside Namibia", () => {
    expect(weather.parseCoords({ lat: "-17.7883", lng: "15.6992" })).toEqual({ lat: -17.8, lng: 15.7 });
    expect(weather.parseCoords({ lat: "51.5", lng: "-0.12" }).error).toMatch(/Namibia/);
    expect(weather.parseCoords({ lat: "-26.2", lng: "28.0" }).error).toMatch(/Namibia/); // Johannesburg
    for (const bad of [{}, { lat: "x", lng: "15" }, { lat: "-17", lng: "" }, { lat: "NaN", lng: "15" }]) {
      expect(weather.parseCoords(bad).error).toBeTruthy();
    }
  });

  it("uses the free hosts without a key and the single commercial host with one", () => {
    expect(weather.gridUrl("")).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
    expect(weather.gridUrl("")).not.toContain("apikey");
    expect(weather.floodUrl({ lat: -17.8, lng: 15.7 }, "")).toMatch(/^https:\/\/flood-api\.open-meteo\.com\/v1\/flood\?/);

    for (const url of [weather.gridUrl("SECRET"), weather.pointUrl({ lat: -17.8, lng: 15.7 }, "SECRET"), weather.floodUrl({ lat: -17.8, lng: 15.7 }, "SECRET")]) {
      expect(url).toMatch(/^https:\/\/customer-api\.open-meteo\.com\//);
      expect(url).toContain("apikey=SECRET");
    }
  });

  it("never leaks the key in an error message", () => {
    expect(weather.redact("GET https://x?apikey=SECRET failed", "SECRET")).toBe("GET https://x?apikey=*** failed");
  });

  it("drops the repeated time arrays but keeps the first", () => {
    const slim = weather.slimGrid(gridResponse());
    expect(slim[0].hourly.time).toHaveLength(2);
    expect(slim[1].hourly.time).toBeUndefined();
    expect(slim[1].hourly.temperature_2m).toEqual([25, 26]);
  });
});

// ---- weather routes ----------------------------------------------------------------
describe("weather routes", () => {
  let server;
  let fetchImpl;
  let cache;

  async function start(options = {}) {
    const app = express();
    cache = new TtlCache();
    fetchImpl = jest.fn(async (url) => {
      if (url.includes("/v1/flood")) return jsonResponse({ daily: { time: ["2026-10-02"] } });
      if (/latitude=[^&]*%2C/.test(url)) return jsonResponse(gridResponse());
      return jsonResponse({ current: { temperature_2m: 30 }, daily: {}, hourly: {} });
    });
    weather.register(app, { cache, fetchImpl, log: quiet, ...options });
    await new Promise((r) => {
      server = app.listen(0, "127.0.0.1", r);
    });
  }

  afterEach(() => new Promise((r) => (server ? server.close(r) : r())));

  it("fetches the grid once for any number of visitors", async () => {
    await start();
    const responses = await Promise.all([1, 2, 3, 4].map(() => get(server, "/api/weather/grid")));
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = responses[0].json;
    expect(body.points).toHaveLength(195);
    expect(body.list).toHaveLength(195);
    expect(body.model).toBe("ecmwf_ifs025");
    expect((await get(server, "/api/weather/grid")).headers["x-cache"]).toBe("hit");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends the commercial key upstream but never to the browser", async () => {
    await start({ apiKey: "SECRET" });
    const res = await get(server, "/api/weather/grid");
    expect(fetchImpl.mock.calls[0][0]).toContain("customer-api.open-meteo.com");
    expect(JSON.stringify(res.json)).not.toContain("SECRET");
    expect(JSON.stringify(res.headers)).not.toContain("SECRET");
  });

  it("shares one point forecast between taps in the same ~10 km cell", async () => {
    await start();
    await get(server, "/api/weather/point?lat=-17.7883&lng=15.6992");
    await get(server, "/api/weather/point?lat=-17.8120&lng=15.7310");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await get(server, "/api/weather/point?lat=-19.5&lng=17.0"); // a different cell
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects bad or out-of-country coordinates without calling the provider", async () => {
    await start();
    expect((await get(server, "/api/weather/point?lat=51.5&lng=-0.1")).status).toBe(400);
    expect((await get(server, "/api/weather/flood?lat=abc&lng=15")).status).toBe(400);
    expect((await get(server, "/api/weather/point")).status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("answers 502 with a plain message (no internals) when the provider is down", async () => {
    await start();
    fetchImpl.mockImplementation(async () => jsonResponse({}, false, 500));
    const res = await get(server, "/api/weather/grid");
    expect(res.status).toBe(502);
    expect(res.json.error).toBe("weather_unavailable");
    expect(JSON.stringify(res.json)).not.toMatch(/500|open-meteo/i);
  });

  it("rejects a grid with missing locations", async () => {
    await start();
    fetchImpl.mockImplementation(async () => jsonResponse(gridResponse().slice(0, 10)));
    expect((await get(server, "/api/weather/grid")).status).toBe(502);
  });

  it("applies the per-visitor rate limit", async () => {
    await start({ limiter: rateLimit({ windowMs: 60000, max: 2 }) });
    expect((await get(server, "/api/weather/point?lat=-17.8&lng=15.7")).status).toBe(200);
    expect((await get(server, "/api/weather/point?lat=-17.8&lng=15.7")).status).toBe(200);
    const limited = await get(server, "/api/weather/point?lat=-17.8&lng=15.7");
    expect(limited.status).toBe(429);
    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  });
});

// ---- fires ---------------------------------------------------------------------------
const CSV = [
  "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight",
  "-17.50123,15.2001,340.1,0.4,0.4,2026-10-02,1242,N,h,2.0NRT,300.1,12.34,D",
  "-18.1,16.3,330.5,0.4,0.4,2026-10-02,42,N,n,2.0NRT,299.0,3.2,N",
  "-19.0,17.0,310.0,0.4,0.4,2026-10-02,1300,N,l,2.0NRT,290.0,0.8,D", // low confidence: dropped
  "not,a,number,row",
].join("\n");

describe("parseFirmsCsv", () => {
  it("reads rows by column name, keeps high and nominal, drops low confidence", () => {
    const rows = fires.parseFirmsCsv(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ lat: -17.5012, lng: 15.2001, date: "2026-10-02", time: "12:42", confidence: "high", frp: 12.3, dayNight: "D", satellite: "N" });
    expect(rows[1].time).toBe("00:42"); // acq_time 42 means 00:42 UTC
    expect(rows[1].confidence).toBe("nominal");
  });

  it("copes with the columns in a different order", () => {
    const rows = fires.parseFirmsCsv("confidence,frp,longitude,latitude,acq_date,acq_time\nh,5,15.5,-17.5,2026-10-02,0930");
    expect(rows).toEqual([expect.objectContaining({ lat: -17.5, lng: 15.5, time: "09:30", frp: 5 })]);
  });

  it("returns an empty list for a header-only response and throws on an error message", () => {
    expect(fires.parseFirmsCsv("latitude,longitude,acq_date,acq_time,confidence")).toEqual([]);
    expect(() => fires.parseFirmsCsv("Invalid MAP_KEY.")).toThrow(/Unexpected FIRMS response/);
  });
});

describe("fires route", () => {
  let server;
  afterEach(() => new Promise((r) => (server ? server.close(r) : r())));

  async function start(options) {
    const app = express();
    fires.register(app, { cache: new TtlCache(), log: quiet, ...options });
    await new Promise((r) => {
      server = app.listen(0, "127.0.0.1", r);
    });
  }

  it("says it is switched off, rather than failing, when there is no key", async () => {
    await start({ mapKey: "" });
    const res = await get(server, "/api/fires");
    expect(res.status).toBe(503);
    expect(res.json.error).toBe("fires_not_configured");
  });

  it("fetches both satellites once and caches the result", async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(null) && { ok: true, status: 200, text: async () => CSV });
    await start({ mapKey: "MAPKEY", fetchImpl });
    const first = await get(server, "/api/fires");
    await get(server, "/api/fires");
    expect(first.status).toBe(200);
    expect(first.json.count).toBe(4); // 2 rows from each of the 2 satellites
    expect(fetchImpl).toHaveBeenCalledTimes(2); // not 4
    expect(fetchImpl.mock.calls[0][0]).toContain("/MAPKEY/VIIRS_SNPP_NRT/10.9,-29.9,26.1,-16.2/2");
    expect(JSON.stringify(first.json)).not.toContain("MAPKEY");
  });

  it("hides provider detail and the key when FIRMS fails", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error("connect ECONNREFUSED https://firms/MAPKEY/x");
    });
    await start({ mapKey: "MAPKEY", fetchImpl });
    const res = await get(server, "/api/fires");
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.json)).not.toContain("MAPKEY");
  });
});
