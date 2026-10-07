import React, { useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { TOWN_CHOICES, currentLocation, locationFromTown } from "./marketLocation";
import "./LocationPicker.css";

/**
 * "Where is it?" for a listing or a Demand Board request. Optional: with a
 * location the post gets a pin on the Market Map.
 */
export default function LocationPicker({ value, onChange, label = "Where is it? (optional)" }) {
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
          aria-label="Town"
        >
          <option value="">{value && !townValue ? value.label : "Choose a town"}</option>
          {TOWN_CHOICES.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.region})
            </option>
          ))}
        </select>
        <button type="button" className="loc-gps" onClick={useGps} disabled={busy}>
          <LocateFixed size={14} /> {busy ? "Finding..." : "Use my location"}
        </button>
      </div>
      {value ? (
        <p className="loc-chosen">
          <MapPin size={13} /> Pinned at <strong>{value.label}</strong>
          {value.region ? `, ${value.region}` : ""}
          <button type="button" onClick={() => onChange(null)} aria-label="Remove the location">
            <X size={13} />
          </button>
        </p>
      ) : (
        <p className="loc-hint">With a location your post gets a pin on the Market Map. We show the area (about 1 km), never your exact spot.</p>
      )}
      {error && <p className="loc-error">{error}</p>}
    </div>
  );
}
