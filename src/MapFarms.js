import React, { useEffect, useMemo, useState } from "react";
import { Home, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { auth } from "./firebaseConfig";
import { addInput, deleteFarm, deleteInput, subscribeInputs, addFarm } from "./farms";
import { CROPS } from "./farmview/cropRules";
import { regionLabel } from "./farmview/regions";
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

const nad = (n) => `N$ ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Left-card section: the farmer's farms and the "add" button. */
export function FarmsSection({ farms, selectedId, placing, onSelect, onAdd, onCancelPlacing }) {
  return (
    <div className="fv-farms">
      <p className="fv-label"><Home size={14} /> My farms</p>
      {placing ? (
        <div className="fv-placing">
          <span>Tap your farm's location on the map.</span>
          <button className="fv-link" onClick={onCancelPlacing}>Cancel</button>
        </div>
      ) : (
        <>
          <div className="fv-layers">
            {farms.map((f) => (
              <button key={f.id} className={selectedId === f.id ? "on" : ""} onClick={() => onSelect(f)}>
                {f.name}
              </button>
            ))}
            <button className="fv-add" onClick={onAdd}><Plus size={13} /> Add my farm</button>
          </div>
          {farms.length === 0 && <p className="fv-muted">Add a farm to keep weather, rain and your inputs together in one place.</p>}
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
      toast.success("Farm saved.");
      onSaved(id);
    } catch (error) {
      toast.error(error.code === "permission-denied" ? "Only farmer accounts can add farms." : error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="fv-form" onSubmit={submit}>
      <div className="fv-form-head">
        <h3>Add my farm</h3>
        <button type="button" className="fv-icon" onClick={onCancel} aria-label="Cancel"><X size={16} /></button>
      </div>
      <p className="fv-muted">
        {draft.lat.toFixed(4)}°, {draft.lng.toFixed(4)}° · {region ? `${regionLabel(region.properties.name)} Region` : "outside Namibia"}
        . Only you can see your farm.
      </p>
      {errors.location && <p className="fv-error">{errors.location}</p>}

      <Field label="Farm name" error={errors.name}>
        <input value={form.name} maxLength={LIMITS.name} onChange={set("name")} placeholder="e.g. Oshakati mahangu field" autoFocus />
      </Field>
      <Field label="Size (hectares, optional)" error={errors.areaHa}>
        <input value={form.areaHa} inputMode="decimal" onChange={set("areaHa")} placeholder="e.g. 2.5" />
      </Field>
      <fieldset className="fv-crops-pick">
        <legend>What do you grow? (optional)</legend>
        {CROPS.map((c) => (
          <label key={c.id}>
            <input type="checkbox" checked={form.crops.includes(c.id)} onChange={() => toggleCrop(c.id)} /> {c.name}
          </label>
        ))}
      </fieldset>
      <Field label="Notes (optional)" error={errors.notes}>
        <textarea rows={2} value={form.notes} maxLength={LIMITS.notes} onChange={set("notes")} />
      </Field>
      <div className="fv-form-actions">
        <button type="submit" className="fv-btn primary" disabled={saving}>{saving ? "Saving…" : "Save farm"}</button>
        <button type="button" className="fv-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** One farm: what is recorded, what has been spent, and the input log. */
export function FarmDetails({ farm, onDeleted }) {
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
  const cropNames = (farm.crops || []).map((id) => CROPS.find((c) => c.id === id)?.name || id);

  const submit = async (e) => {
    e.preventDefault();
    const found = validateInput(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await addInput(farm.id, form);
      toast.success("Input recorded.");
      setForm((f) => ({ ...f, item: "", quantity: "", costNad: "", note: "" })); // keep date, type, unit, crop for quick repeat entries
    } catch (error) {
      toast.error(error.code === "permission-denied" ? "You can't add records to this farm." : error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeInput = async (input) => {
    if (!window.confirm(`Delete "${input.item}" from your records?`)) return;
    try {
      await deleteInput(input.id);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const removeFarm = async () => {
    if (!window.confirm(`Delete "${farm.name}" and all of its input records? This cannot be undone.`)) return;
    try {
      await deleteFarm(farm.id);
      toast.success("Farm deleted.");
      onDeleted();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fv-farm-details">
      <h3>{farm.name}</h3>
      <p className="fv-muted">
        {farm.region ? `${regionLabel(farm.region)} Region` : "Namibia"}
        {farm.areaHa != null ? ` · ${farm.areaHa} ha` : ""}
        {cropNames.length ? ` · ${cropNames.join(", ")}` : ""}
      </p>
      {farm.notes && <p className="fv-muted">{farm.notes}</p>}

      <h4>Inputs spend</h4>
      {summary.count === 0 ? (
        <p className="fv-muted">Nothing recorded yet. Add seed, fertiliser, water or labour below to see your costs add up.</p>
      ) : (
        <div className="fv-summary">
          <strong>{nad(summary.totalCost)}</strong>
          <span className="fv-muted"> across {summary.count} record{summary.count === 1 ? "" : "s"}
            {summary.costedEntries < summary.count ? ` (${summary.count - summary.costedEntries} without a cost)` : ""}</span>
          {summary.byType.filter((t) => t.cost > 0).slice(0, 5).map((t) => (
            <div className="fv-spend" key={t.key}>
              <span>{inputTypeLabel(t.key)}</span>
              <div className="fv-bar"><i style={{ width: `${(t.cost / summary.totalCost) * 100}%` }} /></div>
              <span>{nad(t.cost)}</span>
            </div>
          ))}
        </div>
      )}

      <h4>Record an input</h4>
      <form className="fv-form compact" onSubmit={submit}>
        <div className="fv-row">
          <Field label="Date" error={errors.date}><input type="date" value={form.date} max={todayIso()} onChange={set("date")} /></Field>
          <Field label="Type" error={errors.type}>
            <select value={form.type} onChange={set("type")}>
              {INPUT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="What was it?" error={errors.item}>
          <input value={form.item} maxLength={LIMITS.item} onChange={set("item")} placeholder="e.g. Mahangu seed, NPK 2:3:2, weeding" />
        </Field>
        <div className="fv-row">
          <Field label="Quantity" error={errors.quantity}><input value={form.quantity} inputMode="decimal" onChange={set("quantity")} placeholder="20" /></Field>
          <Field label="Unit" error={errors.unit}><input value={form.unit} maxLength={LIMITS.unit} onChange={set("unit")} placeholder="kg, L, bags, days" /></Field>
          <Field label="Cost (N$)" error={errors.costNad}><input value={form.costNad} inputMode="decimal" onChange={set("costNad")} placeholder="450" /></Field>
        </div>
        <Field label="For which crop or animals? (optional)" error={errors.target}>
          <input list="fv-targets" value={form.target} maxLength={LIMITS.target} onChange={set("target")} />
          <datalist id="fv-targets">
            {[...cropNames, ...CROPS.map((c) => c.name)].filter((v, i, a) => a.indexOf(v) === i).map((n) => <option key={n} value={n} />)}
          </datalist>
        </Field>
        <Field label="Note (optional)" error={errors.note}><input value={form.note} maxLength={LIMITS.note} onChange={set("note")} /></Field>
        <button type="submit" className="fv-btn primary" disabled={saving}>{saving ? "Saving…" : "Add record"}</button>
      </form>

      <h4>Records</h4>
      {loadError && <p className="fv-warn">Could not load records: {loadError}</p>}
      {inputs === null && !loadError && <p className="fv-muted">Loading…</p>}
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
                <button className="fv-icon" onClick={() => removeInput(r)} aria-label={`Delete ${r.item}`}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button className="fv-btn danger" onClick={removeFarm}>Delete this farm</button>
    </div>
  );
}
