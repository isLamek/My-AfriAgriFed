// How the browser talks to the backend, and what happens when the backend is down.
// REACT_APP_API_URL is read when the module loads, so each test loads fresh copies.

const POINT = { current: { temperature_2m: 31 }, daily: { time: [], precipitation_sum: [], temperature_2m_max: [], temperature_2m_min: [], et0_fao_evapotranspiration: [] }, hourly: {} };

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const err = (status, body) => ({ ok: false, status, json: async () => body });

function load({ api = "https://api.example.test", fallback } = {}) {
  jest.resetModules();
  if (api === null) delete process.env.REACT_APP_API_URL;
  else process.env.REACT_APP_API_URL = api;
  if (fallback === undefined) delete process.env.REACT_APP_WEATHER_DIRECT_FALLBACK;
  else process.env.REACT_APP_WEATHER_DIRECT_FALLBACK = fallback;
  return { serverApi: require("./serverApi"), data: require("./dataClients"), grid: require("./weatherGrid") };
}

const calls = () => global.fetch.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

afterAll(() => {
  delete process.env.REACT_APP_API_URL;
  delete process.env.REACT_APP_WEATHER_DIRECT_FALLBACK;
});

describe("serverJson", () => {
  it("returns the backend's JSON", async () => {
    const { serverApi } = load();
    global.fetch.mockResolvedValue(ok({ hello: 1 }));
    await expect(serverApi.serverJson("/api/x")).resolves.toEqual({ hello: 1 });
    expect(calls()[0]).toBe("https://api.example.test/api/x");
  });

  it("tolerates a trailing slash in the configured address", async () => {
    const { serverApi } = load({ api: "https://api.example.test//" });
    global.fetch.mockResolvedValue(ok({}));
    await serverApi.serverJson("/api/x");
    expect(calls()[0]).toBe("https://api.example.test/api/x");
  });

  it("carries the backend's error code and status", async () => {
    const { serverApi } = load();
    global.fetch.mockResolvedValue(err(503, { error: "fires_not_configured", message: "Fire data is not switched on yet." }));
    await expect(serverApi.serverJson("/api/fires")).rejects.toMatchObject({ status: 503, code: "fires_not_configured", message: "Fire data is not switched on yet." });
  });

  it("stops trying the backend for a minute after a network failure", async () => {
    const { serverApi } = load();
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(serverApi.serverJson("/api/x")).rejects.toMatchObject({ code: "unreachable" });
    await expect(serverApi.serverJson("/api/x")).rejects.toMatchObject({ code: "unreachable" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    serverApi.resetServerApi();
    await expect(serverApi.serverJson("/api/x")).rejects.toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("refuses to run with no backend configured", async () => {
    const { serverApi } = load({ api: null });
    expect(serverApi.serverConfigured()).toBe(false);
    await expect(serverApi.serverJson("/api/x")).rejects.toMatchObject({ code: "not_configured" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("reports what the backend can do, and says 'nothing' rather than throwing if it is down", async () => {
    const { serverApi } = load();
    global.fetch.mockResolvedValue(ok({ weather: true, fires: true }));
    await expect(serverApi.fetchFeatures()).resolves.toEqual({ weather: true, fires: true });

    const down = load();
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(down.serverApi.fetchFeatures()).resolves.toEqual({ weather: false, fires: false });
  });
});

describe("point forecast: server first, public API as the fallback", () => {
  it("uses only the backend when it answers", async () => {
    const { data } = load();
    global.fetch.mockResolvedValue(ok(POINT));
    const out = await data.fetchPointWeather(-17.7883, 15.6992);
    expect(out.current.temperature_2m).toBe(31);
    expect(calls()).toHaveLength(1);
    expect(calls()[0]).toBe("https://api.example.test/api/weather/point?lat=-17.79&lng=15.7");
  });

  it("falls back to Open-Meteo when the backend is unreachable", async () => {
    const { data } = load();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).startsWith("https://api.example.test")) throw new TypeError("Failed to fetch");
      return ok(POINT);
    });
    const out = await data.fetchPointWeather(-17.7883, 15.6992);
    expect(out.current.temperature_2m).toBe(31);
    expect(calls()[1]).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast/);
  });

  it("falls back when the backend itself fails (502)", async () => {
    const { data } = load();
    global.fetch.mockImplementation(async (url) =>
      String(url).startsWith("https://api.example.test") ? err(502, { error: "weather_unavailable" }) : ok(POINT)
    );
    await expect(data.fetchPointWeather(-17.7883, 15.6992)).resolves.toBeTruthy();
    expect(calls()).toHaveLength(2);
  });

  it("does NOT retry a 400: the request itself was wrong", async () => {
    const { data } = load();
    global.fetch.mockResolvedValue(err(400, { error: "bad_request", message: "This service only covers Namibia" }));
    await expect(data.fetchPointWeather(51.5, -0.1)).rejects.toMatchObject({ status: 400 });
    expect(calls()).toHaveLength(1);
  });

  it("will not call Open-Meteo directly when direct fallback is switched off", async () => {
    const { data } = load({ fallback: "false" });
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(data.fetchPointWeather(-17.7883, 15.6992)).rejects.toBeTruthy();
    expect(calls().every((u) => u.startsWith("https://api.example.test"))).toBe(true);
  });

  it("goes straight to Open-Meteo when no backend is configured (local development)", async () => {
    const { data } = load({ api: null });
    global.fetch.mockResolvedValue(ok(POINT));
    await data.fetchPointWeather(-17.7883, 15.6992);
    expect(calls()).toHaveLength(1);
    expect(calls()[0]).toMatch(/^https:\/\/api\.open-meteo\.com\//);
  });
});

describe("national grid: server first", () => {
  const list = () =>
    Array.from({ length: 195 }, () => ({
      hourly: { time: ["2026-10-02T10:00"], wind_speed_10m: [3], wind_direction_10m: [90], temperature_2m: [25], precipitation: [0] },
    }));

  it("builds the grid from the backend's { list } shape", async () => {
    const { grid } = load();
    const body = { list: list().map((l, i) => (i === 0 ? l : { hourly: { ...l.hourly, time: undefined } })) };
    global.fetch.mockResolvedValue(ok(body));
    const g = await grid.fetchNationalGrid();
    expect(g.times).toEqual(["2026-10-02T10:00:00Z"]);
    expect(g.temp[0]).toHaveLength(195);
    expect(calls()).toEqual(["https://api.example.test/api/weather/grid"]);
  });

  it("falls back to Open-Meteo's own list shape when the backend is down", async () => {
    const { grid } = load();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).startsWith("https://api.example.test")) throw new TypeError("Failed to fetch");
      return ok(list());
    });
    const g = await grid.fetchNationalGrid();
    expect(g.speed[0][0]).toBe(3);
    expect(calls()[1]).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast/);
  });

  it("rejects an incomplete grid", async () => {
    const { grid } = load();
    global.fetch.mockResolvedValue(ok({ list: list().slice(0, 5) }));
    await expect(grid.fetchNationalGrid()).rejects.toThrow(/incomplete/);
  });
});
