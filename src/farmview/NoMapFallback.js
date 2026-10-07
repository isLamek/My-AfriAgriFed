import React, { useEffect, useState } from "react";
import { CloudRain, MonitorX, Thermometer, Umbrella, Wind } from "lucide-react";
import { TOWNS } from "./config";
import { fetchSpotsNow } from "./dataClients";
import { compassPoint } from "./cursorReadout";

/** True when this browser can draw the map (it needs WebGL). */
export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

const TOWN_LIST = TOWNS.filter((t) => t.major);

/**
 * Shown instead of the map when the browser can't draw it (WebGL switched
 * off, blocked after a graphics crash, or an old phone): the current weather
 * for each region's main town, from each town's own forecast.
 */
export default function NoMapFallback() {
  const [spots, setSpots] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetchSpotsNow(TOWN_LIST)
      .then((list) => live && setSpots(list))
      .catch(() => live && setError("The weather service isn't answering right now. Please try again later."));
    return () => {
      live = false;
    };
  }, []);

  const asOf = spots?.[0]?.at
    ? new Date(spots[0].at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Windhoek" })
    : "";

  return (
    <div className="fv-nomap">
      <section className="aaf-card fv-nomap-note">
        <MonitorX size={22} aria-hidden="true" />
        <div>
          <h2>The map can't be drawn in this browser right now</h2>
          <p>
            It needs your browser's graphics (WebGL), which is switched off or was blocked after a graphics problem. Usually
            restarting the browser fixes it. In Chrome you can also open <strong>Settings, System</strong> and turn on{" "}
            <strong>"Use graphics acceleration when available"</strong>, then restart Chrome.
          </p>
          <button type="button" className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </section>

      <section className="aaf-card fv-nomap-weather">
        <h2>Weather now, by region</h2>
        {error && <p className="fv-note">{error}</p>}
        {!spots && !error && <p className="fv-note">Loading the forecast...</p>}
        {spots && (
          <>
            <p className="fv-note">Each town's own forecast (corrected for its altitude){asOf ? `, as of ${asOf} Namibian time` : ""}.</p>
            <div className="fv-nomap-grid">
              {TOWN_LIST.map((town, i) => {
                const s = spots[i] || {};
                return (
                  <div className="fv-nomap-town" key={town.name}>
                    <strong>{town.region}</strong>
                    <span className="fv-nomap-place">{town.name}</span>
                    <span><Thermometer size={14} /> {s.temp == null ? "-" : `${s.temp.toFixed(1)} °C`}</span>
                    <span><CloudRain size={14} /> {s.rainLastHourMm == null ? "-" : `${s.rainLastHourMm.toFixed(1)} mm past hour`}</span>
                    {s.rainChance3h != null && <span><Umbrella size={14} /> {s.rainChance3h}% rain chance, 3 h</span>}
                    <span><Wind size={14} /> {s.windMs == null ? "-" : `${s.windMs.toFixed(1)} m/s ${compassPoint(s.windFrom)}`}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
