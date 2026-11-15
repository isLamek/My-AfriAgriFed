import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import InsightsFrame from "./InsightsFrame";
import { dailyCounts, lastDays } from "./insights";
import { t, tv } from "./i18n";

const TRENDS = [
  { key: "marketPrices", label: "Marketplace listings added" },
  { key: "demandRequests", label: "Demand requests posted" },
  { key: "institutionResearchArticles", label: "Research articles published" },
  { key: "trainingPrograms", label: "Training programs posted" },
  { key: "promotions", label: "Promotions created" },
];

const PERIOD = 14;

export default function StatisticsDashboard() {
  const [docsByCollection, setDocsByCollection] = useState({}); // undefined = loading, null = unreadable
  // 28 days so each chart can say how the last 14 compare with the 14 before.
  const [previousDays, days] = useMemo(() => {
    const all = lastDays(PERIOD * 2);
    return [all.slice(0, PERIOD), all.slice(PERIOD)];
  }, []);

  useEffect(() => {
    const unsubscribes = TRENDS.map((item) =>
      onSnapshot(
        collection(db, item.key),
        (snapshot) => setDocsByCollection((prev) => ({ ...prev, [item.key]: snapshot.docs.map((d) => d.data()) })),
        () => setDocsByCollection((prev) => ({ ...prev, [item.key]: null }))
      )
    );
    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  const loaded = TRENDS.every((t) => docsByCollection[t.key] !== undefined);
  const anyActivity = TRENDS.some((trend) => (docsByCollection[trend.key] || []).length > 0);

  return (
    <InsightsFrame
      eyebrow={t("statistics.trendsNotJustTotals")}
      title={t("statistics.statisticsDashboard")}
      subtitle={t("statistics.subtitle", { days: PERIOD })}
      activePath="/statistics"
    >
      {loaded && !anyActivity && (
        <section className="aaf-card insight-panel">
          <p className="insight-empty">
            {t("statistics.nothingHasBeenRecordedYetCharts")}
          </p>
        </section>
      )}

      <div className="trend-grid">
        {TRENDS.map((item) => (
          <Trend key={item.key} label={tv(item.label)} docs={docsByCollection[item.key]} days={days} previousDays={previousDays} />
        ))}
      </div>
    </InsightsFrame>
  );
}

function Trend({ label, docs, days, previousDays }) {
  const { series, total, previous, max } = useMemo(() => dailyCounts(docs || [], days, previousDays), [docs, days, previousDays]);
  const change = total - previous;
  const deltaText =
    previous === 0 && total === 0
      ? t("statistics.noActivity")
      : previous === 0
      ? t("statistics.newNone", { total, days: PERIOD })
      : t("statistics.vsBefore", { change: `${change > 0 ? "+" : ""}${change}`, days: PERIOD });

  return (
    <section className="aaf-card insight-panel">
      <div className="trend-head">
        <div>
          <h2>{label}</h2>
          <span className={`trend-delta ${change > 0 ? "up" : change < 0 ? "down" : ""}`}>
            {docs === undefined ? t("statistics.loading") : docs === null ? t("statistics.couldNotLoad") : deltaText}
          </span>
        </div>
        <span className="trend-total">{docs ? total : "-"}</span>
      </div>

      <div className="trend-chart" role="img" aria-label={t("statistics.chartLabel", { label, total, days: days.length })}>
        <span className="trend-axis">{max}</span>
        {series.map((point) => (
          <div className={`trend-bar ${point.count === 0 ? "zero" : ""}`} key={point.day} title={`${point.day}: ${point.count}`}>
            <i style={{ height: `${point.count === 0 ? 3 : Math.max(6, (point.count / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="trend-days">
        <span>{series[0].day.slice(5)}</span>
        <span>{series[series.length - 1].day.slice(5)}</span>
      </div>
    </section>
  );
}
