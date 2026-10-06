import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { auth } from "./firebaseConfig";
import useAccountContext from "./useAccountContext";
import SiteFooter from "./SiteFooter";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import seedMark from "./images/app-icon.png";
import "./Insights.css";

/**
 * Page chrome for the Data, Statistics and Promotions pages. Members get the
 * normal sidebar layout so these feel part of the app; public visitors (these
 * pages are reachable without an account) get a simple branded header with a
 * way back and a way to sign in.
 */
export default function InsightsFrame({ eyebrow, title, subtitle, activePath, children }) {
  // undefined = still restoring the session, null = nobody, otherwise a user.
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <div className="insights-loading">Loading...</div>;

  if (user && !user.isAnonymous) {
    return (
      <MemberFrame eyebrow={eyebrow} title={title} subtitle={subtitle} activePath={activePath}>
        {children}
      </MemberFrame>
    );
  }
  return (
    <PublicFrame eyebrow={eyebrow} title={title} subtitle={subtitle}>
      {children}
    </PublicFrame>
  );
}

function MemberFrame({ eyebrow, title, subtitle, activePath, children }) {
  const { navSections, logout } = useAccountContext(activePath);
  return (
    <AppShell
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
    >
      {children}
    </AppShell>
  );
}

function PublicFrame({ eyebrow, title, subtitle, children }) {
  const navigate = useNavigate();
  return (
    <div className="insights-public">
      <header className="insights-public-header">
        <button type="button" className="insights-brand" onClick={() => navigate("/")}>
          <img src={seedMark} alt="" />
          <span>AfriAgriFed</span>
        </button>
        <div className="insights-public-actions">
          <button type="button" className="insights-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>
          <button type="button" className="insights-btn primary" onClick={() => navigate("/signin")}>
            <LogIn size={15} /> Sign in
          </button>
        </div>
      </header>
      <div className="insights-public-title">
        {eyebrow && <p className="aaf-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <main className="insights-public-body">{children}</main>
      <SiteFooter />
    </div>
  );
}
