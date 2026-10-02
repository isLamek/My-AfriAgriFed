import React, { useMemo } from "react";
import { CloudRain, Droplets, Flame, Sprout, Thermometer, Waves } from "lucide-react";
import { TOWNS } from "./farmview/config";
import { regionLabel } from "./farmview/regions";
import { describeAge, fireLevel, firesNear } from "./farmview/fires";
import { scoreCrops, seasonalRainMm, seasonalTempC, typicalRainOnset } from "./farmview/cropRules";

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
  if (fires.error || !near) return <p className="fv-muted">Fire hotspot data is unavailable right now.</p>;

  const level = fireLevel(near);
  return (
    <div className={`fv-fire ${level}`}>
      <p>
        <Flame size={16} />{" "}
        {level === "none" ? (
          <>No fire hotspots seen within {km} km in the last 48 hours.</>
        ) : (
          <>
            <strong>{near.count} fire hotspot{near.count === 1 ? "" : "s"}</strong> within {km} km in the last 48 hours. Nearest is{" "}
            {near.nearest.distanceKm} km away, seen {describeAge(near.nearest.ageHours)}.
          </>
        )}
      </p>
      <p className="fv-muted">
        Hotspots are satellite heat detections, not confirmed fires. Satellites pass a few times a day, so no dot does not
        guarantee safety. Source: NASA FIRMS.
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
      <h3>{region ? `${regionLabel(region.properties.name)} Region` : "Outside Namibia"}</h3>
      <p className="fv-muted">
        {picked.lat.toFixed(3)}°, {picked.lng.toFixed(3)}°
        {town ? ` · ${town.km <= 1 ? `in ${town.name}` : `about ${town.km} km from ${town.name}`}` : ""}
      </p>

      <FireWatch point={picked} fires={fires} />

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
                The rainy season (Nov–Apr) brings about {rainMm} mm here on average
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
                Indicative only. Based on 30-year regional climate averages (about 50 km resolution) and rain-fed crops
                of northern Namibia; it does not know your soil. In the drier south most crops need irrigation. Check with
                your local agricultural extension officer before planting decisions.
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
      <p className="fv-muted">Model estimate for this spot, updated {String(current.time).slice(11, 16)} local time</p>
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
      <p className="fv-muted">Daily rain (mm) and high (°C), next 7 days. Weather: Open-Meteo.com (CC BY 4.0).</p>
    </div>
  );
}
