import React, { useEffect, useState } from "react";
import { CloudRain, MonitorX, Thermometer, Umbrella, Wind } from "lucide-react";
import { TOWNS } from "./config";
import { fetchSpotsNow } from "./dataClients";
import { compassPoint, windText } from "./cursorReadout";
import { t, tRich } from "../i18n";

/** True when this browser can draw the map (it needs WebGL). */
export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

const TOWN_LIST = TOWNS.filter((town) => town.major);

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
      .catch(() => live && setError(t("noMapFallback.theWeatherServiceIsnAnsweringRight")));
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
          <h2>{t("noMapFallback.theMapCanBeDrawnIn")}</h2>
          <p>
            {tRich("noMapFallback.explain", {
              settings: <strong>{t("noMapFallback.settingsSystem")}</strong>,
              option: <strong>{t("noMapFallback.accelOption")}</strong>,
            })}
          </p>
          <button type="button" className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={() => window.location.reload()}>
            {t("noMapFallback.tryAgain")}
          </button>
        </div>
      </section>

      <section className="aaf-card fv-nomap-weather">
        <h2>{t("noMapFallback.weatherNowByRegion")}</h2>
        {error && <p className="fv-note">{error}</p>}
        {!spots && !error && <p className="fv-note">{t("noMapFallback.loadingTheForecast")}</p>}
        {spots && (
          <>
            <p className="fv-note">{asOf ? t("noMapFallback.forecastNoteAsOf", { time: asOf }) : t("noMapFallback.forecastNote")}</p>
            <div className="fv-nomap-grid">
              {TOWN_LIST.map((town, i) => {
                const s = spots[i] || {};
                return (
                  <div className="fv-nomap-town" key={town.name}>
                    <strong>{town.region}</strong>
                    <span className="fv-nomap-place">{town.name}</span>
                    <span><Thermometer size={14} /> {s.temp == null ? "-" : `${s.temp.toFixed(1)} °C`}</span>
                    <span><CloudRain size={14} /> {s.rainLastHourMm == null ? "-" : t("noMapFallback.mmPastHour", { mm: s.rainLastHourMm.toFixed(1) })}</span>
                    {s.rainChance3h != null && <span><Umbrella size={14} /> {t("noMapFallback.rainChance", { value: s.rainChance3h })}</span>}
                    <span><Wind size={14} /> {s.windMs == null ? "-" : windText(s.windMs.toFixed(1), compassPoint(s.windFrom))}</span>
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
