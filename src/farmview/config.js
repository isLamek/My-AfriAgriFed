// Map configuration: where the map may go, what it can show, and where each
// piece of information comes from. Everything here is static and keyless;
// production keys are listed in docs/LAUNCH_CHECKLIST.md.

// [west, south, east, north] - the whole of Namibia with a small margin.
import gridConfig from "./gridConfig.json";

export const NAMIBIA_BOUNDS = [11.2, -29.6, 25.8, -16.5];

// Quick views. Oshana is the pilot region.
export const VIEWS = {
  namibia: { label: "Namibia", bounds: [11.5, -29.2, 25.4, -16.8] },
  oshana: { label: "Oshana", bounds: [15.2, -19.45, 16.15, -17.6] },
};

// Major towns (lng, lat). Each was checked to fall inside the right region.
export const TOWNS = [
  { name: "Windhoek", lng: 17.083, lat: -22.57, region: "Khomas", major: true },
  { name: "Oshakati", lng: 15.699, lat: -17.788, region: "Oshana", major: true },
  { name: "Ongwediva", lng: 15.767, lat: -17.785, region: "Oshana" },
  { name: "Ondangwa", lng: 15.97, lat: -17.915, region: "Oshana" },
  { name: "Outapi", lng: 14.82, lat: -17.5, region: "Omusati" },
  { name: "Eenhana", lng: 16.33, lat: -17.47, region: "Ohangwena" },
  { name: "Tsumeb", lng: 17.72, lat: -19.24, region: "Oshikoto", major: true },
  { name: "Rundu", lng: 19.77, lat: -17.93, region: "Kavango East", major: true },
  { name: "Katima Mulilo", lng: 24.27, lat: -17.5, region: "Zambezi", major: true },
  { name: "Swakopmund", lng: 14.53, lat: -22.68, region: "Erongo", major: true },
  { name: "Walvis Bay", lng: 14.5, lat: -22.96, region: "Erongo" },
  { name: "Keetmanshoop", lng: 18.13, lat: -26.58, region: "Karas", major: true },
  { name: "Mariental", lng: 17.96, lat: -24.63, region: "Hardap", major: true },
  { name: "Gobabis", lng: 18.97, lat: -22.45, region: "Omaheke", major: true },
  { name: "Otjiwarongo", lng: 16.85, lat: -20.46, region: "Otjozondjupa", major: true },
  { name: "Opuwo", lng: 13.84, lat: -18.06, region: "Kunene", major: true },
];

export const BASEMAPS = {
  satellite: {
    label: "Satellite",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    maxzoom: 17,
  },
  streets: {
    label: "Streets",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap contributors",
    maxzoom: 18,
  },
};

// ---- Weather and satellite layers ------------------------------------------
// `kind: "model"`  - forecast fields from the national grid (hourly, 48 h).
// `kind: "sat"`    - live Meteosat imagery from EUMETSAT (observed).
// Each layer states its source so the map can show it, and says plainly
// whether it is a forecast or an observation.
export const WEATHER_LAYERS = [
  {
    id: "none",
    label: "No weather layer",
    kind: "none",
  },
  {
    id: "rain",
    label: "Rain",
    kind: "model",
    field: "rain",
    unit: "mm/h",
    legend: [0.1, 1, 5, 15],
    source: "ECMWF IFS 0.25° forecast via Open-Meteo",
    note: "Forecast rainfall in the hour before the selected time: an area picture from points about 100 km apart, so local showers can be missed. Rest the pointer on (or tap) a spot for its exact forecast.",
  },
  {
    id: "temperature",
    label: "Temperature",
    kind: "model",
    field: "temp",
    unit: "°C",
    legend: [5, 15, 22, 30, 38, 45],
    source: "ECMWF IFS 0.25° forecast via Open-Meteo",
    note: "Forecast air temperature 2 m above ground: an area picture, not corrected for hills and valleys. Rest the pointer on (or tap) a spot for its exact, altitude-corrected forecast.",
  },
  {
    id: "clouds",
    label: "Clouds (infrared)",
    kind: "sat",
    workspace: "msg_fes",
    layer: "ir108",
    stepMin: 15,
    source: "Meteosat-11 SEVIRI IR 10.8 µm, ©EUMETSAT",
    note: "Observed. Bright = cold, high cloud tops; works day and night.",
  },
  {
    id: "storms",
    label: "Storm clouds",
    kind: "sat",
    workspace: "msg_fes",
    layer: "rgb_convection",
    stepMin: 15,
    source: "Meteosat-11 Convection RGB, ©EUMETSAT",
    note: "Observed. Highlights thick, high clouds with strong updrafts (thunderstorm risk).",
  },
  {
    id: "lightning",
    label: "Lightning",
    kind: "sat",
    workspace: "mtg_fd",
    layer: "li_afa",
    stepMin: 5,
    source: "MTG-I1 Lightning Imager, ©EUMETSAT",
    note: "Observed. Optical flashes seen from space in the last 5 minutes.",
  },
  {
    id: "truecolor",
    label: "True colour",
    kind: "sat",
    workspace: "mtg_fd",
    layer: "rgb_geocolour",
    stepMin: 10,
    source: "MTG-I1 Geo Colour, ©EUMETSAT",
    note: "Observed. What the land and clouds look like from space (daytime).",
  },
];

// ---- Forecast grid ----------------------------------------------------------
// ~1° spacing over the whole country: 15 x 13 = 195 points in one request.
// Shared with server/weather.js (which reads the same JSON) so both sides always
// request exactly the same points.
export const GRID = gridConfig;

// Cache lifetimes. Weather moves slowly; being kind to the APIs is also what
// keeps the map fast.
export const TTL = {
  forecast: 30 * 60 * 1000, // 30 min for a point forecast
  grid: 60 * 60 * 1000, // 1 h for the national grid (the model updates every 6 h)
  climate: 30 * 24 * 60 * 60 * 1000, // 30 days (these are 30-year normals)
  flood: 3 * 60 * 60 * 1000, // 3 h
  satelliteTimes: 5 * 60 * 1000, // 5 min
};

export const TIMEZONE = "Africa/Windhoek";
