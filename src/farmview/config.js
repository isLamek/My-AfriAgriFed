// FarmView configuration: where the map is allowed to go and what it shows.
// Namibia only, Oshana region first. Everything here is static - no keys.

// [west, south, east, north]
export const NAMIBIA_BOUNDS = [11.5, -29.2, 25.4, -16.8];

// The populated north of Oshana, where the towns and farms are. The OSM
// boundary polygon also includes a long southern strip toward Etosha that
// we could not verify, so the default frame stays on this box instead.
export const OSHANA_FOCUS_BOUNDS = [15.2, -18.25, 16.15, -17.6];
export const OSHANA_CENTER = [15.78, -17.9]; // [lng, lat]

// Approximate town positions (lng, lat). Used for labels and quick-jump.
// Only towns whose position was checked against the Oshana boundary are
// listed; smaller settlements should be added from OpenStreetMap place data
// rather than typed in by hand.
export const OSHANA_TOWNS = [
  { name: "Oshakati", lng: 15.699, lat: -17.788 },
  { name: "Ongwediva", lng: 15.767, lat: -17.785 },
  { name: "Ondangwa", lng: 15.97, lat: -17.915 },
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

// Map overlays the user can switch on. Keep this list agriculture-only.
// Each one paints the same 6 x 5 forecast grid; `stops` are [value, colour]
// pairs for the colour ramp and `unit` is shown in the legend and popup.
// Crop suitability is NOT an overlay: the climate data it relies on (NASA
// POWER, ~50 km cells) is too coarse to colour a map honestly, so it appears
// when a point is tapped. A soil-based overlay can follow.
// Farms and orders layers are added when those features ship (see plan).
export const LAYERS = [
  {
    id: "rain",
    label: "Rain, next 7 days",
    prop: "rainMm",
    unit: "mm",
    stops: [[0, "#dfeee0"], [5, "#9ecae1"], [20, "#4292c6"], [50, "#08519c"]],
  },
  {
    id: "temperature",
    label: "Today's high",
    prop: "maxC",
    unit: "°C",
    stops: [[20, "#fee090"], [30, "#fc8d59"], [38, "#d73027"]],
  },
  {
    id: "soil",
    label: "Topsoil moisture",
    prop: "soilPct",
    unit: "%",
    stops: [[5, "#d8b365"], [15, "#c7eae5"], [30, "#01665e"]],
  },
];

// Cache lifetimes. Weather moves slowly; being kind to the APIs is also what
// keeps the map fast.
export const TTL = {
  forecast: 30 * 60 * 1000, // 30 min
  climate: 30 * 24 * 60 * 60 * 1000, // 30 days (these are 30-year normals)
  flood: 3 * 60 * 60 * 1000, // 3 h
};

export const TIMEZONE = "Africa/Windhoek";
