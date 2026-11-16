import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { Check, MapPin, Navigation, PackageCheck, Truck } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import PinMap from "./delivery/LazyPinMap";
import useLiveDoc from "./delivery/useLiveDoc";
import useShareLocation from "./delivery/useShareLocation";
import { HandoverBox, run } from "./delivery/OrderDelivery";
import ChatButton from "./delivery/ChatButton";
import { claimJob, markArrived, pickUp, releaseJob } from "./delivery/api";
import { formatDuration, formatKm, vehicleName } from "./delivery/format";
import { driveMinutes, vehicleFits } from "./delivery/rules";
import { cleanPhone } from "./delivery/rules";
import { displayPlace } from "./marketLocation";
import { formatNad } from "./purchase";
import { t, formatDate } from "./i18n";
import "./delivery/delivery.css";

// Region names as the towns on the map carry them.
const REGIONS = ["Erongo", "Hardap", "Karas", "Kavango East", "Kavango West", "Khomas", "Kunene", "Ohangwena", "Omaheke", "Omusati", "Oshana", "Oshikoto", "Otjozondjupa", "Zambezi"];
const VEHICLES = ["small", "bakkie", "truck"];
const when = (ms) => formatDate(ms, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// ---- applying -----------------------------------------------------------------------------------------------------------
function Apply({ uid }) {
  const [form, setForm] = useState({ name: auth.currentUser?.displayName || "", phone: "", type: "bakkie", description: "", plate: "", regions: [] });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const phone = cleanPhone(form.phone);

  const submit = async () => {
    setBusy(true);
    try {
      await setDoc(doc(db, "carriers", uid), {
        name: form.name.trim(),
        phone,
        vehicle: { type: form.type, description: form.description.trim(), plate: form.plate.trim() },
        regions: form.regions,
        available: true,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success(t("carrier.apply.sent"));
    } catch (error) {
      toast.error(error.code === "permission-denied" ? t("carrier.apply.refused") : error.message);
    }
    setBusy(false);
  };

  return (
    <section className="aaf-card dl-section">
      <h2>{t("carrier.apply.title")}</h2>
      <p className="dl-help">{t("carrier.apply.intro")}</p>
      <div className="dl-row">
        <label className="dl-field">
          <span>{t("carrier.apply.name")}</span>
          <input type="text" maxLength={80} value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />
        </label>
        <label className="dl-field">
          <span>{t("carrier.apply.phone")}</span>
          <input type="tel" inputMode="tel" maxLength={18} value={form.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="tel" placeholder="+264 81 000 0000" />
        </label>
      </div>
      <div className="dl-row">
        <label className="dl-field">
          <span>{t("carrier.apply.vehicle")}</span>
          <select value={form.type} onChange={(e) => set({ type: e.target.value })}>
            {VEHICLES.map((v) => (
              <option key={v} value={v}>{vehicleName(v)} ({t(`carrier.apply.capacity.${v}`)})</option>
            ))}
          </select>
        </label>
        <label className="dl-field">
          <span>{t("carrier.apply.description")}</span>
          <input type="text" maxLength={80} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder={t("carrier.apply.descriptionExample")} />
        </label>
        <label className="dl-field">
          <span>{t("carrier.apply.plate")}</span>
          <input type="text" maxLength={20} value={form.plate} onChange={(e) => set({ plate: e.target.value })} placeholder="N 1234 W" />
        </label>
      </div>
      <fieldset className="dl-regions">
        <legend>{t("carrier.apply.regions")}</legend>
        <p className="dl-help">{t("carrier.apply.regionsHelp")}</p>
        {REGIONS.map((r) => (
          <label key={r} className="dl-check">
            <input type="checkbox" checked={form.regions.includes(r)} onChange={(e) => set({ regions: e.target.checked ? [...form.regions, r] : form.regions.filter((x) => x !== r) })} /> {r}
          </label>
        ))}
      </fieldset>
      <p className="dl-hint">{t("carrier.apply.review")}</p>
      <button type="button" className="ot-btn primary" disabled={busy || !form.name.trim() || !phone} onClick={submit}>
        {busy ? t("tracker.saving") : t("carrier.apply.send")}
      </button>
    </section>
  );
}

// ---- jobs ------------------------------------------------------------------------------------------------------------------
function OpenJob({ job, onTaken }) {
  const [busy, setBusy] = useState(false);
  const take = async () => {
    setBusy(true);
    const done = await run(() => claimJob(job.orderId), { ok: t("carrier.job.taken") });
    setBusy(false);
    if (done) onTaken();
  };
  return (
    <article className="aaf-card dl-job">
      <header>
        <h3>{job.what}</h3>
        <strong className="dl-pay">{formatNad(job.carrierPay)}</strong>
      </header>
      <p className="dl-route">
        <MapPin size={14} aria-hidden="true" /> {displayPlace(job.pickup.label)} <span aria-hidden="true">→</span> {displayPlace(job.dropoff.label)}
      </p>
      <p className="dl-meta">
        {formatKm(job.km)} · {t("carrier.job.driving", { time: formatDuration(driveMinutes(job.km)) })} · {vehicleName(job.vehicle)} · {t("carrier.job.weight", { kg: job.weightKg })}
      </p>
      <p className="dl-meta">
        {t("carrier.job.ready", { when: when(job.readyAt) })}
        {job.requestedDate ? ` · ${t("carrier.job.deliverOn", { date: formatDate(`${job.requestedDate}T12:00:00Z`, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) })}` : ""}
        {job.window && job.window !== "anytime" ? ` · ${t(`checkout.window.${job.window}`)}` : ""}
      </p>
      <button type="button" className="ot-btn primary" disabled={busy} onClick={take}>
        {busy ? t("tracker.saving") : t("carrier.job.take")}
      </button>
    </article>
  );
}

function MyJob({ job }) {
  const priv = useLiveDoc(`deliveryPrivate/${job.orderId}`);
  const travelling = job.status === "picked_up";
  const share = useShareLocation(job.orderId, travelling);
  const [busy, setBusy] = useState(false);

  const pins = useMemo(() => {
    if (!priv) return [];
    return [
      { id: "pickup", kind: "pickup", lat: priv.pickup.lat, lng: priv.pickup.lng, label: t("delivery.pickupPoint") },
      { id: "drop", kind: "drop", lat: priv.dropoff.lat, lng: priv.dropoff.lng, label: t("delivery.dropoffPoint") },
    ];
  }, [priv]);

  const act = async (action, ok) => {
    setBusy(true);
    await run(action, { ok });
    setBusy(false);
  };

  return (
    <article className="aaf-card dl-job active">
      <header>
        <h3>{job.what}</h3>
        <span className={`ot-badge ${travelling ? "in_transit" : "confirmed"}`}>{travelling ? t("carrier.job.onTheRoad") : t("carrier.job.toCollect")}</span>
      </header>
      <p className="dl-route">
        <MapPin size={14} aria-hidden="true" /> {displayPlace(job.pickup.label)} <span aria-hidden="true">→</span> {displayPlace(job.dropoff.label)} · {formatKm(job.km)}
      </p>

      {priv ? (
        <div className="dl-addresses">
          <div>
            <h4>{t("carrier.job.collectFrom")}</h4>
            <p>{priv.pickup.label}{priv.pickup.note ? ` · ${priv.pickup.note}` : ""}</p>
            <ChatButton label={t("delivery.chat.seller")} otherId={job.sellerId} otherName={priv.sellerName} orderId={job.orderId} title={job.what} ownerId={auth.currentUser?.uid} />
          </div>
          <div>
            <h4>{t("carrier.job.deliverTo")}</h4>
            <p>{priv.dropoff.landmark}<br /><small>{priv.dropoff.contactName} · {displayPlace(priv.dropoff.label)}</small></p>
            <ChatButton label={t("delivery.chat.buyer")} otherId={job.buyerId} otherName={priv.buyerName || priv.dropoff.contactName} orderId={job.orderId} title={job.what} ownerId={auth.currentUser?.uid} />
            {priv.note && <p className="dl-way"><em>“{priv.note}”</em></p>}
          </div>
        </div>
      ) : (
        <p className="dl-help">{t("carrier.job.loadingAddresses")}</p>
      )}

      {pins.length > 0 && <PinMap pins={pins} fitKey={job.orderId} height={220} label={t("delivery.trackingMap")} />}

      {!travelling && (
        <div className="ot-actions">
          <button type="button" className="ot-btn primary" disabled={busy} onClick={() => act(() => pickUp(job.orderId), t("carrier.job.pickedUpDone"))}>
            <PackageCheck size={14} aria-hidden="true" /> {t("carrier.job.collected")}
          </button>
          <button type="button" className="ot-btn" disabled={busy} onClick={() => act(() => releaseJob(job.orderId), t("carrier.job.released"))}>
            {t("carrier.job.release")}
          </button>
          <p className="dl-help">{t("carrier.job.collectHelp")}</p>
        </div>
      )}

      {travelling && (
        <>
          <p className={`dl-live ${share.status === "sharing" ? "" : "stale"}`}>
            <Navigation size={14} aria-hidden="true" />{" "}
            {share.status === "sharing" && t("carrier.job.sharing")}
            {share.status === "starting" && t("carrier.job.startingShare")}
            {share.status === "denied" && t("delivery.share.denied")}
            {share.status === "unsupported" && t("delivery.share.unsupported")}
            {share.status === "error" && share.error}
            {share.status === "idle" && t("carrier.job.startingShare")}
            {share.distanceKm != null && share.distanceKm > 0.2 ? ` · ${t("carrier.job.left", { distance: formatKm(share.distanceKm) })}` : ""}
          </p>
          <div className="ot-actions">
            <button type="button" className="ot-btn" disabled={busy} onClick={() => act(() => markArrived(job.orderId), t("carrier.job.arrivedSent"))}>
              <Check size={14} aria-hidden="true" /> {t("carrier.job.arrived")}
            </button>
          </div>
          <HandoverBox orderId={job.orderId} canSkip collect={false} />
        </>
      )}
    </article>
  );
}

// ---- the page --------------------------------------------------------------------------------------------------------------------
export default function Carrier() {
  const { theme, navSections, logout } = useAccountContext("/carrier");
  const uid = auth.currentUser?.uid;
  const profile = useLiveDoc(uid ? `carriers/${uid}` : null);
  const approved = profile && profile.status === "approved";

  const [open, setOpen] = useState([]);
  const [mine, setMine] = useState([]);
  const [tab, setTab] = useState("open");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!approved) return undefined;
    const onError = (e) => setError(e.message);
    const stopOpen = onSnapshot(query(collection(db, "deliveryJobs"), where("status", "==", "open")), (s) => setOpen(s.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
    const stopMine = onSnapshot(query(collection(db, "deliveryJobs"), where("carrierId", "==", uid)), (s) => setMine(s.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
    return () => {
      stopOpen();
      stopMine();
    };
  }, [approved, uid]);

  const fitting = useMemo(
    () =>
      open
        .filter((j) => vehicleFits(profile?.vehicle?.type, j.vehicle))
        .filter((j) => !profile?.regions?.length || !j.pickup.region || profile.regions.includes(j.pickup.region))
        .sort((a, b) => a.readyAt - b.readyAt),
    [open, profile]
  );
  const active = mine.filter((j) => ["claimed", "picked_up"].includes(j.status)).sort((a, b) => a.createdAt - b.createdAt);
  const done = mine.filter((j) => j.status === "delivered").sort((a, b) => (b.deliveredAt || 0) - (a.deliveredAt || 0));
  const earned = done.reduce((sum, j) => sum + (Number(j.carrierPay) || 0), 0);

  // someone with a job on the road goes straight to it
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (!autoPicked && mine.length > 0) {
      setAutoPicked(true);
      if (active.length > 0) setTab("mine");
    }
  }, [autoPicked, mine, active.length]);

  const toggleAvailable = async () => {
    try {
      await updateDoc(doc(db, "carriers", uid), { available: profile.available === false, updatedAt: serverTimestamp() });
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <AppShell
      eyebrow={t("carrier.eyebrow")}
      title={t("carrier.title")}
      subtitle={t("carrier.subtitle")}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      {profile === undefined && <p className="ot-empty">{t("carrier.loading")}</p>}

      {profile === null && <Apply uid={uid} />}

      {profile && profile.status === "pending" && (
        <div className="aaf-card dl-empty">
          <Truck size={30} aria-hidden="true" />
          <h2>{t("carrier.pending.title")}</h2>
          <p>{t("carrier.pending.text", { vehicle: vehicleName(profile.vehicle.type) })}</p>
        </div>
      )}
      {profile && profile.status === "suspended" && (
        <div className="aaf-card dl-empty">
          <Truck size={30} aria-hidden="true" />
          <h2>{t("carrier.suspended.title")}</h2>
          <p>{t("carrier.suspended.text")}</p>
        </div>
      )}

      {approved && (
        <>
          <section className="aaf-card dl-carrierbar">
            <div>
              <strong>{profile.name}</strong>
              <small>{vehicleName(profile.vehicle.type)}{profile.vehicle.plate ? ` · ${profile.vehicle.plate}` : ""}{profile.regions?.length ? ` · ${profile.regions.join(", ")}` : ""}</small>
            </div>
            <div className="dl-earned">
              <small>{t("carrier.earned")}</small>
              <strong>{formatNad(earned)}</strong>
            </div>
            <button type="button" className={`ot-btn ${profile.available === false ? "primary" : ""}`} onClick={toggleAvailable}>
              {profile.available === false ? t("carrier.goAvailable") : t("carrier.goUnavailable")}
            </button>
          </section>

          {error && <p className="ot-error">{error}</p>}

          <div className="ot-toolbar">
            <div className="ot-tabs" role="tablist">
              <button role="tab" aria-selected={tab === "open"} className={tab === "open" ? "on" : ""} onClick={() => setTab("open")}>
                {t("carrier.tab.open")} {fitting.length > 0 && <span className="ot-count">{fitting.length}</span>}
              </button>
              <button role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>
                {t("carrier.tab.mine")} {active.length > 0 && <span className="ot-count">{active.length}</span>}
              </button>
              <button role="tab" aria-selected={tab === "done"} className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
                {t("carrier.tab.done")}
              </button>
            </div>
          </div>

          {profile.available === false && tab === "open" && <p className="dl-help">{t("carrier.unavailableNote")}</p>}

          <div className="ot-list">
            {tab === "open" && fitting.length === 0 && <div className="aaf-card dl-empty"><p>{t("carrier.noOpenJobs")}</p></div>}
            {tab === "open" && fitting.map((job) => <OpenJob key={job.id} job={job} onTaken={() => setTab("mine")} />)}

            {tab === "mine" && active.length === 0 && <div className="aaf-card dl-empty"><p>{t("carrier.noActiveJobs")}</p></div>}
            {tab === "mine" && active.map((job) => <MyJob key={job.id} job={job} />)}

            {tab === "done" && done.length === 0 && <div className="aaf-card dl-empty"><p>{t("carrier.noDoneJobs")}</p></div>}
            {tab === "done" &&
              done.map((job) => (
                <article key={job.id} className="aaf-card dl-job">
                  <header>
                    <h3>{job.what}</h3>
                    <strong className="dl-pay">{formatNad(job.carrierPay)}</strong>
                  </header>
                  <p className="dl-route">
                    {displayPlace(job.pickup.label)} <span aria-hidden="true">→</span> {displayPlace(job.dropoff.label)} · {formatKm(job.km)}
                  </p>
                  {job.deliveredAt && <p className="dl-meta">{t("carrier.job.deliveredOn", { when: when(job.deliveredAt) })}</p>}
                </article>
              ))}
          </div>
          <p className="dl-hint">{t("carrier.payNote")}</p>
        </>
      )}
    </AppShell>
  );
}
