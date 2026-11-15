import React, { useEffect, useMemo, useState } from "react";
import { Flame, Home, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { auth } from "./firebaseConfig";
import { addInput, deleteFarm, deleteInput, subscribeInputs, addFarm } from "./farms";
import { CROPS } from "./farmview/cropRules";
import { regionLabel } from "./farmview/regions";
import { FireWatch } from "./MapDetails";
import {
  INPUT_TYPES,
  LIMITS,
  inputTypeLabel,
  sortInputs,
  summarizeInputs,
  todayIso,
  validateFarm,
  validateInput,
} from "./farmview/farmInputs";
import { t, tv, formatNumber } from "./i18n";

const nad = (n) => `N$ ${formatNumber(Number(n), { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Left-card section: the farmer's farms and the "add" button. */
export function FarmsSection({ farms, selectedId, placing, onSelect, onAdd, onCancelPlacing, fireAlerts = [] }) {
  return (
    <div className="fv-farms">
      <p className="fv-label"><Home size={14} /> {t("farms.myFarms")}</p>
      {placing ? (
        <div className="fv-placing">
          <span>{t("farms.tapYourFarmLocationOnThe")}</span>
          <button className="fv-link" onClick={onCancelPlacing}>{t("common.cancel")}</button>
        </div>
      ) : (
        <>
          <div className="fv-layers">
            {farms.map((f) => (
              <button key={f.id} className={selectedId === f.id ? "on" : ""} onClick={() => onSelect(f)}>
                {f.name}
              </button>
            ))}
            <button className="fv-add" onClick={onAdd}><Plus size={13} /> {t("farms.addMyFarm")}</button>
          </div>
          {farms.length === 0 && <p className="fv-muted">{t("farms.addFarmToKeepWeatherRain")}</p>}
          {fireAlerts.map((a) => (
            <p key={a.id} className={`fv-fire-alert ${a.level}`}>
              <Flame size={14} /> {t("farms.fireAlert", { name: a.name, km: a.km })}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="fv-field">
      <span>{label}</span>
      {children}
      {error && <em className="fv-error">{error}</em>}
    </label>
  );
}

/** Shown after the farmer taps a spot: name it and say what grows there. */
export function FarmForm({ draft, region, onSaved, onCancel }) {
  const [form, setForm] = useState({ name: "", areaHa: "", notes: "", crops: [] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleCrop = (id) =>
    setForm((f) => ({ ...f, crops: f.crops.includes(id) ? f.crops.filter((c) => c !== id) : [...f.crops, id] }));

  const submit = async (e) => {
    e.preventDefault();
    const fields = { ...form, lat: draft.lat, lng: draft.lng, region: region ? region.properties.name : undefined };
    const found = validateFarm(fields);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const id = await addFarm(fields);
      toast.success(t("farms.farmSaved"));
      onSaved(id);
    } catch (error) {
      toast.error(error.code === "permission-denied" ? t("farms.onlyFarmerAccountsCanAddFarms") : error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="fv-form" onSubmit={submit}>
      <div className="fv-form-head">
        <h3>{t("farms.addMyFarm")}</h3>
        <button type="button" className="fv-icon" onClick={onCancel} aria-label={t("common.cancel")}><X size={16} /></button>
      </div>
      <p className="fv-muted">
        {draft.lat.toFixed(4)}°, {draft.lng.toFixed(4)}° · {region ? t("mapDetails.regionName", { name: regionLabel(region.properties.name) }) : t("farms.outsideNamibia")}
        {t("farms.onlyYouCanSeeYourFarm")}
      </p>
      {errors.location && <p className="fv-error">{errors.location}</p>}

      <Field label={t("farms.farmName")} error={errors.name}>
        <input value={form.name} maxLength={LIMITS.name} onChange={set("name")} placeholder={t("farms.egOshakatiMahanguField")} autoFocus />
      </Field>
      <Field label={t("farms.sizeHa")} error={errors.areaHa}>
        <input value={form.areaHa} inputMode="decimal" onChange={set("areaHa")} placeholder={t("farms.sizeExample")} />
      </Field>
      <fieldset className="fv-crops-pick">
        <legend>{t("farms.whatDoYouGrowOptional")}</legend>
        {CROPS.map((c) => (
          <label key={c.id}>
            <input type="checkbox" checked={form.crops.includes(c.id)} onChange={() => toggleCrop(c.id)} /> {tv(c.name)}
          </label>
        ))}
      </fieldset>
      <Field label={t("farms.notesOptional")} error={errors.notes}>
        <textarea rows={2} value={form.notes} maxLength={LIMITS.notes} onChange={set("notes")} />
      </Field>
      <div className="fv-form-actions">
        <button type="submit" className="fv-btn primary" disabled={saving}>{saving ? t("farms.saving") : t("farms.saveFarm")}</button>
        <button type="button" className="fv-btn" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}

/** One farm: what is recorded, what has been spent, and the input log. */
export function FarmDetails({ farm, onDeleted, fires }) {
  const uid = auth.currentUser?.uid;
  const [inputs, setInputs] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ date: todayIso(), type: "seed", item: "", quantity: "", unit: "", costNad: "", target: "", note: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setInputs(null);
    setLoadError("");
    if (!uid) return undefined;
    return subscribeInputs(uid, farm.id, setInputs, (e) => setLoadError(e.message));
  }, [uid, farm.id]);

  const sorted = useMemo(() => sortInputs(inputs), [inputs]);
  const summary = useMemo(() => summarizeInputs(inputs), [inputs]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const cropNames = (farm.crops || []).map((id) => tv(CROPS.find((c) => c.id === id)?.name || id));

  const submit = async (e) => {
    e.preventDefault();
    const found = validateInput(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await addInput(farm.id, form);
      toast.success(t("farms.inputRecorded"));
      setForm((f) => ({ ...f, item: "", quantity: "", costNad: "", note: "" })); // keep date, type, unit, crop for quick repeat entries
    } catch (error) {
      toast.error(error.code === "permission-denied" ? t("farms.youCanAddRecordsToThis") : error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeInput = async (input) => {
    if (!window.confirm(t("farms.confirmDeleteRecord", { item: input.item }))) return;
    try {
      await deleteInput(input.id);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const removeFarm = async () => {
    if (!window.confirm(t("farms.confirmDeleteFarm", { name: farm.name }))) return;
    try {
      await deleteFarm(farm.id);
      toast.success(t("farms.farmDeleted"));
      onDeleted();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fv-farm-details">
      <h3>{farm.name}</h3>
      <p className="fv-muted">
        {farm.region ? t("mapDetails.regionName", { name: regionLabel(farm.region) }) : "Namibia"}
        {farm.areaHa != null ? ` · ${farm.areaHa} ha` : ""}
        {cropNames.length ? ` · ${cropNames.join(", ")}` : ""}
      </p>
      {farm.notes && <p className="fv-muted">{farm.notes}</p>}
      <FireWatch point={farm} fires={fires} />

      <h4>{t("farms.inputsSpend")}</h4>
      {summary.count === 0 ? (
        <p className="fv-muted">{t("farms.nothingRecordedYetAddSeedFertiliser")}</p>
      ) : (
        <div className="fv-summary">
          <strong>{nad(summary.totalCost)}</strong>
          <span className="fv-muted"> {t("farms.acrossRecords", { count: summary.count })}
            {summary.costedEntries < summary.count ? ` ${t("farms.withoutCost", { count: summary.count - summary.costedEntries })}` : ""}</span>
          {summary.byType.filter((row) => row.cost > 0).slice(0, 5).map((row) => (
            <div className="fv-spend" key={row.key}>
              <span>{inputTypeLabel(row.key)}</span>
              <div className="fv-bar"><i style={{ width: `${(row.cost / summary.totalCost) * 100}%` }} /></div>
              <span>{nad(row.cost)}</span>
            </div>
          ))}
        </div>
      )}

      <h4>{t("farms.recordAnInput")}</h4>
      <form className="fv-form compact" onSubmit={submit}>
        <div className="fv-row">
          <Field label={t("farms.date")} error={errors.date}><input type="date" value={form.date} max={todayIso()} onChange={set("date")} /></Field>
          <Field label={t("farms.type")} error={errors.type}>
            <select value={form.type} onChange={set("type")}>
              {INPUT_TYPES.map((type) => <option key={type.id} value={type.id}>{tv(type.label)}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t("farms.whatWasIt")} error={errors.item}>
          <input value={form.item} maxLength={LIMITS.item} onChange={set("item")} placeholder={t("farms.egMahanguSeedNpk23")} />
        </Field>
        <div className="fv-row">
          <Field label={t("farms.quantity")} error={errors.quantity}><input value={form.quantity} inputMode="decimal" onChange={set("quantity")} placeholder="20" /></Field>
          <Field label={t("farms.unit")} error={errors.unit}><input value={form.unit} maxLength={LIMITS.unit} onChange={set("unit")} placeholder={t("farms.kgBagsDays")} /></Field>
          <Field label={t("farms.costNad")} error={errors.costNad}><input value={form.costNad} inputMode="decimal" onChange={set("costNad")} placeholder="450" /></Field>
        </div>
        <Field label={t("farms.forWhich")} error={errors.target}>
          <input list="fv-targets" value={form.target} maxLength={LIMITS.target} onChange={set("target")} />
          <datalist id="fv-targets">
            {[...cropNames, ...CROPS.map((c) => tv(c.name))].filter((v, i, a) => a.indexOf(v) === i).map((n) => <option key={n} value={n} />)}
          </datalist>
        </Field>
        <Field label={t("farms.noteOptional")} error={errors.note}><input value={form.note} maxLength={LIMITS.note} onChange={set("note")} /></Field>
        <button type="submit" className="fv-btn primary" disabled={saving}>{saving ? t("farms.saving") : t("farms.addRecord")}</button>
      </form>

      <h4>{t("farms.records")}</h4>
      {loadError && <p className="fv-warn">{t("farms.couldNotLoadRecords", { error: loadError })}</p>}
      {inputs === null && !loadError && <p className="fv-muted">{t("farms.loading")}</p>}
      {sorted.length > 0 && (
        <ul className="fv-records">
          {sorted.map((r) => (
            <li key={r.id}>
              <div>
                <strong>{r.item}</strong>
                <span className="fv-muted">
                  {r.date} · {inputTypeLabel(r.type)}
                  {r.quantity != null ? ` · ${r.quantity}${r.unit ? ` ${r.unit}` : ""}` : ""}
                  {r.target ? ` · ${r.target}` : ""}
                </span>
                {r.note && <span className="fv-muted">{r.note}</span>}
              </div>
              <div className="fv-record-side">
                {r.costNad != null && <strong>{nad(r.costNad)}</strong>}
                <button className="fv-icon" onClick={() => removeInput(r)} aria-label={t("farms.deleteRecord", { item: r.item })}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button className="fv-btn danger" onClick={removeFarm}>{t("farms.deleteThisFarm")}</button>
    </div>
  );
}
