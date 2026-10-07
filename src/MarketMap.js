import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
// eslint-disable-next-line import/no-webpack-loader-syntax
import maplibregl from "!maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, MessageCircle, ShoppingBasket, Tag, X } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import useAccountContext from "./useAccountContext";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import { chatWith } from "./chat";
import { BASEMAPS, NAMIBIA_BOUNDS, VIEWS } from "./farmview/config";
import { supportsWebGL } from "./farmview/NoMapFallback";
import { validLocation } from "./marketLocation";
import { maskContactInfo } from "./contactGuard";
import "./MarketMap.css";

const money = (n) => `N$${Number(n || 0).toLocaleString("en-NA", { maximumFractionDigits: 2 })}`;

/** Posts at the same spot share one pin (many people pick the same town). */
export function groupByPlace(items) {
  const groups = new Map();
  for (const item of items) {
    const key = `${item.location.lat.toFixed(2)},${item.location.lng.toFixed(2)}`;
    if (!groups.has(key)) groups.set(key, { key, lat: item.location.lat, lng: item.location.lng, label: item.location.label, items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()];
}

/** Market posts with a location, as { kind: "sale" | "wanted", ... }. */
export function toPins(listings, demands) {
  const sale = listings
    .filter((l) => l.location && validLocation(l.location))
    .map((l) => ({ kind: "sale", id: l.id, title: l.product, ownerId: l.sellerId, ownerName: l.sellerName, location: l.location, data: l }));
  const wanted = demands
    .filter((d) => d.status === "open" && d.location && validLocation(d.location))
    .map((d) => ({ kind: "wanted", id: d.id, title: d.title || d.product, ownerId: d.buyerId, ownerName: d.buyerName, location: d.location, data: d }));
  return [...sale, ...wanted];
}

function PinCard({ group, onClose }) {
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;
  return (
    <aside className="mm-card aaf-card" aria-label={`Posts at ${group.label}`}>
      <header>
        <h2><MapPin size={16} /> {group.label}</h2>
        <button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </header>
      <ul>
        {group.items.map((item) => {
          const d = item.data;
          const mine = item.ownerId === uid;
          const soldOut = item.kind === "sale" && d.quantity === 0;
          return (
            <li key={`${item.kind}-${item.id}`} className={`mm-item ${item.kind}`}>
              <span className="mm-badge">{item.kind === "sale" ? "For sale" : "Wanted"}</span>
              <strong>{item.title}</strong>
              {item.kind === "sale" ? (
                <span className="mm-meta">
                  {money(d.price)} / {d.unit || "kg"}
                  {d.quantity != null && (soldOut ? " · sold out" : ` · ${d.quantity} left`)}
                </span>
              ) : (
                <span className="mm-meta">
                  {d.quantityNeeded} {d.unit} needed{d.deadline ? ` by ${d.deadline}` : ""}
                </span>
              )}
              {item.kind === "wanted" && d.notes && <span className="mm-notes">{maskContactInfo(d.notes).slice(0, 140)}</span>}
              <span className="mm-owner">{item.kind === "sale" ? "Sold by" : "Requested by"} {mine ? "you" : item.ownerName || "a member"}</span>
              <div className="mm-actions">
                {item.kind === "sale" ? (
                  <button type="button" className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={() => navigate("/dashboard", { state: { page: "prices" } })}>
                    <ShoppingBasket size={14} /> {soldOut ? "See marketplace" : "Buy in marketplace"}
                  </button>
                ) : (
                  <button type="button" className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={() => navigate("/demand-board")}>
                    <Tag size={14} /> Open on Demand Board
                  </button>
                )}
                {!mine && item.ownerId && (
                  <button
                    type="button"
                    className="aaf-btn aaf-btn-ghost aaf-btn-sm"
                    onClick={() =>
                      chatWith(navigate, {
                        otherId: item.ownerId,
                        otherName: item.ownerName || "Member",
                        topic: { kind: item.kind === "sale" ? "listing" : "demand", id: item.id, title: item.title },
                      })
                    }
                  >
                    <MessageCircle size={14} /> Message {item.kind === "sale" ? "seller" : "buyer"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default function MarketMap() {
  const { theme, navSections, logout } = useAccountContext("/market-map");
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [noMap, setNoMap] = useState(() => !supportsWebGL());
  const [mapReady, setMapReady] = useState(false);
  const [listings, setListings] = useState([]);
  const [demands, setDemands] = useState([]);
  const [show, setShow] = useState({ sale: true, wanted: true });
  const [selectedKey, setSelectedKey] = useState(null);

  // ---- live posts ----
  useEffect(() => {
    const offListings = onSnapshot(collection(db, "marketPrices"), (snap) => setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setListings([]));
    const offDemands = onSnapshot(query(collection(db, "demandRequests"), where("status", "==", "open")), (snap) => setDemands(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setDemands([]));
    return () => {
      offListings();
      offDemands();
    };
  }, []);

  const pins = useMemo(() => toPins(listings, demands), [listings, demands]);
  const visible = useMemo(() => pins.filter((p) => show[p.kind]), [pins, show]);
  const groups = useMemo(() => groupByPlace(visible), [visible]);
  const counts = useMemo(() => ({ sale: pins.filter((p) => p.kind === "sale").length, wanted: pins.filter((p) => p.kind === "wanted").length }), [pins]);
  const selected = groups.find((g) => g.key === selectedKey) || null;

  // ---- the map (streets: pins read best on a plain base) ----
  useEffect(() => {
    if (noMap) return undefined;
    let map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: { streets: { type: "raster", tiles: BASEMAPS.streets.tiles, tileSize: 256, maxzoom: BASEMAPS.streets.maxzoom, attribution: BASEMAPS.streets.attribution } },
          layers: [{ id: "streets", type: "raster", source: "streets" }],
        },
        bounds: VIEWS.namibia.bounds,
        maxBounds: NAMIBIA_BOUNDS,
        minZoom: 4.5,
        maxZoom: 16,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch (error) {
      console.warn("[market map] could not start:", error?.message || error);
      setNoMap(true);
      return undefined;
    }
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // ready as soon as the style is in (whichever of these comes first)
    const ready = () => setMapReady(true);
    map.once("style.load", ready);
    map.once("load", ready);
    if (map.isStyleLoaded()) ready();
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") window.__mmMap = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [noMap]);

  // ---- pins ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = groups.map((group) => {
      const sale = group.items.filter((i) => i.kind === "sale").length;
      const wanted = group.items.length - sale;
      const el = document.createElement("button");
      el.type = "button";
      el.className = `mm-pin ${sale && wanted ? "both" : sale ? "sale" : "wanted"}${group.key === selectedKey ? " on" : ""}`;
      el.setAttribute("aria-label", `${group.label}: ${sale} for sale, ${wanted} wanted`);
      const first = group.items[0];
      // textContent only: titles are typed by members
      el.textContent =
        group.items.length > 1
          ? `${group.items.length} posts`
          : first.kind === "sale"
          ? `${first.title} · ${money(first.data.price)}`
          : `Wanted: ${first.title}`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedKey(group.key);
        map.flyTo({ center: [group.lng, group.lat], zoom: Math.max(map.getZoom(), 9), duration: 700 });
      });
      return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([group.lng, group.lat]).addTo(map);
    });
  }, [groups, mapReady, selectedKey]);

  const toggle = (kind) => setShow((prev) => ({ ...prev, [kind]: !prev[kind] }));

  return (
    <AppShell
      eyebrow="Marketplace"
      title="Market Map"
      subtitle="Where produce is for sale and where buyers need it. Pins show the area, never anyone's exact spot."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <div className="mm-toolbar">
        <button type="button" className={`mm-chip sale ${show.sale ? "on" : ""}`} onClick={() => toggle("sale")} aria-pressed={show.sale}>
          <span className="mm-dot" /> For sale ({counts.sale})
        </button>
        <button type="button" className={`mm-chip wanted ${show.wanted ? "on" : ""}`} onClick={() => toggle("wanted")} aria-pressed={show.wanted}>
          <span className="mm-dot" /> Wanted ({counts.wanted})
        </button>
        <span className="mm-tip">Add a pin: choose "Where is it?" when you post a listing or a Demand Board request.</span>
      </div>

      {noMap ? (
        <section className="aaf-card mm-list">
          <p className="mm-tip">This browser can't draw maps right now (graphics are switched off), so here are the same posts by place.</p>
          {groups.length === 0 && <p>No posts with a location yet.</p>}
          {groups.map((g) => (
            <PinCard key={g.key} group={g} onClose={() => {}} />
          ))}
        </section>
      ) : (
        <div className="mm-wrap">
          <div className="mm-map" ref={containerRef} />
          {mapReady && pins.length === 0 && (
            <div className="mm-empty aaf-card">
              <MapPin size={18} />
              <p>
                No posts with a location yet. When you add a listing or a Demand Board request, choose <strong>Where is it?</strong> and it
                appears here.
              </p>
            </div>
          )}
          {selected && <PinCard group={selected} onClose={() => setSelectedKey(null)} />}
        </div>
      )}
    </AppShell>
  );
}
