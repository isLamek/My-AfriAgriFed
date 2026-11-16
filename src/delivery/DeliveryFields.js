import React from "react";
import { t } from "../i18n";

/** The "How can buyers get this?" part of the listing form. `value` is the state from deliveryForm.js. */
export default function DeliveryFields({ value, onChange, hasPin }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const num = (key, label, step = "1") => (
    <label className="dl-field">
      <span>{label}</span>
      <input type="number" min="0" step={step} inputMode="decimal" value={value[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );
  return (
    <fieldset className="dl-regions listing-delivery">
      <legend>{t("listings.delivery.title")}</legend>
      <p className="dl-help">{t("listings.delivery.help")}</p>

      <label className="dl-check">
        <input type="checkbox" checked={value.collect} onChange={(e) => set({ collect: e.target.checked })} /> {t("listings.delivery.collect")}
      </label>

      <label className="dl-check">
        <input type="checkbox" checked={value.ownEnabled} onChange={(e) => set({ ownEnabled: e.target.checked })} /> {t("listings.delivery.own")}
      </label>
      {value.ownEnabled && (
        <div className="dl-row">
          {num("baseFee", t("listings.delivery.baseFee"))}
          {num("perKm", t("listings.delivery.perKm"), "0.5")}
          {num("maxKm", t("listings.delivery.maxKm"))}
        </div>
      )}

      <label className="dl-check">
        <input type="checkbox" checked={value.platform} onChange={(e) => set({ platform: e.target.checked })} /> {t("listings.delivery.platform")}
      </label>
      {value.platform && <p className="dl-help">{t("listings.delivery.platformHelp")}</p>}

      {(value.ownEnabled || value.platform) && !hasPin && <p className="dl-problem" role="alert">{t("listings.delivery.needPin")}</p>}
    </fieldset>
  );
}
