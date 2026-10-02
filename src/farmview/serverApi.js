// The browser's side of server.js: weather and fire data are fetched through the
// backend (one cached copy shared by every visitor, API keys stay private).
// If the backend can't be reached the callers fall back to the public APIs so
// the map keeps working; set REACT_APP_WEATHER_DIRECT_FALLBACK=false to forbid
// that once you are on a commercial plan.

const BASE = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");
const DOWN_FOR_MS = 60 * 1000;
let downUntil = 0; // after a network failure, stop trying the server for a minute

export class ServerApiError extends Error {
  constructor(message, { status = 0, code = "unavailable" } = {}) {
    super(message);
    this.name = "ServerApiError";
    this.status = status;
    this.code = code;
  }
}

export const serverConfigured = () => BASE !== "";
export const directFallbackAllowed = () => process.env.REACT_APP_WEATHER_DIRECT_FALLBACK !== "false";

/** GET `path` (for example "/api/fires") from the backend and return its JSON. */
export async function serverJson(path, { timeoutMs = 20000 } = {}) {
  if (!BASE) throw new ServerApiError("No backend configured", { code: "not_configured" });
  if (Date.now() < downUntil) throw new ServerApiError("Backend unreachable", { code: "unreachable" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { signal: controller.signal });
  } catch (error) {
    downUntil = Date.now() + DOWN_FOR_MS;
    throw new ServerApiError(`Backend unreachable (${error.message})`, { code: "unreachable" });
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // an HTML error page from a proxy, for example
  }
  if (!res.ok) {
    throw new ServerApiError(body?.message || `Backend returned ${res.status}`, { status: res.status, code: body?.error || "error" });
  }
  if (body === null) throw new ServerApiError("Backend sent an unreadable response", { code: "bad_response" });
  return body;
}

/** Test hook: forget a recent failure. */
export const resetServerApi = () => {
  downUntil = 0;
};

let featuresPromise = null;
/** What the backend can do right now: { fires, commercialWeather, ... }. Never rejects. */
export function fetchFeatures() {
  if (!featuresPromise) {
    featuresPromise = serverJson("/api/features", { timeoutMs: 8000 }).catch(() => {
      featuresPromise = null; // try again next time
      return { weather: false, fires: false };
    });
  }
  return featuresPromise;
}
