import React, { useEffect, useRef, useState } from "react";
// eslint-disable-next-line import/no-webpack-loader-syntax
import maplibregl from "!maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BASEMAPS, NAMIBIA_BOUNDS, VIEWS } from "../farmview/config";
import { mapLocale } from "../farmview/mapLocale";
import { supportsWebGL } from "../farmview/NoMapFallback";
import { t } from "../i18n";

// One small map used for choosing a drop-off point and for following a delivery.
//   pins    [{ id, lat, lng, kind: "pickup" | "drop" | "vehicle", label }]
//   line    [[lat, lng], ...] drawn under the pins (the route so far, or the way still to go)
//   picked  { lat, lng } the point being chosen; with onPick the map is clickable and the point draggable
//   focus   { lat, lng, zoom? } move there (for "use my location" and town choices)
// The map frames every pin once, and again only when `fitKey` changes: a vehicle that moves must not
// drag the view out from under someone who is looking around.

const ICONS = {
  pickup: '<path d="M3 9l1-5h16l1 5M5 9v11h14V9M9 20v-6h6v6" />',
  drop: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  vehicle: '<path d="M2 16V6h11v10M13 9h4l4 4v3h-8M6.5 19a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM17.5 19a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z"/>',
  picked: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
};

function markerElement(kind, label) {
  const el = document.createElement("div");
  el.className = `pm-marker pm-${kind}`;
  if (label) el.title = label;
  el.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[kind] || ICONS.drop}</svg>`;
  return el;
}

export default function PinMap({ pins = [], line = null, picked = null, onPick = null, focus = null, fitKey = "", height = 280, label }) {
  const box = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef(new Map());
  const pickedMarker = useRef(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const canDraw = supportsWebGL();

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // start the map once
  useEffect(() => {
    if (!canDraw || !box.current) return undefined;
    let map;
    try {
      map = new maplibregl.Map({
        container: box.current,
        locale: mapLocale(),
        style: {
          version: 8,
          sources: {
            base: { type: "raster", tiles: BASEMAPS.streets.tiles, tileSize: 256, maxzoom: BASEMAPS.streets.maxzoom, attribution: BASEMAPS.streets.attribution },
          },
          layers: [{ id: "base", type: "raster", source: "base" }],
        },
        bounds: VIEWS.namibia.bounds,
        maxBounds: NAMIBIA_BOUNDS,
        minZoom: 4.5,
        maxZoom: 17,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      setFailed(true);
      return undefined;
    }
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (event) => {
      if (onPickRef.current) onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });
    const go = () => setReady(true);
    map.once("load", go);
    map.once("style.load", go);
    mapRef.current = map;
    const current = markers.current;
    return () => {
      current.forEach((m) => m.remove());
      current.clear();
      if (pickedMarker.current) pickedMarker.current.remove();
      pickedMarker.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [canDraw]);

  // pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const seen = new Set();
    for (const pin of pins) {
      seen.add(pin.id);
      let marker = markers.current.get(pin.id);
      if (!marker) {
        marker = new maplibregl.Marker({ element: markerElement(pin.kind, pin.label) }).setLngLat([pin.lng, pin.lat]).addTo(map);
        markers.current.set(pin.id, marker);
      } else {
        marker.setLngLat([pin.lng, pin.lat]);
      }
    }
    markers.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });
  }, [pins, ready]);

  // the point being chosen
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!picked) {
      if (pickedMarker.current) pickedMarker.current.remove();
      pickedMarker.current = null;
      return;
    }
    if (!pickedMarker.current) {
      const marker = new maplibregl.Marker({ element: markerElement("picked", ""), draggable: !!onPick }).setLngLat([picked.lng, picked.lat]).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        if (onPickRef.current) onPickRef.current({ lat, lng });
      });
      pickedMarker.current = marker;
    } else {
      pickedMarker.current.setLngLat([picked.lng, picked.lat]);
    }
  }, [picked, ready, onPick]);

  // a line on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const data = { type: "Feature", geometry: { type: "LineString", coordinates: (line || []).map(([lat, lng]) => [lng, lat]) } };
    const source = map.getSource("route");
    if (source) {
      source.setData(data);
    } else {
      map.addSource("route", { type: "geojson", data });
      map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#1f7a4d", "line-width": 4, "line-opacity": 0.8, "line-dasharray": [2, 1.5] } });
    }
  }, [line, ready]);

  // frame the pins (once, and when fitKey changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const points = pins.map((p) => [p.lng, p.lat]);
    if (picked) points.push([picked.lng, picked.lat]);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.easeTo({ center: points[0], zoom: Math.max(map.getZoom(), 11), duration: 400 });
      return;
    }
    const bounds = points.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(points[0], points[0]));
    map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;
    map.easeTo({ center: [focus.lng, focus.lat], zoom: focus.zoom || 13, duration: 500 });
  }, [focus, ready]);

  if (!canDraw || failed) return <p className="pm-nomap">{t("pinMap.noMap")}</p>;
  return <div ref={box} className="pm-map" style={{ height }} role="img" aria-label={label || t("pinMap.map")} />;
}
