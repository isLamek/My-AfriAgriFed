import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { Check, ChevronDown, ChevronUp, MessageSquare, Package, ShoppingBag, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatNad, quantityText } from "./purchase";
import { db } from "./firebaseConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import { advanceOrder } from "./orders";
import { openConversation } from "./conversations";
import { SUPPORT_EMAIL } from "./business";
import {
  ACTION_LABELS,
  STATUS_LABELS,
  allowedNext,
  buildTimeline,
  isActive,
  needsAttention,
  normaliseStatus,
  waitingOn,
} from "./orderStatus";
import "./OrderTracker.css";

const formatWhen = (ms) =>
  ms
    ? new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

const createdMs = (order) => (order.createdAt?.toDate ? order.createdAt.toDate().getTime() : 0);

/** One order: summary, step-by-step progress, and the buttons this person may press. */
export function OrderCard({ order, uid, side, busy, onAdvance, onMessage }) {
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
            {formatNad(order.amount)}
            {createdMs(order) ? ` · ${new Date(createdMs(order)).toLocaleDateString("en-GB")}` : ""}
          </p>
        </div>
        <span className={`ot-badge ${status}`}>{STATUS_LABELS[status]}</span>
      </header>

      {order.oversold && (
        <p className="ot-oversold" role="alert">
          {side === "selling"
            ? "You did not have enough stock to fill this order in full. Message the buyer to agree what to do: a partial delivery or a refund."
            : `The seller did not have enough stock to fill this order in full. Message them to agree what to do, or ask ${SUPPORT_EMAIL} for a refund.`}
        </p>
      )}

      {status === "cancelled" ? (
        <p className="ot-wait">This order was cancelled. For questions about your refund, e-mail {SUPPORT_EMAIL}.</p>
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

      <div className="ot-foot">
        {order.transactionId && <p className="ot-ref">Payment ref {order.transactionId}</p>}
        {onMessage && (
          <button type="button" className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => onMessage(order)}>
            <MessageSquare size={14} aria-hidden="true" /> Message {side === "selling" ? "buyer" : "seller"}
          </button>
        )}
      </div>
    </article>
  );
}

const showSellingTabTitle = (userType) =>
  userType === "farmer"
    ? "Orders from your buyers, and anything you have bought. Follow each one from payment to delivery."
    : "Everything you have bought, from payment to delivery.";

export default function OrderTracker() {
  const { navSections, logout, userType, user, publicName } = useAccountContext("/orders");
  const navigate = useNavigate();
  const uid = user?.uid;

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
    if (selling.some((o) => allowedNext(o, uid).length > 0 || needsAttention(o))) setSide("selling");
    else if (buying.length === 0 && selling.length > 0) setSide("selling");
  }, [autoPicked, buying, selling, uid]);

  const list = side === "buying" ? buying : selling;
  const needsAction = (orders) => (orders || []).filter((o) => allowedNext(o, uid).length > 0 || needsAttention(o)).length;

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

  const messageOther = async (order) => {
    const buyerSide = order.buyerId === uid;
    try {
      const id = await openConversation({
        me: { uid, name: publicName },
        other: buyerSide
          ? { uid: order.sellerId, name: order.sellerName || "Seller" }
          : { uid: order.buyerId, name: order.buyerName && !order.buyerName.includes("@") ? order.buyerName : "Buyer" },
        topic: { kind: "order", id: order.id, title: order.product || "Order" },
      });
      navigate(`/messages/${id}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const loading = buying === null || selling === null;
  const showSellingTab = userType === "farmer" || (selling && selling.length > 0);

  return (
    <AppShell
      title="Orders"
      subtitle={showSellingTabTitle(userType)}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
    >
      <div className="ot-toolbar">
        <div className="ot-tabs" role="tablist">
          <button role="tab" aria-selected={side === "buying"} className={side === "buying" ? "on" : ""} onClick={() => setSide("buying")}>
            <ShoppingBag size={16} aria-hidden="true" /> Purchases
            {needsAction(buying) > 0 && <span className="ot-count">{needsAction(buying)}</span>}
          </button>
          {showSellingTab && (
            <button role="tab" aria-selected={side === "selling"} className={side === "selling" ? "on" : ""} onClick={() => setSide("selling")}>
              <Store size={16} aria-hidden="true" /> Sales
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
          <OrderCard key={order.id} order={order} uid={uid} side={side} busy={busyId === order.id} onAdvance={handleAdvance} onMessage={messageOther} />
        ))}
      </div>
    </AppShell>
  );
}
