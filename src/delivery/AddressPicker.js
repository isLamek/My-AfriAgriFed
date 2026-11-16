import React, { useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import PinMap from "./LazyPinMap";
import { TOWN_CHOICES, inNamibia, locationFromTown } from "../marketLocation";
import { t } from "../i18n";

const round5 = (n) => Math.round(n * 1e5) / 1e5;

/**
 * Where should it go? A pin on the map (tap, drag, "use my location", or the nearest town) plus
 * words: many places have no street address, so "blue gate behind the Engen garage" is the real
 * address and the pin gets the driver to the right neighbourhood.
 *
 * value: { pin: { lat, lng } | null, landmark, contactName, contactPhone }
 */
export default function AddressPicker({ value, onChange, pickup }) {
  const [focus, setFocus] = useState(null);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState("");

  const setPin = (point, zoom) => {
    if (!inNamibia(point.lat, point.lng)) {
      setProblem(t("delivery.address.outsideNamibia"));
      return;
    }
    setProblem("");
    onChange({ ...value, pin: { lat: round5(point.lat), lng: round5(point.lng) } });
    if (zoom) setFocus({ lat: point.lat, lng: point.lng, zoom });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setProblem(t("delivery.address.noLocation"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        setPin({ lat: coords.latitude, lng: coords.longitude }, 15);
      },
      () => {
        setLocating(false);
        setProblem(t("delivery.address.locationDenied"));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const pins = useMemo(() => (pickup ? [{ id: "pickup", kind: "pickup", lat: pickup.lat, lng: pickup.lng, label: t("delivery.pickupPoint") }] : []), [pickup]);

  return (
    <div className="dl-address">
      <p className="dl-help">{t("delivery.address.help")}</p>
      <div className="dl-map-tools">
        <button type="button" className="dl-btn" onClick={useMyLocation} disabled={locating}>
          <LocateFixed size={15} aria-hidden="true" /> {locating ? t("delivery.address.locating") : t("delivery.address.useMyLocation")}
        </button>
        <label className="dl-inline">
          <span>{t("delivery.address.orChooseTown")}</span>
          <select
            value=""
            onChange={(e) => {
              const town = locationFromTown(e.target.value);
              if (town) setPin(town, 13);
            }}
          >
            <option value="">{t("delivery.address.chooseTown")}</option>
            {TOWN_CHOICES.map((town) => (
              <option key={town.name} value={town.name}>
                {town.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {problem && <p className="dl-problem" role="alert">{problem}</p>}

      <PinMap pins={pins} picked={value.pin} onPick={(p) => setPin(p)} focus={focus} fitKey={pickup ? "with-pickup" : "no-pickup"} height={300} label={t("delivery.address.mapLabel")} />
      <p className="dl-hint">{value.pin ? t("delivery.address.pinSet") : t("delivery.address.pinMissing")}</p>

      <label className="dl-field">
        <span>{t("delivery.address.landmark")}</span>
        <textarea
          rows={2}
          maxLength={200}
          value={value.landmark}
          onChange={(e) => onChange({ ...value, landmark: e.target.value })}
          placeholder={t("delivery.address.landmarkExample")}
        />
      </label>
      <div className="dl-row">
        <label className="dl-field">
          <span>{t("delivery.address.contactName")}</span>
          <input type="text" maxLength={80} value={value.contactName} onChange={(e) => onChange({ ...value, contactName: e.target.value })} autoComplete="name" />
        </label>
        <label className="dl-field">
          <span>{t("delivery.address.contactPhone")}</span>
          <input type="tel" inputMode="tel" maxLength={18} value={value.contactPhone} onChange={(e) => onChange({ ...value, contactPhone: e.target.value })} autoComplete="tel" placeholder="+264 81 000 0000" />
        </label>
      </div>
      <p className="dl-hint">{t("delivery.address.phonePrivacy")}</p>
    </div>
  );
}
