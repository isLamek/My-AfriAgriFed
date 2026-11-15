import React, { useMemo } from "react";
import { CloudRain, Droplets, Flame, Sprout, Thermometer, Umbrella, Waves, Wind } from "lucide-react";
import { compassPoint, windText } from "./farmview/cursorReadout";
import { TOWNS } from "./farmview/config";
import { regionLabel } from "./farmview/regions";
import { describeAge, fireLevel, firesNear } from "./farmview/fires";
import { scoreCrops, seasonalRainMm, seasonalTempC, typicalRainOnset } from "./farmview/cropRules";
import { t, tv, tRich, formatDate } from "./i18n";

const MONTH_NAMES = { JAN: "January", FEB: "February", MAR: "March", APR: "April", MAY: "May", JUN: "June", JUL: "July", AUG: "August", SEP: "September", OCT: "October", NOV: "November", DEC: "December" };

export function nearestTown(lat, lng) {
  let best = null;
  let bestKm = Infinity;
  for (const town of TOWNS) {
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

/**
 * Fire hotspots near a spot. `fires` is { list, error? } once the fire data has
 * loaded, or null while it is switched off / loading (then nothing is shown,
 * because "no data" must never read as "no fire").
 */
export function FireWatch({ point, fires, km = 25 }) {
  const near = useMemo(() => (fires?.list ? firesNear(point, fires.list, { km }) : null), [point, fires, km]);
  if (!fires) return null;
  if (fires.error || !near) return <p className="fv-muted">{t("mapDetails.fireHotspotDataIsUnavailableRight")}</p>;

  const level = fireLevel(near);
  return (
    <div className={`fv-fire ${level}`}>
      <p>
        <Flame size={16} />{" "}
        {level === "none" ? (
          <>{t("mapDetails.noFires", { km })}</>
        ) : (
          <>
            {tRich("mapDetails.fireNear", {
              hotspots: <strong>{t("mapDetails.hotspotCount", { count: near.count })}</strong>,
              km,
              distance: near.nearest.distanceKm,
              age: describeAge(near.nearest.ageHours),
            })}
          </>
        )}
      </p>
      <p className="fv-muted">
        {t("mapDetails.hotspotsAreSatelliteHeatDetectionsNot")}
      </p>
    </div>
  );
}

/** Everything we know about one tapped spot. */
export default function PointDetails({ picked, region, details, fires }) {
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
      <h3>{region ? t("mapDetails.regionName", { name: regionLabel(region.properties.name) }) : t("mapDetails.outsideNamibia")}</h3>
      <p className="fv-muted">
        {picked.lat.toFixed(3)}°, {picked.lng.toFixed(3)}°
        {town ? ` · ${town.km <= 1 ? t("mapDetails.inTown", { name: town.name }) : t("mapDetails.kmFromTown", { km: town.km, name: town.name })}` : ""}
      </p>

      <FireWatch point={picked} fires={fires} />

      {details?.loading && <p className="fv-muted">{t("mapDetails.loadingConditions")}</p>}

      {details && !details.loading && (
        <>
          {details.weather ? <WeatherBlock weather={details.weather} /> : <p className="fv-warn">{t("mapDetails.weatherIsUnavailableRightNow")}</p>}

          {details.flood && details.flood.level !== "normal" && (
            <p className={`fv-flood ${details.flood.level}`}>
              <Waves size={16} /> {t(details.flood.level === "high" ? "mapDetails.floodHigh" : "mapDetails.floodUp", { ratio: details.flood.peakRatio })}
            </p>
          )}

          {crops ? (
            <div className="fv-crops">
              <h4><Sprout size={16} /> {t("mapDetails.whatSuitsThisArea")}</h4>
              <p className="fv-muted">
                {onset ? t("mapDetails.rainySeasonOnset", { mm: rainMm, month: tv(MONTH_NAMES[onset]) }) : t("mapDetails.rainySeason", { mm: rainMm })}
              </p>
              {crops.slice(0, 5).map((c) => (
                <div className="fv-crop" key={c.id}>
                  <div className="fv-crop-head">
                    <span className="dot" style={{ background: c.color }} />
                    <strong>{tv(c.name)}</strong>
                    <span className={`tag s${c.score == null ? 0 : c.score >= 80 ? 3 : c.score >= 55 ? 2 : c.score >= 30 ? 1 : 0}`}>{tv(c.label)}</span>
                  </div>
                  <div className="fv-bar"><i style={{ width: `${c.score ?? 0}%`, background: c.color }} /></div>
                  <p className="fv-muted">{tv(c.note)}</p>
                </div>
              ))}
              <p className="fv-muted fv-disclaimer">
                {t("mapDetails.indicativeOnlyBasedOn30Year")}
              </p>
            </div>
          ) : (
            <p className="fv-warn">{t("mapDetails.climateAveragesAreUnavailableRightNow")}</p>
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
      <p className="fv-muted">
        {t("mapDetails.forecastFor", { time: String(current.time).slice(11, 16) })}
      </p>
      <div className="fv-now">
        <div><Thermometer size={16} /> <strong>{Number(current.temperature_2m).toFixed(1)}°C</strong></div>
        <div><Droplets size={16} /> {t("mapDetails.humidity", { value: current.relative_humidity_2m })}</div>
        <div>
          <CloudRain size={16} /> {weather.now?.rainLastHourMm != null ? t("mapDetails.rainPastHour", { mm: weather.now.rainLastHourMm.toFixed(1) }) : t("mapDetails.rainMm", { mm: current.precipitation })}
        </div>
        {weather.now?.rainChance3h != null && <div><Umbrella size={16} /> {t("mapDetails.rainChance", { value: weather.now.rainChance3h })}</div>}
        {weather.now?.windMs != null && (
          <div>
            <Wind size={16} /> {windText(weather.now.windMs.toFixed(1), compassPoint(weather.now.windFrom), weather.now.gustMs != null ? weather.now.gustMs.toFixed(1) : null)}
          </div>
        )}
        {soilMoisturePct != null && <div><Sprout size={16} /> {t("mapDetails.topsoil", { value: soilMoisturePct })}</div>}
      </div>
      <div className="fv-days">
        {days.map((d) => (
          <div className="fv-day" key={d.date} title={t("mapDetails.dayTitle", { date: d.date, rain: d.rainMm, min: d.minC, max: d.maxC })}>
            <span className="fv-day-rain">{d.rainMm > 0 ? Math.round(d.rainMm) : "–"}</span>
            <div className="fv-day-bar"><i style={{ height: `${Math.min(100, ((d.rainMm || 0) / maxRain) * 100)}%` }} /></div>
            <span className="fv-day-t">{Math.round(d.maxC)}°</span>
            <span className="fv-day-d">{formatDate(new Date(d.date + "T00:00"), { weekday: "short" })}</span>
          </div>
        ))}
      </div>
      <p className="fv-muted">{t("mapDetails.dailyRainMmAndHighNext")}</p>
    </div>
  );
}
