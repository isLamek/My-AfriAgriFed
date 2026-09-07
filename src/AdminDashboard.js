import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { Store, Wheat, Microscope, CheckCircle2 } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { ADMIN_ROLES, canManageAdmins, claimFounderSeat, getAdminProfile } from "./admin";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import appIcon from "./images/seed-mark.png";
import "./AdminDashboard.css";

const JUMP_TO_DASHBOARDS = [
  { label: "Consumer Dashboard", path: "/dashboard", icon: <Store size={20} /> },
  { label: "Farmer Dashboard", path: "/farmerdashboard", icon: <Wheat size={20} /> },
  { label: "Institution Dashboard", path: "/institutiondashboard", icon: <Microscope size={20} /> },
  { label: "Verification Queue", path: "/admin", icon: <CheckCircle2 size={20} /> },
];

const COUNTED_COLLECTIONS = [
  { key: "users", label: "Registered Users", collection: "users" },
  { key: "marketPrices", label: "Marketplace Listings", collection: "marketPrices" },
  { key: "institutionResearchArticles", label: "Research Articles", collection: "institutionResearchArticles" },
  { key: "researchProblems", label: "Research Problems", collection: "researchProblems" },
  { key: "trainingPrograms", label: "Training Programs", collection: "trainingPrograms" },
  { key: "internships", label: "Internship Listings", collection: "internships" },
  { key: "promotions", label: "Active Promotions", collection: "promotions" },
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);

  const [counts, setCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);

  const [telemetryEvents, setTelemetryEvents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState(ADMIN_ROLES.DEVELOPER);

  // ---- access check + bootstrap ----
  useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;

      if (!user) {
        setChecking(false);
        return;
      }

      const adminProfile = await getAdminProfile(user);
      setProfile(adminProfile);

      if (!adminProfile) {
        // Publicly gettable per firestore.rules - lets a signed-in-but-not-yet-admin
        // user find out whether the founder seat is still unclaimed.
        const bootstrapSnap = await getDoc(doc(db, "system", "bootstrap"));
        const claimed = bootstrapSnap.exists() && bootstrapSnap.data().founderClaimed === true;
        setBootstrapAvailable(!claimed);
      }

      setChecking(false);
    };

    run();
  }, []);

  const claimFounderAccess = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;

    await claimFounderSeat(user);

    logTelemetryEvent(TELEMETRY_EVENTS.ADMIN_ADDED, {
      email: user.email.trim().toLowerCase(),
      role: ADMIN_ROLES.FOUNDER,
      via: "bootstrap",
    });

    const adminProfile = await getAdminProfile(user);
    setProfile(adminProfile);
    setBootstrapAvailable(false);
  };

  // ---- aggregate counts ----
  useEffect(() => {
    if (!profile) return;

    const loadCounts = async () => {
      setCountsLoading(true);
      const results = {};

      await Promise.all(
        COUNTED_COLLECTIONS.map(async (item) => {
          try {
            const snap = await getCountFromServer(collection(db, item.collection));
            results[item.key] = snap.data().count;
          } catch (error) {
            results[item.key] = null;
          }
        })
      );

      setCounts(results);
      setCountsLoading(false);

      // Best-effort refresh of the public, PII-free summary the Data
      // Dashboard reads without needing admin access.
      setDoc(
        doc(db, "publicStats", "summary"),
        { ...results, updatedAt: serverTimestamp() },
        { merge: true }
      ).catch(() => {});
    };

    loadCounts();
  }, [profile]);

  // ---- telemetry stream ----
  useEffect(() => {
    if (!profile) return;

    const telemetryQuery = query(collection(db, "telemetry"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      telemetryQuery,
      (snapshot) => {
        setTelemetryEvents(
          snapshot.docs.slice(0, 500).map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        );
      },
      () => setTelemetryEvents([])
    );

    return () => unsubscribe();
  }, [profile]);

  // ---- admins list (founder only sees management controls, everyone with access can view) ----
  useEffect(() => {
    if (!profile) return;

    const unsubscribe = onSnapshot(collection(db, "admins"), (snapshot) => {
      setAdmins(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, [profile]);

  const eventCountsByType = useMemo(() => {
    const map = {};
    telemetryEvents.forEach((event) => {
      map[event.eventType] = (map[event.eventType] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [telemetryEvents]);

  const last14Days = useMemo(() => buildLastNDays(14), []);

  const dailyActivity = useMemo(() => {
    const map = Object.fromEntries(last14Days.map((day) => [day, 0]));

    telemetryEvents.forEach((event) => {
      const created = event.createdAt?.toDate ? event.createdAt.toDate() : null;
      if (!created) return;
      const key = daysAgoKey(created);
      if (key in map) map[key] += 1;
    });

    return last14Days.map((day) => ({ day, count: map[day] }));
  }, [telemetryEvents, last14Days]);

  const maxDaily = Math.max(1, ...dailyActivity.map((d) => d.count));

  const addAdmin = async (event) => {
    event.preventDefault();
    if (!newAdminEmail.trim()) return;

    const email = newAdminEmail.trim().toLowerCase();

    await setDoc(doc(db, "admins", email), {
      email,
      role: newAdminRole,
      addedBy: auth.currentUser?.email || "unknown",
      addedAt: serverTimestamp(),
    });

    logTelemetryEvent(TELEMETRY_EVENTS.ADMIN_ADDED, { email, role: newAdminRole });
    setNewAdminEmail("");
    setNewAdminRole(ADMIN_ROLES.DEVELOPER);
    toast.success(`${email} added as ${newAdminRole}.`);
  };

  const removeAdmin = async (adminDoc) => {
    if (!window.confirm(`Remove admin access for ${adminDoc.email}?`)) return;

    await deleteDoc(doc(db, "admins", adminDoc.id));
    logTelemetryEvent(TELEMETRY_EVENTS.ADMIN_REMOVED, { email: adminDoc.email });
    toast.success(`Removed admin access for ${adminDoc.email}.`);
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (checking) {
    return (
      <div className="admin-dash-bootstrap">
        <img src={appIcon} alt="" className="admin-dash-bootstrap-icon" />
        <p>Checking admin access...</p>
      </div>
    );
  }

  if (!profile) {
    if (bootstrapAvailable) {
      return (
        <div className="admin-dash-bootstrap">
          <img src={appIcon} alt="AfriAgriFed" className="admin-dash-bootstrap-icon" />
          <h1>Set up the first admin account</h1>
          <p>
            No admin has been configured yet. Since you are signed in, you can claim founder
            access for this account ({auth.currentUser?.email}). Do this only if you are a
            founder of AfriAgriFed.
          </p>
          <button className="aaf-btn aaf-btn-primary" onClick={claimFounderAccess}>
            Claim Founder Access
          </button>
        </div>
      );
    }

    return (
      <div className="admin-dash-bootstrap">
        <img src={appIcon} alt="AfriAgriFed" className="admin-dash-bootstrap-icon" />
        <h1>Access denied</h1>
        <p>This account does not have admin access. Ask a founder to add your email.</p>
        <button className="aaf-btn aaf-btn-ghost" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
    );
  }

  const navSections = buildNavSections({ userType: "admin", isAdmin: true, activePath: "/admin/dashboard" });

  return (
    <AppShell
      eyebrow="Founders & Developers"
      title="Admin Dashboard"
      subtitle={`Signed in as ${auth.currentUser?.email} · role: ${profile.role}`}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme="admin"
    >
      <section className="jump-to-dashboards">
        <p className="aaf-eyebrow">Jump to a dashboard</p>
        <div className="jump-grid">
          {JUMP_TO_DASHBOARDS.map((item) => (
            <button key={item.path} className="jump-card" onClick={() => navigate(item.path)}>
              <span className="jump-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="admin-dash-grid">
        {COUNTED_COLLECTIONS.map((item) => (
          <div className="admin-stat-card" key={item.key}>
            <span className="admin-stat-label">{item.label}</span>
            <span className="admin-stat-value">
              {countsLoading ? "…" : counts[item.key] ?? "—"}
            </span>
          </div>
        ))}
      </section>

      <section className="admin-dash-panels">
        <div className="admin-panel">
          <h2>Activity, last 14 days</h2>
          <div className="activity-chart">
            {dailyActivity.map((d) => (
              <div className="activity-bar" key={d.day} title={`${d.day}: ${d.count}`}>
                <div
                  className="activity-bar-fill"
                  style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                />
                <span>{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <h2>Events by type</h2>
          {eventCountsByType.length === 0 ? (
            <p className="empty-state">No telemetry recorded yet.</p>
          ) : (
            <ul className="event-type-list">
              {eventCountsByType.map(([type, count]) => (
                <li key={type}>
                  <span>{type}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="admin-panel">
        <h2>Admin access control</h2>
        <p>
          {canManageAdmins(profile.role)
            ? "As a founder, you can grant or remove admin access by email."
            : "Only founders can add or remove admin access."}
        </p>

        {canManageAdmins(profile.role) && (
          <form className="add-admin-form" onSubmit={addAdmin}>
            <input
              type="email"
              placeholder="teammate@email.com"
              value={newAdminEmail}
              onChange={(event) => setNewAdminEmail(event.target.value)}
              required
            />
            <select value={newAdminRole} onChange={(event) => setNewAdminRole(event.target.value)}>
              <option value={ADMIN_ROLES.FOUNDER}>Founder</option>
              <option value={ADMIN_ROLES.DEVELOPER}>Developer</option>
              <option value={ADMIN_ROLES.MODERATOR}>Moderator</option>
            </select>
            <button type="submit">Grant Access</button>
          </form>
        )}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Added by</th>
              {canManageAdmins(profile.role) && <th />}
            </tr>
          </thead>
          <tbody>
            {admins.map((adminDoc) => (
              <tr key={adminDoc.id}>
                <td>{adminDoc.email}</td>
                <td>{adminDoc.role}</td>
                <td>{adminDoc.addedBy || "—"}</td>
                {canManageAdmins(profile.role) && (
                  <td>
                    <button className="remove-admin-btn" onClick={() => removeAdmin(adminDoc)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
