import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import InsightsFrame from "./InsightsFrame";
import { demandBoard, formatQuantities, priceBoard } from "./insights";
import { t, tv, formatNumber, formatDate } from "./i18n";

// Collections read live. A feed that fails to load shows "-" instead of a
// misleading zero.
const FEEDS = ["marketPrices", "demandRequests", "institutionResearchArticles", "trainingPrograms", "promotions"];

const money = (n) => `N$ ${formatNumber(Number(n), { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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
      eyebrow={t("data.openToEverySector")}
      title={t("data.dataDashboard")}
      subtitle={t("data.whatIsHappeningOnAfriagrifedRight")}
      activePath="/data"
    >
      <section className="stat-grid">
        <div className="stat-card highlight">
          <span className="stat-label">{t("data.registeredUsers")}</span>
          <span className="stat-value">{summary?.users ?? "-"}</span>
          <span className="stat-foot">
            {summary?.updatedAt?.toDate ? t("data.asOf", { date: formatDate(summary.updatedAt.toDate()) }) : t("data.updatedWhenAnAdminOpensThe")}
          </span>
        </div>
        <Stat label={t("data.marketplaceListings")} value={count("marketPrices")} />
        <Stat label={t("data.openDemand")} value={feeds.demandRequests ? demand.open : count("demandRequests")} foot={feeds.demandRequests ? t("data.fulfilledCount", { count: demand.fulfilled }) : undefined} />
        <Stat label={t("data.researchArticles")} value={count("institutionResearchArticles")} />
        <Stat label={t("data.trainingPrograms")} value={count("trainingPrograms")} />
        <Stat label={t("data.activePromotions")} value={activePromos} />
      </section>

      <div className="insight-split">
        <section className="aaf-card insight-panel">
          <h2>{t("data.marketplacePriceBoard")}</h2>
          <p>{t("data.whatProducersAreAskingRightNow")}</p>
          {feeds.marketPrices === undefined ? (
            <p className="insight-empty">{t("common.loading")}</p>
          ) : prices.length === 0 ? (
            <p className="insight-empty">{t("data.noPricedListingsYetTheyAppear")}</p>
          ) : (
            <div className="insight-table-wrap">
              <table className="insight-table aaf-stack-table">
                <thead>
                  <tr>
                    <th>{t("data.product")}</th>
                    <th>{t("data.unit")}</th>
                    <th className="num">{t("data.listings")}</th>
                    <th className="num">{t("data.lowest")}</th>
                    <th className="num">{t("data.average")}</th>
                    <th className="num">{t("data.highest")}</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.slice(0, 12).map((row) => (
                    <tr key={`${row.product}|${row.unit}`}>
                      <td data-label={t("data.product")}>{row.product}</td>
                      <td data-label={t("data.unit")}>{tv(row.unit)}</td>
                      <td data-label={t("data.listings")} className="num">{row.listings}</td>
                      <td data-label={t("data.lowest")} className="num">{money(row.min)}</td>
                      <td data-label={t("data.average")} className="num">{money(row.avg)}</td>
                      <td data-label={t("data.highest")} className="num">{money(row.max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="insight-foot">{t("data.askingPricesFromListingsNotCompleted")}</p>
        </section>

        <section className="aaf-card insight-panel">
          <h2>{t("data.whatBuyersAreAskingFor")}</h2>
          <p>{t("data.openRequestsOnTheDemandBoard")}</p>
          {feeds.demandRequests === undefined ? (
            <p className="insight-empty">{t("common.loading")}</p>
          ) : demand.topProducts.length === 0 ? (
            <p className="insight-empty">{t("data.noOpenRequestsRightNow")}</p>
          ) : (
            <div className="insight-table-wrap">
              <table className="insight-table aaf-stack-table">
                <thead>
                  <tr>
                    <th>{t("data.product")}</th>
                    <th className="num">{t("data.requests")}</th>
                    <th>{t("data.quantityWanted")}</th>
                  </tr>
                </thead>
                <tbody>
                  {demand.topProducts.slice(0, 12).map((row) => (
                    <tr key={row.product}>
                      <td data-label={t("data.product")}>{row.product}</td>
                      <td data-label={t("data.requests")} className="num">{row.requests}</td>
                      <td data-label={t("data.quantityWanted")}>{formatQuantities(row.quantities)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="insight-foot">{t("data.quantitiesAreWhatBuyersAskedFor")}</p>
        </section>
      </div>

      <section className="aaf-card insight-panel">
        <h2>{t("data.howToReadThis")}</h2>
        <p>
          {t("data.countsUpdateLiveAsPeopleUse")}
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
