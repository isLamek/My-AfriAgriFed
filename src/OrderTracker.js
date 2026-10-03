import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { Check, ChevronDown, ChevronUp, Package, ShoppingBag, Store } from "lucide-react";
import { quantityText } from "./purchase";
import { auth, db } from "./firebaseConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import { advanceOrder } from "./orders";
import {
  ACTION_LABELS,
  STATUS_LABELS,
  allowedNext,
  buildTimeline,
  isActive,
  normaliseStatus,
  waitingOn,
} from "./orderStatus";
import "./OrderTracker.css";

const formatWhen = (ms) =>
  ms
    ? new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

const createdMs = (order) => (order.createdAt?.toDate ? order.createdAt.toDate().getTime() : 0);

/** One order: summary, step-by-step progress, and the buttons this person may press. */
export function OrderCard({ order, uid, side, busy, onAdvance }) {
  const [note, setNote] = useState("");
  const [showLog, setShowLog] = useState(false);

  const status = normaliseStatus(order.status);
  const timeline = buildTimeline(order);
  const actions = allowedNext(order, uid);
  const other = side === "selling" ? order.buyerName || "Buyer" : order.sellerName || "Seller";
  const log = [...(order.statusHistory || [])].reverse();

  const act = async (nextStatus) => {
    const ok = await onAdvance(order, nextStatus, note);
    if (ok) setNote("");
  };

  return (
    <article className={`ot-card ${status}`}>
      <header className="ot-head">
        <div>
          <h3>{order.product || "Order"}</h3>
          <p className="ot-sub">
            {side === "selling" ? "Buyer" : "Seller"}: <strong>{other}</strong>
            {" · "}
            {quantityText(order) ? `${quantityText(order)} · ` : ""}
            {order.currency || "NAD"} {order.amount}
            {createdMs(order) ? ` · ${new Date(createdMs(order)).toLocaleDateString()}` : ""}
          </p>
        </div>
        <span className={`ot-badge ${status}`}>{STATUS_LABELS[status]}</span>
      </header>

      {order.oversold && (
        <p className="ot-oversold" role="alert">
          {side === "selling"
            ? "You did not have enough stock to fill this order in full. Contact the buyer to agree what to do, or ask for a refund."
            : "The seller did not have enough stock to fill this order in full. They will contact you, or you can ask for a refund."}
        </p>
      )}

      {status === "cancelled" ? (
        <p className="ot-wait">This order was cancelled. Contact support if you have questions about a refund.</p>
      ) : (
        <ol className="ot-steps" aria-label="Order progress">
          {timeline.map((step) => (
            <li key={step.id} className={step.state}>
              <span className="ot-dot">{step.state === "done" ? <Check size={14} strokeWidth={3} /> : null}</span>
              <span className="ot-step-label">{step.label}</span>
              <span className="ot-step-time">{formatWhen(step.at)}</span>
            </li>
          ))}
        </ol>
      )}

      {isActive(order) && <p className="ot-wait">{waitingOn(order)}</p>}

      {actions.length > 0 && (
        <div className="ot-actions">
          <input
            type="text"
            value={note}
            maxLength={280}
            placeholder="Add a note (optional), e.g. pickup time or driver"
            onChange={(e) => setNote(e.target.value)}
            aria-label="Note for the other party"
          />
          {actions.map((next) => (
            <button key={next} className="ot-btn primary" disabled={busy} onClick={() => act(next)}>
              {busy ? "Saving…" : ACTION_LABELS[next]}
            </button>
          ))}
        </div>
      )}

      {log.length > 0 && (
        <div className="ot-log">
          <button className="ot-link" onClick={() => setShowLog((v) => !v)}>
            {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />} History ({log.length})
          </button>
          {showLog && (
            <ul>
              {log.map((h, i) => (
                <li key={`${h.status}-${h.at}-${i}`}>
                  <strong>{STATUS_LABELS[normaliseStatus(h.status)]}</strong>
                  <span>{formatWhen(h.at)}</span>
                  {h.note && <em>“{h.note}”</em>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {order.transactionId && <p className="ot-ref">Ref {order.transactionId}</p>}
    </article>
  );
}

export default function OrderTracker() {
  const { theme, navSections, logout, userType } = useAccountContext("/track-orders");
  const uid = auth.currentUser?.uid;

  const [buying, setBuying] = useState(null); // null = still loading
  const [selling, setSelling] = useState(null);
  const [side, setSide] = useState("buying");
  const [filter, setFilter] = useState("active");
  const [busyId, setBusyId] = useState(null);
  const [loadError, setLoadError] = useState("");

  // Two listeners (orders I bought, orders I sold). No orderBy, so no
  // composite index is needed; the list is sorted here instead.
  useEffect(() => {
    if (!uid) return undefined;
    const toList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => createdMs(b) - createdMs(a));
    const onError = (error) => setLoadError(error.message);
    const stopBuying = onSnapshot(query(collection(db, "orders"), where("buyerId", "==", uid)), (s) => setBuying(toList(s)), onError);
    const stopSelling = onSnapshot(query(collection(db, "orders"), where("sellerId", "==", uid)), (s) => setSelling(toList(s)), onError);
    return () => {
      stopBuying();
      stopSelling();
    };
  }, [uid]);

  // Farmers land on the Selling tab when they have orders to act on.
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (autoPicked || buying === null || selling === null) return;
    setAutoPicked(true);
    if (selling.some((o) => allowedNext(o, uid).length > 0)) setSide("selling");
    else if (buying.length === 0 && selling.length > 0) setSide("selling");
  }, [autoPicked, buying, selling, uid]);

  const list = side === "buying" ? buying : selling;
  const needsAction = (orders) => (orders || []).filter((o) => allowedNext(o, uid).length > 0).length;

  const visible = useMemo(() => {
    if (!list) return [];
    return list.filter((o) => (filter === "active" ? isActive(o) : !isActive(o)));
  }, [list, filter]);

  const handleAdvance = async (order, nextStatus, note) => {
    setBusyId(order.id);
    try {
      await advanceOrder(order, nextStatus, note);
      toast.success(`Order marked ${STATUS_LABELS[nextStatus].toLowerCase()}.`);
      return true;
    } catch (error) {
      toast.error(error.code === "permission-denied" ? "You can't make that change right now." : error.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const loading = buying === null || selling === null;
  const showSellingTab = userType === "farmer" || (selling && selling.length > 0);

  return (
    <AppShell
      eyebrow="Fulfilment"
      title="Order Tracker"
      subtitle="Follow every order from payment to delivery."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <div className="ot-toolbar">
        <div className="ot-tabs" role="tablist">
          <button role="tab" aria-selected={side === "buying"} className={side === "buying" ? "on" : ""} onClick={() => setSide("buying")}>
            <ShoppingBag size={16} /> Buying
            {needsAction(buying) > 0 && <span className="ot-count">{needsAction(buying)}</span>}
          </button>
          {showSellingTab && (
            <button role="tab" aria-selected={side === "selling"} className={side === "selling" ? "on" : ""} onClick={() => setSide("selling")}>
              <Store size={16} /> Selling
              {needsAction(selling) > 0 && <span className="ot-count">{needsAction(selling)}</span>}
            </button>
          )}
        </div>

        <div className="ot-filter" role="group" aria-label="Filter orders">
          <button className={filter === "active" ? "on" : ""} onClick={() => setFilter("active")}>In progress</button>
          <button className={filter === "done" ? "on" : ""} onClick={() => setFilter("done")}>Completed</button>
        </div>
      </div>

      {loadError && <p className="ot-error">Could not load your orders: {loadError}</p>}
      {loading && !loadError && <p className="ot-empty">Loading your orders…</p>}

      {!loading && visible.length === 0 && (
        <div className="aaf-card ot-empty-card">
          <Package size={28} />
          <p>
            {filter === "active"
              ? side === "buying"
                ? "No orders in progress. Purchases from the Marketplace will appear here."
                : "No orders waiting on you. New paid orders will appear here and you'll get a notification."
              : "No completed orders yet."}
          </p>
        </div>
      )}

      <div className="ot-list">
        {visible.map((order) => (
          <OrderCard key={order.id} order={order} uid={uid} side={side} busy={busyId === order.id} onAdvance={handleAdvance} />
        ))}
      </div>
    </AppShell>
  );
}
