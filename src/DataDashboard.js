import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "./firebaseConfig";
import "./DataDashboards.css";

const LIVE_FEEDS = [
  { key: "marketPrices", label: "Marketplace listings", collection: "marketPrices" },
  { key: "institutionResearchArticles", label: "Research articles", collection: "institutionResearchArticles" },
  { key: "trainingPrograms", label: "Training programs", collection: "trainingPrograms" },
  { key: "promotions", label: "Active promotions", collection: "promotions" },
];

export default function DataDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [liveCounts, setLiveCounts] = useState({});

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const snap = await getDoc(doc(db, "publicStats", "summary"));
        if (snap.exists()) setSummary(snap.data());
      } catch (error) {
        console.warn("Could not load public stats:", error.message);
      }
    };

    loadSummary();
  }, []);

  useEffect(() => {
    const unsubscribes = LIVE_FEEDS.map((feed) => {
      return onSnapshot(
        collection(db, feed.collection),
        (snapshot) => {
          setLiveCounts((prev) => ({ ...prev, [feed.key]: snapshot.size }));
        },
        () => {
          setLiveCounts((prev) => ({ ...prev, [feed.key]: null }));
        }
      );
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  return (
    <div className="data-page">
      <header className="data-header">
        <div>
          <p className="eyebrow">Open to every sector</p>
          <h1>Data Dashboard</h1>
          <p>What's actually happening on AfriAgriFed, drawn straight from the platform.</p>
        </div>
        <button onClick={() => navigate(-1)}>Back</button>
      </header>

      <section className="data-grid">
        <div className="data-card highlight">
          <span className="data-label">Registered users</span>
          <span className="data-value">{summary?.users ?? "—"}</span>
          <span className="data-footnote">
            {summary?.updatedAt?.toDate
              ? `As of ${summary.updatedAt.toDate().toLocaleDateString()}`
              : "Refreshed whenever an admin opens the Admin Dashboard"}
          </span>
        </div>

        {LIVE_FEEDS.map((feed) => (
          <div className="data-card" key={feed.key}>
            <span className="data-label">{feed.label}</span>
            <span className="data-value">{liveCounts[feed.key] ?? "…"}</span>
          </div>
        ))}
      </section>

      <section className="data-note">
        <h2>What feeds this dashboard</h2>
        <p>
          Marketplace, research, training and promotion counts update live as farmers, consumers
          and institutions use the app. Sales, demand and quantity data will appear here
          automatically once online payments (checkout) go live, per the platform's financial
          model.
        </p>
      </section>
    </div>
  );
}
