import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle2, KeyRound, MapPin, Navigation, Truck, User } from "lucide-react";
import PinMap from "./LazyPinMap";
import ChatButton from "./ChatButton";
import { auth } from "../firebaseConfig";
import useLiveDoc from "./useLiveDoc";
import useShareLocation from "./useShareLocation";
import { cancelOrder, confirmReceipt, handOver, markArrived, reportProblem, requestCarrier } from "./api";
import { agoText, formatDuration, formatKm, methodName, vehicleName } from "./format";
import { driveMinutes, roadKm } from "./rules";
import { methodOf, normaliseStatus, serverActions } from "../orderStatus";
import { displayPlace } from "../marketLocation";
import { formatNad } from "../purchase";
import { t, tv, formatDate } from "../i18n";

const when = (ms) => formatDate(ms, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const STALE_MS = 5 * 60000;

export async function run(action, { ok }) {
  try {
    const result = await action();
    if (ok) toast.success(ok);
    return result;
  } catch (error) {
    toast.error(error.message);
    return null;
  }
}

// ---- what was ordered and how it travels ---------------------------------------------------------------
function Summary({ order, side }) {
  const f = order.fulfilment || {};
  const method = methodOf(order);
  const items = Array.isArray(order.items) && order.items.length > 1 ? order.items : null;
  const address = f.address;
  return (
    <div className="dl-ordersum">
      {items && (
        <ul className="dl-itemlist">
          {items.map((item) => (
            <li key={item.listingId}>
              {item.product} <small>{item.quantity} {item.unit ? tv(item.unit) : ""}</small>
            </li>
          ))}
        </ul>
      )}
      <p className="dl-way">
        <Truck size={14} aria-hidden="true" /> <strong>{methodName(method, order.sellerName)}</strong>
        {order.deliveryFee > 0 && <span> · {t("delivery.deliveryFee", { amount: formatNad(order.deliveryFee) })}</span>}
        {f.requestedDate && <span> · {t("delivery.wanted", { date: formatDate(`${f.requestedDate}T12:00:00Z`, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) })}{f.window && f.window !== "anytime" ? `, ${t(`checkout.window.${f.window}`).toLowerCase()}` : ""}</span>}
      </p>
      {method === "collect" && f.pickup && (
        <p className="dl-way">
          <MapPin size={14} aria-hidden="true" /> {t("delivery.collectFrom", { place: displayPlace(f.pickup.label) })}
        </p>
      )}
      {address && (
        <p className="dl-way">
          <MapPin size={14} aria-hidden="true" /> <span>{address.landmark} <small>({displayPlace(address.label)})</small></span>
        </p>
      )}
      {address && side === "selling" && (
        <p className="dl-way">
          <User size={14} aria-hidden="true" /> {address.contactName}
        </p>
      )}
      {f.note && <p className="dl-way"><em>“{f.note}”</em></p>}
      {f.carrier && (
        <p className="dl-way">
          <User size={14} aria-hidden="true" /> {t("delivery.carrierLine", { name: f.carrier.name, vehicle: [f.carrier.vehicle?.description, f.carrier.vehicle?.plate].filter(Boolean).join(", ") || vehicleName(f.carrier.vehicle?.type) })}
        </p>
      )}
    </div>
  );
}

// ---- the buyer's handover code -------------------------------------------------------------------------------
function HandoverCode({ order }) {
  const secret = useLiveDoc(`orderSecrets/${order.id}`);
  if (!secret || !secret.code) return null;
  const arrived = !!order.fulfilment?.arrivedAt;
  return (
    <div className={`dl-code ${arrived ? "now" : ""}`}>
      <KeyRound size={18} aria-hidden="true" />
      <div>
        <small>{arrived ? t("delivery.code.arrived") : t("delivery.code.label")}</small>
        <strong className="dl-code-digits" aria-label={secret.code.split("").join(" ")}>{secret.code.slice(0, 3)} {secret.code.slice(3)}</strong>
        <small>{methodOf(order) === "collect" ? t("delivery.code.collectHelp") : t("delivery.code.help")}</small>
      </div>
    </div>
  );
}

// ---- following the vehicle -----------------------------------------------------------------------------------------
function LiveTracking({ order }) {
  const track = useLiveDoc(`orderTracking/${order.id}`);
  const f = order.fulfilment || {};
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const pins = useMemo(() => {
    const list = [];
    if (f.pickup) list.push({ id: "pickup", kind: "pickup", lat: f.pickup.lat, lng: f.pickup.lng, label: t("delivery.pickupPoint") });
    if (f.address) list.push({ id: "drop", kind: "drop", lat: f.address.lat, lng: f.address.lng, label: t("delivery.dropoffPoint") });
    if (track) list.push({ id: "vehicle", kind: "vehicle", lat: track.lat, lng: track.lng, label: t("delivery.vehicle.here") });
    return list;
  }, [f.pickup, f.address, track]);
  const line = useMemo(() => (track && f.address ? [[track.lat, track.lng], [f.address.lat, f.address.lng]] : null), [track, f.address]);

  if (track === undefined) return null;
  const stale = track ? now - track.at > STALE_MS : false;
  const km = track && f.address ? roadKm(track, f.address) : null;

  return (
    <div className="dl-tracking">
      <PinMap pins={pins} line={line} fitKey={track ? "live" : "waiting"} height={260} label={t("delivery.trackingMap")} />
      {track ? (
        <p className={`dl-live ${stale ? "stale" : ""}`}>
          <Navigation size={14} aria-hidden="true" />{" "}
          {km != null && km > 0.2 ? t("delivery.away", { distance: formatKm(km), time: formatDuration(driveMinutes(km)) }) : t("delivery.almostThere")}
          {" · "}
          {stale ? t("delivery.lastSeen", { ago: agoText(track.at, now) }) : t("delivery.updated", { ago: agoText(track.at, now) })}
        </p>
      ) : (
        <p className="dl-live">{t("delivery.waitingForPosition")}</p>
      )}
    </div>
  );
}

// ---- the seller asks for a carrier ---------------------------------------------------------------------------------------
function CarrierRequest({ order }) {
  const hour = 3600000;
  const options = useMemo(() => {
    const now = Date.now();
    const tomorrow8 = new Date(now + 2 * hour); // Namibia time
    tomorrow8.setUTCDate(tomorrow8.getUTCDate() + 1);
    tomorrow8.setUTCHours(6, 0, 0, 0); // 08:00 in Namibia
    return [
      { key: "1h", at: now + hour, label: t("delivery.request.in1h") },
      { key: "2h", at: now + 2 * hour, label: t("delivery.request.in2h") },
      { key: "4h", at: now + 4 * hour, label: t("delivery.request.in4h") },
      { key: "tomorrow", at: tomorrow8.getTime(), label: t("delivery.request.tomorrow") },
    ];
  }, []);
  const [pick, setPick] = useState("2h");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const readyAt = options.find((o) => o.key === pick).at;
    await run(() => requestCarrier(order.id, { readyAt, pickupNote: note }), { ok: t("delivery.request.sent") });
    setBusy(false);
  };

  return (
    <div className="dl-panel">
      <h4>{t("delivery.request.title")}</h4>
      <p className="dl-help">{t("delivery.request.help", { fee: formatNad(order.fulfilment?.deliveryFee || 0) })}</p>
      <div className="dl-row">
        <label className="dl-field">
          <span>{t("delivery.request.ready")}</span>
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            {options.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="dl-field">
        <span>{t("delivery.request.note")}</span>
        <input type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("delivery.request.noteExample")} />
      </label>
      <button type="button" className="ot-btn primary" disabled={busy} onClick={submit}>
        {busy ? t("tracker.saving") : t("delivery.request.send")}
      </button>
    </div>
  );
}

function CarrierStatus({ order }) {
  const job = useLiveDoc(`deliveryJobs/${order.id}`);
  if (!job) return null;
  const mine = auth.currentUser?.uid;
  const canTalk = job.carrierId && ["claimed", "picked_up"].includes(job.status) && [job.buyerId, job.sellerId].includes(mine);
  return (
    <>
      <p className="dl-way">
        <Truck size={14} aria-hidden="true" />{" "}
        {job.status === "open" && (job.escalated ? t("delivery.job.noOneYet") : t("delivery.job.waiting"))}
        {job.status === "claimed" && t("delivery.job.claimed", { name: job.carrierName })}
        {job.status === "picked_up" && t("delivery.job.pickedUp", { name: job.carrierName })}
        {job.status === "delivered" && t("delivery.job.delivered")}
        {job.status === "cancelled" && t("delivery.job.cancelled")}
      </p>
      {canTalk && (
        <div className="ot-actions">
          <ChatButton label={t("delivery.chat.carrier", { name: job.carrierName })} otherId={job.carrierId} otherName={job.carrierName} orderId={order.id} title={job.what} ownerId={job.carrierId} />
        </div>
      )}
    </>
  );
}

// ---- finishing a handover with the buyer's code (seller delivering, or a collection) -----------------------------------------
export function HandoverBox({ orderId, canSkip, collect }) {
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(null);

  const submit = async () => {
    setBusy(true);
    try {
      await handOver(orderId, skip ? { noCode: true, reason } : { code });
      toast.success(t("delivery.handover.done"));
    } catch (error) {
      if (error.code === "wrong_code") setLeft(error.params.left);
      toast.error(error.message);
    }
    setBusy(false);
  };

  return (
    <div className="dl-panel">
      <h4>{t("delivery.handover.title")}</h4>
      <p className="dl-help">{collect ? t("delivery.handover.helpCollect") : t("delivery.handover.help")}</p>
      {!skip ? (
        <div className="dl-inlineform">
          <input className="dl-codeinput" type="text" inputMode="numeric" autoComplete="off" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="000 000" aria-label={t("delivery.handover.codeLabel")} />
          <button type="button" className="ot-btn primary" disabled={busy || code.replace(/\D/g, "").length !== 6} onClick={submit}>
            {busy ? t("tracker.saving") : t("delivery.handover.confirm")}
          </button>
        </div>
      ) : (
        <div className="dl-inlineform">
          <input type="text" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("delivery.handover.reasonExample")} aria-label={t("delivery.handover.reasonLabel")} />
          <button type="button" className="ot-btn primary" disabled={busy || reason.trim().length < 3} onClick={submit}>
            {busy ? t("tracker.saving") : t("delivery.handover.confirmNoCode")}
          </button>
        </div>
      )}
      {left !== null && <p className="dl-problem">{t("delivery.handover.triesLeft", { count: left })}</p>}
      {canSkip && (
        <button type="button" className="ot-link" onClick={() => setSkip((v) => !v)}>
          {skip ? t("delivery.handover.useCode") : t("delivery.handover.noCode")}
        </button>
      )}
    </div>
  );
}

function SellerSharing({ order }) {
  const [on, setOn] = useState(order.status === "in_transit");
  // the moment the trip starts, start sharing: the buyer should not have to wait for the seller to remember
  useEffect(() => {
    if (order.status === "in_transit") setOn(true);
  }, [order.status]);
  const share = useShareLocation(order.id, on && order.status === "in_transit");
  const arrived = !!order.fulfilment?.arrivedAt;
  return (
    <div className="dl-panel">
      <h4>{t("delivery.share.title")}</h4>
      <p className="dl-help">{t("delivery.share.help")}</p>
      <div className="dl-inlineform">
        <button type="button" className={`ot-btn ${on ? "" : "primary"}`} onClick={() => setOn((v) => !v)}>
          {on ? t("delivery.share.stop") : t("delivery.share.start")}
        </button>
        {order.status === "in_transit" && !arrived && (
          <button type="button" className="ot-btn" onClick={() => run(() => markArrived(order.id), { ok: t("delivery.share.arrivedSent") })}>
            {t("delivery.share.arrived")}
          </button>
        )}
      </div>
      {on && share.status === "sharing" && <p className="dl-live"><Navigation size={14} aria-hidden="true" /> {t("delivery.share.sharing")}</p>}
      {on && share.status === "denied" && <p className="dl-problem">{t("delivery.share.denied")}</p>}
      {on && share.status === "unsupported" && <p className="dl-problem">{t("delivery.share.unsupported")}</p>}
      {on && share.status === "error" && <p className="dl-problem">{share.error}</p>}
    </div>
  );
}

// ---- buyer: cancel, confirm, report a problem; seller: decline --------------------------------------------------------------------------
const PROBLEMS = ["not_delivered", "damaged", "wrong_items", "short_quantity", "quality", "other"];
const PROBLEM_KEY = { not_delivered: "notDelivered", damaged: "damaged", wrong_items: "wrongItems", short_quantity: "shortQuantity", quality: "quality", other: "other" };

function ProblemForm({ order, onClose }) {
  const [reason, setReason] = useState("damaged");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const done = await run(() => reportProblem(order.id, { reason, text }), { ok: t("delivery.problem.sent") });
    setBusy(false);
    if (done) onClose();
  };
  return (
    <div className="dl-panel warn">
      <h4>{t("delivery.problem.title")}</h4>
      <p className="dl-help">{t("delivery.problem.help")}</p>
      <label className="dl-field">
        <span>{t("delivery.problem.what")}</span>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {PROBLEMS.map((p) => (
            <option key={p} value={p}>{t(`delivery.problem.reason.${PROBLEM_KEY[p]}`)}</option>
          ))}
        </select>
      </label>
      <label className="dl-field">
        <span>{t("delivery.problem.details")}</span>
        <textarea rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="dl-inlineform">
        <button type="button" className="ot-btn danger" disabled={busy || (reason === "other" && text.trim().length < 5)} onClick={submit}>
          {busy ? t("tracker.saving") : t("delivery.problem.send")}
        </button>
        <button type="button" className="ot-btn" onClick={onClose}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}

function CancelForm({ order, seller, onClose }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const done = await run(() => cancelOrder(order.id, reason), { ok: t("delivery.cancel.done") });
    setBusy(false);
    if (done) onClose();
  };
  return (
    <div className="dl-panel warn">
      <h4>{seller ? t("delivery.cancel.declineTitle") : t("delivery.cancel.title")}</h4>
      <p className="dl-help">{seller ? t("delivery.cancel.declineHelp") : order.status === "paid" ? t("delivery.cancel.help") : t("delivery.cancel.stalledHelp")}</p>
      <label className="dl-field">
        <span>{seller ? t("delivery.cancel.reasonRequired") : t("delivery.cancel.reasonOptional")}</span>
        <input type="text" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="dl-inlineform">
        <button type="button" className="ot-btn danger" disabled={busy || (seller && reason.trim().length < 3)} onClick={submit}>
          {busy ? t("tracker.saving") : seller ? t("delivery.cancel.decline") : t("delivery.cancel.cancel")}
        </button>
        <button type="button" className="ot-btn" onClick={onClose}>{t("delivery.cancel.keep")}</button>
      </div>
    </div>
  );
}

/** Everything about the delivery on one order card. `side` is "buying" or "selling". */
export default function OrderDelivery({ order, uid, side }) {
  const [panel, setPanel] = useState(null); // "problem" | "cancel"
  const [busy, setBusy] = useState(false);
  const status = normaliseStatus(order.status);
  const method = methodOf(order);
  const actions = serverActions(order, uid);
  const buying = side === "buying";
  const hasFulfilment = !!order.fulfilment;
  const traveling = status === "in_transit" && method !== "collect";
  const deliveredWindow = status === "delivered" && typeof order.releaseAt === "number" && order.releaseAt > Date.now() && !order.releasedAt;

  const confirm = async () => {
    if (!window.confirm(t("delivery.confirm.ask"))) return;
    setBusy(true);
    await run(() => confirmReceipt(order.id), { ok: t("delivery.confirm.done") });
    setBusy(false);
  };

  return (
    <div className="dl-order">
      {hasFulfilment && <Summary order={order} side={side} />}

      {buying && ["confirmed", "dispatched", "in_transit"].includes(status) && <HandoverCode order={order} />}

      {order.fulfilment?.arrivedAt && status === "in_transit" && buying && (
        <p className="dl-arrived" role="status"><CheckCircle2 size={16} aria-hidden="true" /> {t("delivery.arrivedBuyer")}</p>
      )}

      {method === "platform" && ["confirmed", "dispatched", "in_transit"].includes(status) && (buying || !actions.includes("requestCarrier")) && <CarrierStatus order={order} />}
      {!buying && actions.includes("requestCarrier") && <CarrierRequest order={order} />}

      {traveling && <LiveTracking order={order} />}

      {!buying && method === "seller" && ["dispatched", "in_transit"].includes(status) && <SellerSharing order={order} />}
      {!buying && actions.includes("handover") && <HandoverBox orderId={order.id} canSkip={method === "seller"} collect={method === "collect"} />}

      {status === "disputed" && order.dispute && (
        <p className="dl-problem" role="status">
          <AlertTriangle size={14} aria-hidden="true" /> {t("delivery.problem.reported", { reason: t(`delivery.problem.reason.${PROBLEM_KEY[order.dispute.reason] || "other"}`), date: when(order.dispute.at) })}
        </p>
      )}
      {status === "cancelled" && order.cancelReason && <p className="dl-way"><em>“{order.cancelReason}”</em></p>}
      {status === "delivered" && order.fulfilment?.handedOverAt && (
        <p className="dl-way">
          <CheckCircle2 size={14} aria-hidden="true" />{" "}
          {order.fulfilment.verified ? t("delivery.deliveredWithCode", { date: when(order.fulfilment.handedOverAt) }) : t("delivery.deliveredNoCode", { date: when(order.fulfilment.handedOverAt) })}
        </p>
      )}
      {buying && deliveredWindow && <p className="dl-help">{t("delivery.window", { date: when(order.releaseAt) })}</p>}

      {panel === "problem" && <ProblemForm order={order} onClose={() => setPanel(null)} />}
      {panel === "cancel" && <CancelForm order={order} seller={!buying} onClose={() => setPanel(null)} />}

      {panel === null && (actions.includes("confirm") || actions.includes("dispute") || actions.includes("cancel") || actions.includes("decline")) && (
        <div className="ot-actions">
          {actions.includes("confirm") && (
            <button type="button" className="ot-btn primary" disabled={busy} onClick={confirm}>
              {busy ? t("tracker.saving") : tv("Confirm delivery")}
            </button>
          )}
          {actions.includes("dispute") && (
            <button type="button" className="ot-btn" onClick={() => setPanel("problem")}>
              <AlertTriangle size={14} aria-hidden="true" /> {t("delivery.problem.open")}
            </button>
          )}
          {(actions.includes("cancel") || actions.includes("decline")) && (
            <button type="button" className="ot-btn" onClick={() => setPanel("cancel")}>
              {actions.includes("decline") ? t("delivery.cancel.declineOpen") : t("delivery.cancel.open")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
