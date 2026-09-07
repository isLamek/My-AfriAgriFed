import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "./firebaseConfig";
import "./DataDashboards.css";

const TRENDED_COLLECTIONS = [
  { key: "institutionResearchArticles", label: "Research articles published" },
  { key: "trainingPrograms", label: "Training programs posted" },
  { key: "promotions", label: "Promotions created" },
];

function daysAgoKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(daysAgoKey(date));
  }
  return days;
}

export default function StatisticsDashboard() {
  const navigate = useNavigate();
  const [docsByCollection, setDocsByCollection] = useState({});
  const last14Days = useMemo(() => buildLastNDays(14), []);

  useEffect(() => {
    const unsubscribes = TRENDED_COLLECTIONS.map((item) =>
      onSnapshot(
        collection(db, item.key),
        (snapshot) => {
          setDocsByCollection((prev) => ({
            ...prev,
            [item.key]: snapshot.docs.map((docSnap) => docSnap.data()),
          }));
        },
        () => {
          setDocsByCollection((prev) => ({ ...prev, [item.key]: [] }));
        }
      )
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  const trendFor = (key) => {
    const docs = docsByCollection[key] || [];
    const map = Object.fromEntries(last14Days.map((day) => [day, 0]));

    docs.forEach((docData) => {
      const created = docData.createdAt?.toDate ? docData.createdAt.toDate() : null;
      if (!created) return;
      const dayKey = daysAgoKey(created);
      if (dayKey in map) map[dayKey] += 1;
    });

    return last14Days.map((day) => ({ day, count: map[day] }));
  };

  const hasAnyData = TRENDED_COLLECTIONS.some((item) => (docsByCollection[item.key] || []).length > 0);

  return (
    <div className="statistics-page">
      <header className="statistics-header">
        <div>
          <p className="eyebrow">Trends, not just totals</p>
          <h1>Statistics Dashboard</h1>
          <p>14-day activity trends drawn from live platform data.</p>
        </div>
        <button onClick={() => navigate(-1)}>Back</button>
      </header>

      <section className="statistics-grid">
        {!hasAnyData && (
          <div className="statistics-empty-note">
            No activity recorded in the last 14 days yet. Trends will appear here as institutions
            publish research and training programs, and as farmers run promotions. Sales and
            demand trends will join this view once online payments go live.
          </div>
        )}

        {TRENDED_COLLECTIONS.map((item) => {
          const trend = trendFor(item.key);
          const max = Math.max(1, ...trend.map((d) => d.count));

          return (
            <div className="statistics-panel" key={item.key}>
              <h2>{item.label}</h2>
              <div className="statistics-chart">
                {trend.map((d) => (
                  <div className="statistics-bar" key={d.day} title={`${d.day}: ${d.count}`}>
                    <div
                      className="statistics-bar-fill"
                      style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                    />
                    <span>{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
