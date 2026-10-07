import React from "react";
import { CloudRain, MonitorX, Thermometer, Wind } from "lucide-react";
import { TOWNS } from "./config";
import { sampleField } from "./weatherGrid";

/** True when this browser can draw the map (it needs WebGL). */
export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

const round = (n) => (n == null || Number.isNaN(n) ? null : Math.round(n));
const one = (n) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10) / 10);

/**
 * Shown instead of the map when the browser can't draw it (WebGL switched
 * off, blocked after a graphics crash, or an old phone). The weather still
 * loads, so members get it as a list for each region's main town.
 */
export default function NoMapFallback({ grid, hourIdx, gridError }) {
  const towns = TOWNS.filter((t) => t.major);
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
        {gridError && <p className="fv-note">The weather service isn't answering right now. Please try again later.</p>}
        {!grid && !gridError && <p className="fv-note">Loading the forecast...</p>}
        {grid && (
          <>
            <p className="fv-note">
              Forecast for {new Date(grid.times[hourIdx]).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Windhoek" })}{" "}
              (Namibian time), {grid.model}.
            </p>
            <div className="fv-nomap-grid">
              {towns.map((town) => {
                const temp = round(sampleField(grid, grid.temp[hourIdx], town.lng, town.lat));
                const rain = one(sampleField(grid, grid.rain[hourIdx], town.lng, town.lat));
                const wind = one(sampleField(grid, grid.speed[hourIdx], town.lng, town.lat));
                return (
                  <div className="fv-nomap-town" key={town.name}>
                    <strong>{town.region}</strong>
                    <span className="fv-nomap-place">{town.name}</span>
                    <span><Thermometer size={14} /> {temp == null ? "-" : `${temp} °C`}</span>
                    <span><CloudRain size={14} /> {rain == null ? "-" : `${rain} mm`}</span>
                    <span><Wind size={14} /> {wind == null ? "-" : `${wind} m/s`}</span>
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
