import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layers, MapPin, Pause, Play, Wind } from "lucide-react";
// The "!" prefix skips Create React App's Babel pass over the library. Babel
// rewrites the functions MapLibre ships to its web worker and breaks the
// production build; the library is already compiled, so leave it alone.
// eslint-disable-next-line import/no-webpack-loader-syntax
import maplibregl from "!maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useAccountContext from "./useAccountContext";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import PointDetails from "./MapDetails";
import { FarmDetails, FarmForm, FarmsSection } from "./MapFarms";
import { auth } from "./firebaseConfig";
import { subscribeFarms } from "./farms";
import { BASEMAPS, NAMIBIA_BOUNDS, TIMEZONE, TOWNS, VIEWS, WEATHER_LAYERS } from "./farmview/config";
import { fetchClimate, fetchFlood, fetchPointWeather } from "./farmview/dataClients";
import { fetchNationalGrid, nowIndex } from "./farmview/weatherGrid";
import { RAMPS, rampColor, rasterCoordinates, renderField } from "./farmview/fieldRaster";
import { fetchSatelliteTimes, frameTimes, satelliteTileUrl } from "./farmview/satellite";
import { REGIONS_URL, findRegion, labelPoint, regionLabel } from "./farmview/regions";
import WindParticles from "./farmview/windParticles";
import "./MapPage.css";

const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const SAT_FRAMES = 12;

const framePadding = () =>
  window.innerWidth > 1100 ? { top: 24, right: 24, bottom: 70, left: 290 } : { top: 150, right: 12, bottom: 70, left: 12 };

const formatLocal = (ms) =>
  new Date(ms).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE }) + " CAT";

function bboxOf(geometry) {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys) for (const [x, y] of poly[0]) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
  return [w, s, e, n];
}

const legendGradient = (ramp, legend) => {
  const [lo, hi] = [legend[0], legend[legend.length - 1]];
  const stops = Array.from({ length: 8 }, (_, i) => {
    const [r, g, b] = rampColor(ramp, lo + ((hi - lo) * i) / 7);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  });
  return `linear-gradient(90deg, ${stops.join(",")})`;
};

export default function MapPage() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const windRef = useRef(null);
  const domMarkersRef = useRef([]);
  const gridRef = useRef(null);
  const hourRef = useRef(0);
  const placingRef = useRef(false);
  const farmMarkersRef = useRef([]);

  const { theme, navSections, logout, userType } = useAccountContext("/map");
  const isFarmer = userType === "farmer";

  const [mapReady, setMapReady] = useState(false);
  const [overlaysReady, setOverlaysReady] = useState(false); // region layers exist; weather can slot under them
  const [basemap, setBasemap] = useState("satellite");
  const [regions, setRegions] = useState(null);
  const [grid, setGrid] = useState(null);
  const [gridError, setGridError] = useState("");
  const [layerId, setLayerId] = useState("none");
  const [windOn, setWindOn] = useState(true);
  const [hourIdx, setHourIdx] = useState(0);
  const [frames, setFrames] = useState(null); // satellite frame times (ms), oldest first
  const [frameIdx, setFrameIdx] = useState(0);
  const [satError, setSatError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [picked, setPicked] = useState(null);
  const [details, setDetails] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [farms, setFarms] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState(null); // a tapped spot for a new farm
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [panelTab, setPanelTab] = useState("farm"); // "farm" | "conditions"

  const layer = useMemo(() => WEATHER_LAYERS.find((l) => l.id === layerId) || WEATHER_LAYERS[0], [layerId]);
  const isSat = layer.kind === "sat";
  const modelTimeline = !isSat && (layer.kind === "model" || windOn);
  const pickedRegion = useMemo(() => (picked && regions ? findRegion(picked.lng, picked.lat, regions) : null), [picked, regions]);

  // ---- data: regions and the national forecast grid -------------------------
  useEffect(() => {
    let cancelled = false;
    fetch(REGIONS_URL)
      .then((r) => r.json())
      .then((json) => !cancelled && setRegions({ ...json, features: json.features.map((f, i) => ({ ...f, id: i })) }))
      .catch(() => {});
    fetchNationalGrid()
      .then((g) => {
        if (cancelled) return;
        gridRef.current = g;
        const now = nowIndex(g.times);
        hourRef.current = now;
        setHourIdx(now);
        setGrid(g);
      })
      .catch((e) => !cancelled && setGridError(e.message));
    return () => {
      cancelled = true;
    };
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
      bounds: VIEWS.oshana.bounds,
      fitBoundsOptions: { padding: framePadding() },
      maxBounds: NAMIBIA_BOUNDS,
      minZoom: 4.5,
      maxZoom: 16,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    setMapReady(false);
    setOverlaysReady(false);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "top-right");
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") window.__fvMap = map; // handy when debugging in dev tools

    // Zoom bands drive which labels show (see MapPage.css).
    const setZoomBand = () => {
      const z = map.getZoom();
      const el = containerRef.current;
      if (el) el.dataset.band = z < 6 ? "low" : z < 8 ? "mid" : "high";
    };
    map.on("zoom", setZoomBand);
    setZoomBand();

    // "style.load" (not "load"): "load" waits for the first satellite tiles,
    // which on a slow connection would hold back the overlays.
    map.once("style.load", () => setMapReady(true));
    map.on("click", (e) => {
      const spot = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (placingRef.current) {
        // Adding a farm: this tap is the farm's location, not a weather lookup.
        placingRef.current = false;
        setPlacing(false);
        setSelectedFarmId(null);
        setDraft(spot);
        return;
      }
      setDraft(null);
      setSelectedFarmId(null);
      setPicked(spot);
    });

    return () => {
      windRef.current?.destroy();
      windRef.current = null;
      domMarkersRef.current.forEach((m) => m.remove());
      domMarkersRef.current = [];
      farmMarkersRef.current.forEach((m) => m.remove());
      farmMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- region outlines, labels, and the layer slots weather draws into -------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !regions || map.getSource("regions")) return;

    map.addSource("regions", {
      type: "geojson",
      data: regions,
      // Image sources cannot carry an attribution, so the forecast credit rides here.
      attribution: "Regions © OpenStreetMap contributors (ODbL) · Forecast: ECMWF IFS via Open-Meteo.com (CC BY 4.0)",
    });
    map.addLayer({
      id: "regions-fill",
      type: "fill",
      source: "regions",
      paint: { "fill-color": "#7bb141", "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.14, 0] },
    });
    map.addLayer({ id: "regions-line", type: "line", source: "regions", paint: { "line-color": "#ffffff", "line-opacity": 0.75, "line-width": 1.1 } });
    map.addLayer({
      id: "regions-selected",
      type: "line",
      source: "regions",
      paint: { "line-color": "#7bb141", "line-width": 2.6, "line-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 1, 0] },
    });

    // Weather image slot (under the borders) - filled by the effect below.
    map.addSource("wx-field", {
      type: "image",
      url: BLANK,
      coordinates: rasterCoordinates([11.5, -29.2, 25.4, -16.8]),
    });
    map.addLayer(
      { id: "wx-field", type: "raster", source: "wx-field", layout: { visibility: "none" }, paint: { "raster-fade-duration": 0, "raster-resampling": "linear" } },
      "regions-fill"
    );

    // Region names and towns as DOM labels (no font server needed).
    regions.features.forEach((f) => {
      const el = document.createElement("div");
      el.className = "fv-region-label";
      el.textContent = regionLabel(f.properties.name);
      domMarkersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat(labelPoint(f.geometry)).addTo(map));
    });
    TOWNS.forEach((town) => {
      const el = document.createElement("div");
      el.className = `fv-town${town.major ? " major" : ""}`;
      el.innerHTML = `<span></span>${town.name}`;
      domMarkersRef.current.push(new maplibregl.Marker({ element: el, anchor: "left" }).setLngLat([town.lng, town.lat]).addTo(map));
    });
    setOverlaysReady(true);
  }, [mapReady, regions]);

  // ---- basemap switch -------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    Object.keys(BASEMAPS).forEach((id) => map.setLayoutProperty(`base-${id}`, "visibility", id === basemap ? "visible" : "none"));
  }, [basemap, mapReady]);

  // ---- highlight the region of the tapped point ------------------------------
  const selectedRef = useRef(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getSource("regions")) return;
    if (selectedRef.current != null) map.setFeatureState({ source: "regions", id: selectedRef.current }, { selected: false });
    selectedRef.current = null;
    if (pickedRegion) {
      selectedRef.current = pickedRegion.id;
      map.setFeatureState({ source: "regions", id: pickedRegion.id }, { selected: true });
    }
  }, [pickedRegion, mapReady, regions]);

  // ---- weather field on the map (rain, temperature, or wind-speed shading) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !overlaysReady || !grid || !regions) return;
    hourRef.current = hourIdx;

    let ramp = null;
    let values = null;
    if (layer.kind === "model") {
      ramp = layer.field === "rain" ? RAMPS.rain : RAMPS.temp;
      values = grid[layer.field][hourIdx];
    } else if (layer.kind === "none" && windOn) {
      ramp = RAMPS.speed;
      values = grid.speed[hourIdx];
    }

    if (!ramp) {
      map.setLayoutProperty("wx-field", "visibility", "none");
      return;
    }
    const slot = map.getSource("wx-field");
    if (!slot) {
      console.warn("[map] weather image slot is missing; skipping draw");
      return;
    }
    const canvas = renderField(grid, values, ramp, regions);
    slot.updateImage({ url: canvas.toDataURL("image/png"), coordinates: rasterCoordinates(grid.bounds) });
    map.setLayoutProperty("wx-field", "visibility", "visible");
    windRef.current?.refresh();
  }, [overlaysReady, grid, regions, layer, windOn, hourIdx]);

  // ---- animated wind ---------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!windRef.current) windRef.current = new WindParticles(map, () => (gridRef.current ? { grid: gridRef.current, hour: hourRef.current } : null));
    if (windOn && grid) windRef.current.start();
    else windRef.current.stop();
  }, [mapReady, grid, windOn]);

  // ---- live satellite layers --------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !overlaysReady) return undefined;
    // Clear whatever satellite layer was showing.
    if (map.getLayer("sat")) map.removeLayer("sat");
    if (map.getSource("sat")) map.removeSource("sat");
    setFrames(null);
    setSatError("");
    if (!isSat) return undefined;

    let cancelled = false;
    fetchSatelliteTimes(layer)
      .then((extent) => {
        if (cancelled) return;
        const list = frameTimes(extent, SAT_FRAMES);
        setFrames(list);
        setFrameIdx(list.length - 1);
        map.addSource("sat", {
          type: "raster",
          tiles: [satelliteTileUrl(layer, list[list.length - 1])],
          tileSize: 256,
          maxzoom: 9,
          attribution: "Satellite imagery © EUMETSAT",
        });
        map.addLayer({ id: "sat", type: "raster", source: "sat", paint: { "raster-opacity": layer.id === "lightning" ? 1 : 0.85, "raster-fade-duration": 0 } }, "regions-fill");
      })
      .catch((e) => !cancelled && setSatError(e.message));
    return () => {
      cancelled = true;
    };
  }, [overlaysReady, layer, isSat]);

  useEffect(() => {
    const map = mapRef.current;
    const src = map && map.getSource && map.getSource("sat");
    if (src && frames && isSat) src.setTiles([satelliteTileUrl(layer, frames[frameIdx])]);
  }, [frameIdx, frames, isSat, layer]);

  // ---- play / pause the timeline ---------------------------------------------
  useEffect(() => {
    if (!playing) return undefined;
    const length = isSat ? frames?.length : grid?.times.length;
    if (!length) return undefined;
    const id = setInterval(() => {
      if (isSat) setFrameIdx((i) => (i + 1) % length);
      else setHourIdx((i) => (i + 1) % length);
    }, isSat ? 1100 : 700);
    return () => clearInterval(id);
  }, [playing, isSat, frames, grid]);

  useEffect(() => {
    setPlaying(false);
  }, [layerId, windOn]);

  // ---- the signed-in farmer's own farms -----------------------------------------
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!isFarmer || !uid) {
      setFarms([]);
      return undefined;
    }
    return subscribeFarms(uid, setFarms, () => setFarms([]));
  }, [isFarmer]);

  const selectFarm = useCallback(
    (farm) => {
      placingRef.current = false;
      setPlacing(false);
      setDraft(null);
      setSelectedFarmId(farm.id);
      setPanelTab("farm");
      setPanelOpen(true);
      setPicked({ lat: farm.lat, lng: farm.lng });
      mapRef.current?.flyTo({ center: [farm.lng, farm.lat], zoom: Math.max(mapRef.current.getZoom(), 10), padding: framePadding() });
    },
    []
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    farmMarkersRef.current.forEach((m) => m.remove());
    farmMarkersRef.current = farms.map((farm) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `fv-farm-pin${farm.id === selectedFarmId ? " on" : ""}`;
      el.title = farm.name;
      el.setAttribute("aria-label", `Farm: ${farm.name}`);
      const label = document.createElement("span");
      label.textContent = farm.name; // textContent, never innerHTML: names are typed by users
      el.appendChild(label);
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // do not also treat this as a map tap
        selectFarm(farm);
      });
      return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([farm.lng, farm.lat]).addTo(map);
    });
  }, [farms, mapReady, selectedFarmId, selectFarm]);

  const startPlacing = () => {
    placingRef.current = true;
    setPlacing(true);
    setDraft(null);
    setSelectedFarmId(null);
  };
  const cancelPlacing = () => {
    placingRef.current = false;
    setPlacing(false);
  };

  // ---- tap a point: weather + climate + flood in parallel -----------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !picked) return undefined;

    if (!markerRef.current) {
      const el = document.createElement("div");
      el.className = "fv-pin";
      markerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" });
    }
    markerRef.current.setLngLat([picked.lng, picked.lat]).addTo(map);

    let cancelled = false;
    setPanelOpen(true);
    setDetails({ loading: true });
    Promise.allSettled([fetchPointWeather(picked.lat, picked.lng), fetchClimate(picked.lat, picked.lng), fetchFlood(picked.lat, picked.lng)]).then(
      ([weather, climate, flood]) => {
        if (cancelled) return;
        setDetails({
          loading: false,
          weather: weather.status === "fulfilled" ? weather.value : null,
          climate: climate.status === "fulfilled" ? climate.value : null,
          flood: flood.status === "fulfilled" ? flood.value : null,
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [picked, mapReady]);

  const flyToBounds = useCallback((bounds) => mapRef.current?.fitBounds(bounds, { padding: framePadding(), duration: 900 }), []);

  const goToRegion = (name) => {
    const feature = regions?.features.find((f) => f.properties.name === name);
    if (feature) flyToBounds(bboxOf(feature.geometry));
  };

  // ---- timeline numbers -------------------------------------------------------
  const timelineLength = isSat ? frames?.length || 0 : grid?.times.length || 0;
  const timelineIdx = isSat ? frameIdx : hourIdx;
  const showTimeline = (isSat && frames) || (modelTimeline && grid);
  let timeLabel = "";
  let agoLabel = "";
  if (showTimeline) {
    const ms = isSat ? frames[frameIdx] : new Date(grid.times[hourIdx]).getTime();
    timeLabel = formatLocal(ms);
    const diffMin = Math.round((ms - Date.now()) / 60000);
    agoLabel = Math.abs(diffMin) < 8 ? "now" : diffMin < 0 ? `${Math.round(-diffMin / 6) / 10} h ago` : `in ${Math.round(diffMin / 6) / 10} h`;
  }

  const selectedFarm = useMemo(() => farms.find((f) => f.id === selectedFarmId) || null, [farms, selectedFarmId]);
  const draftRegion = useMemo(() => (draft && regions ? findRegion(draft.lng, draft.lat, regions) : null), [draft, regions]);
  const showPanel = !!(picked || draft || selectedFarm);

  const legendDef = layer.kind === "model" ? { ramp: layer.field === "rain" ? RAMPS.rain : RAMPS.temp, values: layer.legend } : null;

  return (
    <AppShell
      eyebrow="Namibia"
      title="Map"
      subtitle="Live weather, satellite and farming information, region by region."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <div className="fv-wrap">
        <div className="fv-map" data-band="mid" ref={containerRef} />

        <div className="fv-controls aaf-card">
          <div className="fv-seg" role="group" aria-label="Map type">
            {Object.entries(BASEMAPS).map(([id, b]) => (
              <button key={id} className={basemap === id ? "on" : ""} onClick={() => setBasemap(id)}>
                {b.label}
              </button>
            ))}
          </div>

          <p className="fv-label"><Layers size={14} /> Weather</p>
          <div className="fv-layers">
            {WEATHER_LAYERS.filter((l) => l.id !== "none").map((l) => (
              <button key={l.id} className={layerId === l.id ? "on" : ""} onClick={() => setLayerId(layerId === l.id ? "none" : l.id)}>
                {l.label}
              </button>
            ))}
            <button className={`fv-wind ${windOn ? "on" : ""}`} onClick={() => setWindOn((v) => !v)} aria-pressed={windOn}>
              <Wind size={13} /> Wind
            </button>
          </div>

          {(layer.kind !== "none" || windOn) && (
            <div className="fv-legend">
              {legendDef && (
                <>
                  <div className="fv-ramp" style={{ background: legendGradient(legendDef.ramp, legendDef.values) }} />
                  <div className="fv-ramp-labels">
                    <span>{legendDef.values[0]}</span>
                    <span>{legendDef.values[legendDef.values.length - 1]}+ {layer.unit}</span>
                  </div>
                </>
              )}
              {layer.kind !== "none" && <p className="fv-note">{layer.note}</p>}
              {windOn && layer.kind !== "sat" && <p className="fv-note">Wind: modelled flow 10 m above ground; faster wind shows brighter trails.</p>}
              <p className="fv-source">
                {[layer.source, windOn && layer.kind !== "sat" ? "Wind: ECMWF IFS 0.25° via Open-Meteo" : null].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}
          {gridError && <p className="fv-warn">Could not load the forecast grid ({gridError}). Satellite layers and tap-for-weather still work.</p>}
          {!grid && !gridError && <p className="fv-muted">Loading forecast…</p>}
          {satError && <p className="fv-warn">Satellite imagery is unavailable right now ({satError}).</p>}

          {isFarmer && (
            <FarmsSection
              farms={farms}
              selectedId={selectedFarmId}
              placing={placing}
              onSelect={selectFarm}
              onAdd={startPlacing}
              onCancelPlacing={cancelPlacing}
            />
          )}

          <div className="fv-jump">
            <p className="fv-label"><MapPin size={14} /> Go to</p>
            <div className="fv-layers">
              <button onClick={() => flyToBounds(VIEWS.namibia.bounds)}>All Namibia</button>
              <button onClick={() => flyToBounds(VIEWS.oshana.bounds)}>Oshana</button>
            </div>
            <select
              className="fv-select"
              aria-label="Go to a region"
              value=""
              onChange={(e) => e.target.value && goToRegion(e.target.value)}
            >
              <option value="">Choose a region…</option>
              {(regions?.features || []).map((f) => (
                <option key={f.properties.name} value={f.properties.name}>
                  {regionLabel(f.properties.name)}
                </option>
              ))}
            </select>
          </div>
          <p className="fv-muted fv-tip">Tap anywhere on the map for that spot's weather and crop information.</p>
        </div>

        {showTimeline && timelineLength > 0 && (
          <div className="fv-timeline aaf-card" role="group" aria-label="Time">
            <button className="fv-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={timelineLength - 1}
              value={timelineIdx}
              onChange={(e) => (isSat ? setFrameIdx(Number(e.target.value)) : setHourIdx(Number(e.target.value)))}
              aria-label="Time"
            />
            <div className="fv-time">
              <strong>{timeLabel}</strong>
              <span>{agoLabel} · {isSat ? "Observed" : "Forecast"}</span>
            </div>
          </div>
        )}

        {showPanel && (
          <aside className={`fv-panel aaf-card ${panelOpen ? "open" : "closed"}`}>
            <button className="fv-panel-toggle" onClick={() => setPanelOpen((v) => !v)} aria-label="Toggle details">
              {panelOpen ? "Hide details" : "Show details"}
            </button>

            {draft ? (
              <FarmForm
                draft={draft}
                region={draftRegion}
                onCancel={() => setDraft(null)}
                onSaved={(id) => {
                  setDraft(null);
                  setSelectedFarmId(id);
                  setPanelTab("farm");
                  setPicked({ lat: draft.lat, lng: draft.lng });
                }}
              />
            ) : (
              <>
                {selectedFarm && (
                  <div className="fv-tabs" role="tablist">
                    <button role="tab" aria-selected={panelTab === "farm"} className={panelTab === "farm" ? "on" : ""} onClick={() => setPanelTab("farm")}>My farm</button>
                    <button role="tab" aria-selected={panelTab === "conditions"} className={panelTab === "conditions" ? "on" : ""} onClick={() => setPanelTab("conditions")}>Weather &amp; crops</button>
                  </div>
                )}
                {selectedFarm && panelTab === "farm" ? (
                  <FarmDetails key={selectedFarm.id} farm={selectedFarm} onDeleted={() => { setSelectedFarmId(null); setPicked(null); }} />
                ) : (
                  picked && <PointDetails picked={picked} region={pickedRegion} details={details} />
                )}
              </>
            )}
          </aside>
        )}
      </div>
    </AppShell>
  );
}
