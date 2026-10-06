import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Plus, Wallet } from "lucide-react";

import { db } from "./firebaseConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import { allowedNext, isActive, needsAttention, normaliseStatus, STATUS_LABELS, waitingOn } from "./orderStatus";
import { formatNad, quantityText, stockLabel } from "./purchase";
import { isUnread, subscribeConversations } from "./conversations";
import { deadlineState } from "./demandRules";
import { demandLabelFor } from "./navConfig";
import { regionLabel } from "./farmview/regions";
import { unitLabel } from "./listingRules";

const ms = (v) => (v?.toMillis ? v.toMillis() : 0);
const newestFirst = (a, b) => ms(b.createdAt) - ms(a.createdAt);

/** Live list from a Firestore query; null while loading, [] if it fails. */
function useLive(makeQuery, deps) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const q = makeQuery();
    if (!q) return undefined;
    return onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst)),
      () => setRows([])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return rows;
}

function useUnreadCount(uid) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!uid) return undefined;
    return subscribeConversations(uid, (list) => setCount(list.filter((c) => isUnread(c, uid)).length), () => setCount(0));
  }, [uid]);
  return count;
}

const show = (value) => (value === null || value === undefined ? "…" : value);

function Stat({ label, value, note, attention, onClick }) {
  return (
    <button type="button" className={`aaf-stat ${attention ? "attention" : ""}`} onClick={onClick}>
      <span className="aaf-stat-label">{label}</span>
      <span className="aaf-stat-value">{show(value)}</span>
      {note && <span className="aaf-stat-note">{note}</span>}
    </button>
  );
}

function OrderList({ orders, uid, empty, onOpen }) {
  if (orders === null) return <p className="aaf-empty">Loading…</p>;
  if (orders.length === 0) return <p className="aaf-empty">{empty}</p>;
  return (
    <ul className="aaf-list">
      {orders.slice(0, 5).map((order) => {
        const mine = allowedNext(order, uid).length > 0 || needsAttention(order);
        return (
          <li key={order.id}>
            <span>
              {order.product || "Order"} {quantityText(order) && <span className="aaf-muted">· {quantityText(order)}</span>}
              <span className="aaf-list-sub">{mine ? "Your turn: " : ""}{waitingOn(order) || STATUS_LABELS[normaliseStatus(order.status)]}</span>
            </span>
            <button className="aaf-text-btn" onClick={onOpen}>{mine ? "Update" : "View"}</button>
          </li>
        );
      })}
    </ul>
  );
}

function ProducerOverview({ account }) {
  const navigate = useNavigate();
  const uid = account.user?.uid;
  const sales = useLive(() => uid && query(collection(db, "orders"), where("sellerId", "==", uid)), [uid]);
  const listings = useLive(() => uid && query(collection(db, "marketPrices"), where("sellerId", "==", uid)), [uid]);
  const demands = useLive(() => query(collection(db, "demandRequests"), where("status", "==", "open")), []);
  const unread = useUnreadCount(uid);

  const toAct = useMemo(() => sales && sales.filter((o) => allowedNext(o, uid).length > 0 || needsAttention(o)), [sales, uid]);
  const inProgress = useMemo(() => sales && sales.filter(isActive), [sales]);
  const live = useMemo(() => listings && listings.filter((l) => l.quantity !== 0), [listings]);
  const low = useMemo(() => listings && listings.filter((l) => ["low", "sold_out"].includes(stockLabel(l).state)), [listings]);
  const openDemands = useMemo(
    () => demands && demands.filter((d) => d.buyerId !== uid && deadlineState(d) !== "overdue"),
    [demands, uid]
  );
  const revenue = useMemo(
    () => sales && sales.filter((o) => normaliseStatus(o.status) !== "cancelled").reduce((sum, o) => sum + (Number(o.amount) || 0), 0),
    [sales]
  );

  const payoutsMissing = !account.loading && !account.profile?.flutterwaveSubaccountId;

  return (
    <>
      {payoutsMissing && (
        <div className="aaf-notice warning" role="status">
          <Wallet size={18} aria-hidden="true" />
          <p>Buyers can't pay for your listings until you add the bank account that receives your money.</p>
          <button className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => navigate("/my-listings")}>Set up payouts</button>
        </div>
      )}

      <div className="aaf-stats">
        <Stat label="Orders waiting on you" value={toAct?.length} attention={toAct?.length > 0} note={inProgress ? `${inProgress.length} in progress` : null} onClick={() => navigate("/orders")} />
        <Stat label="Live listings" value={live?.length} note={low?.length ? `${low.length} low or sold out` : "Stock is fine"} onClick={() => navigate("/my-listings")} />
        <Stat label="Unread messages" value={unread} attention={unread > 0} onClick={() => navigate("/messages")} />
        <Stat label="Sales to date" value={revenue === null ? null : formatNad(revenue)} note="Before the 5% commission" onClick={() => navigate("/orders")} />
      </div>

      <div className="aaf-grid-2">
        <section className="aaf-card" aria-labelledby="ov-orders">
          <div className="aaf-card-head">
            <h2 id="ov-orders" className="aaf-section-title">Orders to handle</h2>
            <button className="aaf-text-btn" onClick={() => navigate("/orders")}>All orders</button>
          </div>
          <OrderList orders={inProgress} uid={uid} empty="No open orders. New paid orders appear here and you get a notification." onOpen={() => navigate("/orders")} />
        </section>

        <section className="aaf-card" aria-labelledby="ov-demand">
          <div className="aaf-card-head">
            <h2 id="ov-demand" className="aaf-section-title">{demandLabelFor("farmer")}</h2>
            <button className="aaf-text-btn" onClick={() => navigate("/demand-board")}>See all</button>
          </div>
          {openDemands === null && <p className="aaf-empty">Loading…</p>}
          {openDemands && openDemands.length === 0 && <p className="aaf-empty">No open requests from buyers right now.</p>}
          <ul className="aaf-list">
            {(openDemands || []).slice(0, 5).map((d) => (
              <li key={d.id}>
                <span>
                  {d.title}
                  <span className="aaf-list-sub">
                    {d.quantityNeeded} {d.unit} of {d.product}
                    {d.deadline ? ` · by ${new Date(d.deadline).toLocaleDateString()}` : ""}
                  </span>
                </span>
                <button className="aaf-text-btn" onClick={() => navigate("/demand-board")}>Pledge</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="aaf-card" aria-labelledby="ov-stock">
          <div className="aaf-card-head">
            <h2 id="ov-stock" className="aaf-section-title">Stock</h2>
            <button className="aaf-text-btn" onClick={() => navigate("/my-listings")}>Manage listings</button>
          </div>
          {listings === null && <p className="aaf-empty">Loading…</p>}
          {listings && listings.length === 0 && (
            <div className="aaf-empty">
              <p>You haven't listed anything yet.</p>
              <button className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={() => navigate("/my-listings")}>
                <Plus size={15} aria-hidden="true" /> List your first product
              </button>
            </div>
          )}
          <ul className="aaf-list">
            {(listings || []).slice(0, 6).map((l) => {
              const stock = stockLabel(l);
              return (
                <li key={l.id}>
                  <span>
                    {l.product}
                    <span className="aaf-list-sub">
                      {formatNad(l.price)} {unitLabel(l.unit)}
                      {l.region ? ` · ${regionLabel(l.region)}` : ""}
                    </span>
                  </span>
                  <span className={stock.state === "sold_out" ? "ml-sold" : stock.state === "low" ? "price-qty low" : "aaf-muted"}>
                    {stock.text || "No limit"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}

function BuyerOverview({ account }) {
  const navigate = useNavigate();
  const uid = account.user?.uid;
  const purchases = useLive(() => uid && query(collection(db, "orders"), where("buyerId", "==", uid)), [uid]);
  const myDemands = useLive(() => uid && query(collection(db, "demandRequests"), where("buyerId", "==", uid)), [uid]);
  const listings = useLive(() => collection(db, "marketPrices"), []);
  const unread = useUnreadCount(uid);

  const active = useMemo(() => purchases && purchases.filter(isActive), [purchases]);
  const toConfirm = useMemo(() => purchases && purchases.filter((o) => allowedNext(o, uid).length > 0), [purchases, uid]);
  const openDemands = useMemo(() => myDemands && myDemands.filter((d) => d.status !== "fulfilled"), [myDemands]);
  const fresh = useMemo(() => listings && listings.filter((l) => l.quantity !== 0).slice(0, 6), [listings]);

  return (
    <>
      <div className="aaf-stats">
        <Stat label="Orders on the way" value={active?.length} note={toConfirm?.length ? `${toConfirm.length} to confirm as received` : null} attention={toConfirm?.length > 0} onClick={() => navigate("/orders")} />
        <Stat label="Unread messages" value={unread} attention={unread > 0} onClick={() => navigate("/messages")} />
        <Stat label={`Your ${demandLabelFor("consumer").toLowerCase()}`} value={openDemands?.length} note="Open" onClick={() => navigate("/demand-board")} />
        <Stat label="For sale now" value={listings ? listings.filter((l) => l.quantity !== 0).length : null} note="Listings on the Marketplace" onClick={() => navigate("/marketplace")} />
      </div>

      <div className="aaf-grid-2">
        <section className="aaf-card" aria-labelledby="ov-fresh">
          <div className="aaf-card-head">
            <h2 id="ov-fresh" className="aaf-section-title">New on the Marketplace</h2>
            <button className="aaf-text-btn" onClick={() => navigate("/marketplace")}>Browse all</button>
          </div>
          {fresh === null && <p className="aaf-empty">Loading…</p>}
          {fresh && fresh.length === 0 && <p className="aaf-empty">Nothing is for sale yet. Check back soon.</p>}
          <ul className="aaf-list">
            {(fresh || []).map((l) => (
              <li key={l.id}>
                <span>
                  {l.product}
                  <span className="aaf-list-sub">
                    {l.sellerName ? `${l.sellerName}` : ""}
                    {l.region ? ` · ${regionLabel(l.region)}` : ""}
                  </span>
                </span>
                <span>
                  {formatNad(l.price)} <span className="aaf-muted">{unitLabel(l.unit)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="aaf-card" aria-labelledby="ov-purchases">
          <div className="aaf-card-head">
            <h2 id="ov-purchases" className="aaf-section-title">Your orders</h2>
            <button className="aaf-text-btn" onClick={() => navigate("/orders")}>All orders</button>
          </div>
          <OrderList orders={active} uid={uid} empty="No orders in progress. Things you buy on the Marketplace appear here." onOpen={() => navigate("/orders")} />
        </section>
      </div>
    </>
  );
}

export default function Overview() {
  const account = useAccountContext("/dashboard");
  const navigate = useNavigate();
  const producer = account.userType === "farmer";
  const firstName = account.profile?.personalInfo?.firstName;

  return (
    <AppShell
      title={firstName ? `Welcome back, ${firstName}` : "Overview"}
      subtitle={producer ? "Your sales, stock and buyer requests at a glance." : "Your orders, messages and what's new to buy."}
      navSections={account.navSections}
      actions={
        producer ? (
          <button className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={() => navigate("/my-listings")}>
            <Plus size={15} aria-hidden="true" /> New listing
          </button>
        ) : (
          <button className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={() => navigate("/marketplace")}>
            Shop the Marketplace
          </button>
        )
      }
      headerRight={<NotificationBell />}
      onLogout={account.logout}
    >
      {account.loading ? <p className="aaf-empty">Loading…</p> : producer ? <ProducerOverview account={account} /> : <BuyerOverview account={account} />}
    </AppShell>
  );
}
