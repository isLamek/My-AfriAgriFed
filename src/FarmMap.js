import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { CloudRain, Droplets, Sprout, Thermometer, Waves, MapPin, Layers } from "lucide-react";
// The "!" prefix skips Create React App's Babel pass over the library. Babel
// rewrites the functions MapLibre ships to its web worker and breaks the
// production build; the library is already compiled, so leave it alone.
// eslint-disable-next-line import/no-webpack-loader-syntax
import maplibregl from "!maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { auth, db } from "./firebaseConfig";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import {
  BASEMAPS,
  LAYERS,
  NAMIBIA_BOUNDS,
  OSHANA_FOCUS_BOUNDS,
  OSHANA_TOWNS,
} from "./farmview/config";
import { buildGrid, fetchClimate, fetchFlood, fetchGridWeather, fetchPointWeather } from "./farmview/dataClients";
import { scoreCrops, seasonalRainMm, seasonalTempC, typicalRainOnset } from "./farmview/cropRules";
import "./FarmMap.css";

const MONTH_NAMES = { JAN: "January", FEB: "February", MAR: "March", APR: "April", MAY: "May", JUN: "June", JUL: "July", AUG: "August", SEP: "September", OCT: "October", NOV: "November", DEC: "December" };

const GRID = buildGrid(OSHANA_FOCUS_BOUNDS, 6, 5);

function nearestTown(lat, lng) {
  let best = null;
  let bestKm = Infinity;
  for (const town of OSHANA_TOWNS) {
    const dx = (town.lng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
    const dy = (town.lat - lat) * 110.57;
    const km = Math.hypot(dx, dy);
    if (km < bestKm) {
      bestKm = km;
      best = town;
    }
  }
  return best ? { name: best.name, km: Math.round(bestKm) } : null;
}

// Keep the framed region clear of the floating control card on wide screens.
const framePadding = () =>
  window.innerWidth > 1100 ? { top: 24, right: 24, bottom: 24, left: 280 } : { top: 170, right: 24, bottom: 24, left: 24 };

const rampExpression = (layer) => [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", layer.prop], layer.stops[0][0]],
  ...layer.stops.flat(),
];

export default function FarmMap() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [userType, setUserType] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isOrganization, setIsOrganization] = useState(false);

  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemap] = useState("satellite");
  const [layerId, setLayerId] = useState("rain");
  const [grid, setGrid] = useState(null);
  const [gridError, setGridError] = useState(false);
  const [picked, setPicked] = useState(null); // { lat, lng }
  const [details, setDetails] = useState(null); // { weather, climate, flood, loading, errors }
  const [panelOpen, setPanelOpen] = useState(true);

  // ---- who is signed in (for the sidebar) ---------------------------------
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getAdminProfile(auth.currentUser).then((profile) => setIsAdminUser(!!profile));
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setUserType(data.userType || null);
      setIsOrganization(
        data.isOrganization === true ||
          (!!data.questionnaireData?.consumerType && data.questionnaireData.consumerType !== "Individual Buyer")
      );
    });
  }, []);

  // ---- create the map once --------------------------------------------------
  useEffect(() => {
    const sources = {};
    const layers = [];
    Object.entries(BASEMAPS).forEach(([id, b]) => {
      sources[`base-${id}`] = { type: "raster", tiles: b.tiles, tileSize: 256, maxzoom: b.maxzoom, attribution: b.attribution };
      layers.push({ id: `base-${id}`, type: "raster", source: `base-${id}`, layout: { visibility: id === "satellite" ? "visible" : "none" } });
    });

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: { version: 8, sources, layers },
      bounds: OSHANA_FOCUS_BOUNDS,
      fitBoundsOptions: { padding: framePadding() },
      maxBounds: NAMIBIA_BOUNDS,
      minZoom: 5,
      maxZoom: 16,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "top-right");
    mapRef.current = map;

    // "style.load" (not "load"): "load" waits for the first satellite tiles,
    // which on a slow connection would hold back the boundary and overlays.
    map.once("style.load", () => {
      map.addSource("regions", {
        type: "geojson",
        data: "/data/namibia-regions.geojson",
        attribution: "Regions: geoBoundaries (public domain)",
      });
      map.addLayer({ id: "regions-line", type: "line", source: "regions", paint: { "line-color": "#ffffff", "line-opacity": 0.35, "line-width": 0.8 } });

      map.addSource("oshana", {
        type: "geojson",
        data: "/data/oshana-boundary.geojson",
        attribution: "Oshana boundary © OpenStreetMap contributors (ODbL)",
      });
      map.addLayer({ id: "oshana-fill", type: "fill", source: "oshana", paint: { "fill-color": "#7bb141", "fill-opacity": 0.06 } });
      map.addLayer({ id: "oshana-line", type: "line", source: "oshana", paint: { "line-color": "#7bb141", "line-width": 2, "line-dasharray": [3, 2] } });

      map.addSource("grid", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "grid-circles",
        type: "circle",
        source: "grid",
        paint: {
          // Doubles every zoom level, like the ground distance between grid
          // points, so neighbouring blobs keep blending instead of separating.
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 5, 5, 12, 640],
          "circle-color": rampExpression(LAYERS[0]),
          "circle-opacity": 0.55,
          "circle-blur": 0.85,
        },
      });

      // Town labels as DOM markers: no glyph/font server needed.
      OSHANA_TOWNS.forEach((town) => {
        const el = document.createElement("div");
        el.className = "fv-town";
        el.innerHTML = `<span></span>${town.name}`;
        // Oshakati and Ongwediva are ~7 km apart: label them on opposite sides.
        const anchor = town.name === "Oshakati" ? "right" : "left";
        if (anchor === "right") el.classList.add("fv-town-right");
        new maplibregl.Marker({ element: el, anchor }).setLngLat([town.lng, town.lat]).addTo(map);
      });

      setMapReady(true);
    });

    map.on("click", (e) => setPicked({ lat: e.lngLat.lat, lng: e.lngLat.lng }));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- basemap switch -------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    Object.keys(BASEMAPS).forEach((id) => {
      map.setLayoutProperty(`base-${id}`, "visibility", id === basemap ? "visible" : "none");
    });
  }, [basemap, mapReady]);

  // ---- region forecast grid (one request) ----------------------------------
  useEffect(() => {
    let cancelled = false;
    fetchGridWeather(GRID)
      .then((rows) => !cancelled && setGrid(rows))
      .catch(() => !cancelled && setGridError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const layer = useMemo(() => LAYERS.find((l) => l.id === layerId) || LAYERS[0], [layerId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !grid) return;
    map.getSource("grid").setData({
      type: "FeatureCollection",
      features: grid.map((p) => ({
        type: "Feature",
        properties: { rainMm: p.rainMm, maxC: p.maxC, soilPct: p.soilPct },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      })),
    });
  }, [grid, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setPaintProperty("grid-circles", "circle-color", rampExpression(layer));
  }, [layer, mapReady]);

  // ---- tap a point: weather + climate + flood in parallel -------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !picked) return;

    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "fv-pin";
      markerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" });
    }
    markerRef.current.setLngLat([picked.lng, picked.lat]).addTo(map);

    let cancelled = false;
    setPanelOpen(true);
    setDetails({ loading: true });
    Promise.allSettled([
      fetchPointWeather(picked.lat, picked.lng),
      fetchClimate(picked.lat, picked.lng),
      fetchFlood(picked.lat, picked.lng),
    ]).then(([weather, climate, flood]) => {
      if (cancelled) return;
      setDetails({
        loading: false,
        weather: weather.status === "fulfilled" ? weather.value : null,
        climate: climate.status === "fulfilled" ? climate.value : null,
        flood: flood.status === "fulfilled" ? flood.value : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [picked, mapReady]);

  const jumpTo = useCallback((town) => {
    // Padding shifts the target into the part of the map the panels leave visible.
    const wide = window.innerWidth > 1100;
    mapRef.current?.flyTo({
      center: [town.lng, town.lat],
      zoom: 11,
      essential: true,
      padding: wide ? { left: 270, right: 350, top: 0, bottom: 0 } : { left: 0, right: 0, top: 150, bottom: 260 },
    });
    setPicked({ lat: town.lat, lng: town.lng });
  }, []);

  const resetView = () => mapRef.current?.fitBounds(OSHANA_FOCUS_BOUNDS, { padding: framePadding() });

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const theme = isAdminUser
    ? "admin"
    : userType === "farmer"
    ? "farmer"
    : userType === "institution"
    ? "institution"
    : isOrganization
    ? "organization"
    : "consumer";
  const navSections = buildNavSections({ userType, isAdmin: isAdminUser, activePath: "/farm-map" });

  return (
    <AppShell
      eyebrow="Oshana, Namibia"
      title="Farm Map"
      subtitle="Weather, soil, rain and what grows best, on your land."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <div className="fv-wrap">
        <div className="fv-map" ref={containerRef} />

        <div className="fv-controls aaf-card">
          <div className="fv-seg" role="group" aria-label="Map type">
            {Object.entries(BASEMAPS).map(([id, b]) => (
              <button key={id} className={basemap === id ? "on" : ""} onClick={() => setBasemap(id)}>
                {b.label}
              </button>
            ))}
          </div>

          <p className="fv-label"><Layers size={14} /> Show on map</p>
          <div className="fv-layers">
            {LAYERS.map((l) => (
              <button key={l.id} className={layerId === l.id ? "on" : ""} onClick={() => setLayerId(l.id)}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="fv-legend">
            <div
              className="fv-ramp"
              style={{
                background: `linear-gradient(90deg, ${layer.stops.map(([, c]) => c).join(",")})`,
              }}
            />
            <div className="fv-ramp-labels">
              <span>{layer.stops[0][0]}{layer.unit}</span>
              <span>{layer.stops[layer.stops.length - 1][0]}+{layer.unit}</span>
            </div>
            {gridError && <p className="fv-warn">Could not load the regional forecast. Tap a point for local weather.</p>}
            {!grid && !gridError && <p className="fv-muted">Loading regional forecast…</p>}
          </div>

          <div className="fv-jump">
            <p className="fv-label"><MapPin size={14} /> Jump to</p>
            <div className="fv-layers">
              {OSHANA_TOWNS.map((t) => (
                <button key={t.name} onClick={() => jumpTo(t)}>{t.name}</button>
              ))}
              <button onClick={resetView}>Whole region</button>
            </div>
          </div>
          <p className="fv-muted fv-tip">Tap anywhere on the map for weather and crop advice for that spot.</p>
        </div>

        {picked && (
          <aside className={`fv-panel aaf-card ${panelOpen ? "open" : "closed"}`}>
            <button className="fv-panel-toggle" onClick={() => setPanelOpen((v) => !v)} aria-label="Toggle details">
              {panelOpen ? "Hide details" : "Show details"}
            </button>
            <PointDetails picked={picked} details={details} />
          </aside>
        )}
      </div>
    </AppShell>
  );
}

function PointDetails({ picked, details }) {
  const town = nearestTown(picked.lat, picked.lng);
  const climate = details?.climate;
  const crops = useMemo(() => {
    if (!climate) return null;
    return scoreCrops({ seasonRainMm: seasonalRainMm(climate.prectotcorr), seasonTempC: seasonalTempC(climate.t2m) });
  }, [climate]);
  const rainMm = climate ? seasonalRainMm(climate.prectotcorr) : null;
  const onset = climate ? typicalRainOnset(climate.prectotcorr) : null;

  return (
    <div className="fv-details">
      <h3>
        {picked.lat.toFixed(3)}°, {picked.lng.toFixed(3)}°
      </h3>
      {town && <p className="fv-muted">{town.km <= 1 ? `In ${town.name}` : `About ${town.km} km from ${town.name}`}</p>}

      {details?.loading && <p className="fv-muted">Loading conditions…</p>}

      {details && !details.loading && (
        <>
          {details.weather ? <WeatherBlock weather={details.weather} /> : <p className="fv-warn">Weather is unavailable right now.</p>}

          {details.flood && details.flood.level !== "normal" && (
            <p className={`fv-flood ${details.flood.level}`}>
              <Waves size={16} /> River flow {details.flood.level === "high" ? "much higher" : "higher"} than usual in the next
              7 days ({details.flood.peakRatio}× the seasonal mean). Check low-lying fields and oshanas.
            </p>
          )}

          {crops ? (
            <div className="fv-crops">
              <h4><Sprout size={16} /> What suits this area</h4>
              <p className="fv-muted">
                Rainy season (Nov–Apr) brings about {rainMm} mm here on average
                {onset ? `, and rains usually start in ${MONTH_NAMES[onset]}` : ""}.
              </p>
              {crops.slice(0, 5).map((c) => (
                <div className="fv-crop" key={c.id}>
                  <div className="fv-crop-head">
                    <span className="dot" style={{ background: c.color }} />
                    <strong>{c.name}</strong>
                    <span className={`tag s${c.score == null ? 0 : c.score >= 80 ? 3 : c.score >= 55 ? 2 : c.score >= 30 ? 1 : 0}`}>{c.label}</span>
                  </div>
                  <div className="fv-bar"><i style={{ width: `${c.score ?? 0}%`, background: c.color }} /></div>
                  <p className="fv-muted">{c.note}</p>
                </div>
              ))}
              <p className="fv-muted fv-disclaimer">
                Indicative only, from regional climate averages (about 50 km resolution). It does not yet account for your
                soil. Check with your local agricultural extension officer before planting decisions.
              </p>
            </div>
          ) : (
            <p className="fv-warn">Climate averages are unavailable right now, so crop advice cannot be shown.</p>
          )}
        </>
      )}
    </div>
  );
}

function WeatherBlock({ weather }) {
  const { current, days, soilMoisturePct } = weather;
  const maxRain = Math.max(5, ...days.map((d) => d.rainMm || 0));
  return (
    <div className="fv-weather">
      <div className="fv-now">
        <div><Thermometer size={16} /> <strong>{Math.round(current.temperature_2m)}°C</strong></div>
        <div><Droplets size={16} /> {current.relative_humidity_2m}% humidity</div>
        <div><CloudRain size={16} /> {current.precipitation} mm now</div>
        {soilMoisturePct != null && <div><Sprout size={16} /> Topsoil {soilMoisturePct}% moisture</div>}
      </div>
      <div className="fv-days">
        {days.map((d) => (
          <div className="fv-day" key={d.date} title={`${d.date}: ${d.rainMm} mm rain, ${d.minC}–${d.maxC}°C`}>
            <span className="fv-day-rain">{d.rainMm > 0 ? Math.round(d.rainMm) : "–"}</span>
            <div className="fv-day-bar"><i style={{ height: `${Math.min(100, ((d.rainMm || 0) / maxRain) * 100)}%` }} /></div>
            <span className="fv-day-t">{Math.round(d.maxC)}°</span>
            <span className="fv-day-d">{new Date(d.date + "T00:00").toLocaleDateString(undefined, { weekday: "short" })}</span>
          </div>
        ))}
      </div>
      <p className="fv-muted">Daily rain (mm) and high (°C), next 7 days.</p>
    </div>
  );
}
