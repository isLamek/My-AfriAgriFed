import { useEffect, useState } from "react";
import { sendLocation } from "./api";

const MIN_GAP_MS = 9000; // the server keeps one position per 10 s; do not send more
const HEARTBEAT_MS = 15000; // a parked vehicle is still "live": say where it is now and then

/**
 * Shares this device's position for one order while `enabled`: the carrier on the road, or a seller
 * delivering themselves. Needs the page open (and ideally the screen on: it asks the browser to keep
 * it awake). Returns { status, last, distanceKm, etaMinutes, error } where status is
 * "idle" | "starting" | "sharing" | "denied" | "unsupported" | "error".
 */
export default function useShareLocation(orderId, enabled) {
  const [state, setState] = useState({ status: "idle", last: null, distanceKm: null, etaMinutes: null, error: "" });

  useEffect(() => {
    if (!enabled || !orderId) {
      setState((s) => (s.status === "idle" ? s : { status: "idle", last: null, distanceKm: null, etaMinutes: null, error: "" }));
      return undefined;
    }
    if (!navigator.geolocation) {
      setState({ status: "unsupported", last: null, distanceKm: null, etaMinutes: null, error: "" });
      return undefined;
    }

    let stopped = false;
    let lastSent = 0;
    let coords = null;
    let wakeLock = null;
    setState((s) => ({ ...s, status: "starting" }));

    const push = async () => {
      if (stopped || !coords) return;
      const now = Date.now();
      if (now - lastSent < MIN_GAP_MS) return;
      lastSent = now;
      try {
        const speed = coords.speed != null && Number.isFinite(coords.speed) ? coords.speed * 3.6 : undefined;
        const reply = await sendLocation(orderId, { lat: coords.latitude, lng: coords.longitude, ...(speed !== undefined ? { speedKmh: speed } : {}) });
        if (!stopped) setState({ status: "sharing", last: now, distanceKm: reply.distanceKm ?? null, etaMinutes: reply.etaMinutes ?? null, error: "" });
      } catch (error) {
        if (!stopped) setState((s) => ({ ...s, status: "error", error: error.message }));
      }
    };

    const watch = navigator.geolocation.watchPosition(
      (position) => {
        coords = position.coords;
        push();
      },
      (error) => {
        if (stopped) return;
        setState((s) => ({ ...s, status: error.code === 1 ? "denied" : "error", error: error.message }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    );
    const heartbeat = setInterval(push, HEARTBEAT_MS);

    if (navigator.wakeLock && navigator.wakeLock.request) {
      navigator.wakeLock.request("screen").then((lock) => {
        if (stopped) lock.release().catch(() => {});
        else wakeLock = lock;
      }).catch(() => {});
    }

    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watch);
      clearInterval(heartbeat);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [orderId, enabled]);

  return state;
}
