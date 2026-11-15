import React, { useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { TOWN_CHOICES, currentLocation, displayPlace, locationFromTown } from "./marketLocation";
import "./LocationPicker.css";
import { t, tRich } from "./i18n";

/**
 * "Where is it?" for a listing or a Demand Board request. Optional: with a
 * location the post gets a pin on the Market Map.
 */
export default function LocationPicker({ value, onChange, label = t("location.whereIsItOptional") }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const useGps = async () => {
    setBusy(true);
    setError("");
    try {
      onChange(await currentLocation());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const townValue = value && TOWN_CHOICES.some((t) => t.name === value.label) ? value.label : "";

  return (
    <div className="loc-picker">
      <span className="loc-label">{label}</span>
      <div className="loc-row">
        <select
          value={townValue}
          onChange={(e) => {
            setError("");
            onChange(e.target.value ? locationFromTown(e.target.value) : null);
          }}
          aria-label={t("location.town")}
        >
          <option value="">{value && !townValue ? value.label : t("location.chooseTown")}</option>
          {TOWN_CHOICES.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.region})
            </option>
          ))}
        </select>
        <button type="button" className="loc-gps" onClick={useGps} disabled={busy}>
          <LocateFixed size={14} /> {busy ? t("location.finding") : t("location.useMyLocation")}
        </button>
      </div>
      {value ? (
        <p className="loc-chosen">
          <MapPin size={13} />{" "}
          {tRich("location.pinnedAt", { place: <><strong>{displayPlace(value.label)}</strong>{value.region ? `, ${value.region}` : ""}</> })}
          <button type="button" onClick={() => onChange(null)} aria-label={t("location.removeTheLocation")}>
            <X size={13} />
          </button>
        </p>
      ) : (
        <p className="loc-hint">{t("location.withLocationYourPostGetsPin")}</p>
      )}
      {error && <p className="loc-error">{error}</p>}
    </div>
  );
}
