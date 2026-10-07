import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import InsightsFrame from "./InsightsFrame";
import { demandBoard, formatQuantities, priceBoard } from "./insights";

// Collections read live. A feed that fails to load shows "-" instead of a
// misleading zero.
const FEEDS = ["marketPrices", "demandRequests", "institutionResearchArticles", "trainingPrograms", "promotions"];

const money = (n) => `N$ ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function DataDashboard() {
  const [summary, setSummary] = useState(null);
  const [feeds, setFeeds] = useState({}); // name -> array of docs, or null if it could not be read

  useEffect(() => {
    getDoc(doc(db, "publicStats", "summary"))
      .then((snap) => snap.exists() && setSummary(snap.data()))
      .catch((error) => console.warn("Could not load public stats:", error.message));
  }, []);

  useEffect(() => {
    const unsubscribes = FEEDS.map((name) =>
      onSnapshot(
        collection(db, name),
        (snapshot) => setFeeds((prev) => ({ ...prev, [name]: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) })),
        () => setFeeds((prev) => ({ ...prev, [name]: null }))
      )
    );
    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  const count = (name) => (feeds[name] === undefined ? "…" : feeds[name] === null ? "-" : feeds[name].length);
  const prices = useMemo(() => priceBoard(feeds.marketPrices), [feeds.marketPrices]);
  const demand = useMemo(() => demandBoard(feeds.demandRequests), [feeds.demandRequests]);
  const activePromos = useMemo(() => {
    if (!feeds.promotions) return feeds.promotions === null ? "-" : "…";
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return feeds.promotions.filter(
      (p) => p.status !== "pending_payment" && (!p.startDate || p.startDate <= iso) && (!p.endDate || p.endDate >= iso)
    ).length;
  }, [feeds.promotions]);

  return (
    <InsightsFrame
      eyebrow="Open to every sector"
      title="Data Dashboard"
      subtitle="What is happening on AfriAgriFed right now, counted straight from the platform."
      activePath="/data"
    >
      <section className="stat-grid">
        <div className="stat-card highlight">
          <span className="stat-label">Registered users</span>
          <span className="stat-value">{summary?.users ?? "-"}</span>
          <span className="stat-foot">
            {summary?.updatedAt?.toDate ? `As of ${summary.updatedAt.toDate().toLocaleDateString()}` : "Updated when an admin opens the Admin Dashboard"}
          </span>
        </div>
        <Stat label="Marketplace listings" value={count("marketPrices")} />
        <Stat label="Open demand requests" value={feeds.demandRequests ? demand.open : count("demandRequests")} foot={feeds.demandRequests ? `${demand.fulfilled} fulfilled` : undefined} />
        <Stat label="Research articles" value={count("institutionResearchArticles")} />
        <Stat label="Training programs" value={count("trainingPrograms")} />
        <Stat label="Active promotions" value={activePromos} />
      </section>

      <div className="insight-split">
        <section className="aaf-card insight-panel">
          <h2>Marketplace price board</h2>
          <p>What producers are asking right now, per product and unit.</p>
          {feeds.marketPrices === undefined ? (
            <p className="insight-empty">Loading...</p>
          ) : prices.length === 0 ? (
            <p className="insight-empty">No priced listings yet. They appear here as producers post to the marketplace.</p>
          ) : (
            <div className="insight-table-wrap">
              <table className="insight-table aaf-stack-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Unit</th>
                    <th className="num">Listings</th>
                    <th className="num">Lowest</th>
                    <th className="num">Average</th>
                    <th className="num">Highest</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.slice(0, 12).map((row) => (
                    <tr key={`${row.product}|${row.unit}`}>
                      <td data-label="Product">{row.product}</td>
                      <td data-label="Unit">{row.unit}</td>
                      <td data-label="Listings" className="num">{row.listings}</td>
                      <td data-label="Lowest" className="num">{money(row.min)}</td>
                      <td data-label="Average" className="num">{money(row.avg)}</td>
                      <td data-label="Highest" className="num">{money(row.max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="insight-foot">Asking prices from listings, not completed sales. Prices in different units are never mixed.</p>
        </section>

        <section className="aaf-card insight-panel">
          <h2>What buyers are asking for</h2>
          <p>Open requests on the Demand Board, by product.</p>
          {feeds.demandRequests === undefined ? (
            <p className="insight-empty">Loading...</p>
          ) : demand.topProducts.length === 0 ? (
            <p className="insight-empty">No open requests right now.</p>
          ) : (
            <div className="insight-table-wrap">
              <table className="insight-table aaf-stack-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Requests</th>
                    <th>Quantity wanted</th>
                  </tr>
                </thead>
                <tbody>
                  {demand.topProducts.slice(0, 12).map((row) => (
                    <tr key={row.product}>
                      <td data-label="Product">{row.product}</td>
                      <td data-label="Requests" className="num">{row.requests}</td>
                      <td data-label="Quantity wanted">{formatQuantities(row.quantities)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="insight-foot">Quantities are what buyers asked for, not what has been pledged or delivered.</p>
        </section>
      </div>

      <section className="aaf-card insight-panel">
        <h2>How to read this</h2>
        <p>
          Counts update live as people use the app. Completed sales and delivery data are not shown here yet; they will
          be added once enough orders have gone through checkout to publish without identifying anyone.
        </p>
      </section>
    </InsightsFrame>
  );
}

function Stat({ label, value, foot }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {foot && <span className="stat-foot">{foot}</span>}
    </div>
  );
}
