import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import seedMark from "./images/seed-mark-reversed.png";
import { VerifyEmailBanner } from "./VerifyEmail";
import { useAccount } from "./AccountContext";
import { roleLabel } from "./navConfig";
import "./AppShell.css";

function readStoredCollapsed() {
  try {
    return localStorage.getItem("aaf_sidebar_collapsed") === "1";
  } catch {
    return false;
  }
}

/**
 * Shared sidebar + top bar for every signed-in page.
 *
 * navSections: [{ heading?: string, items: [{ label, icon, path?, state?, onClick?, active? }] }]
 * actions: optional buttons shown beside the page title (the page's main action).
 */
export default function AppShell({ title, subtitle, navSections = [], headerRight, actions, onLogout, children }) {
  const navigate = useNavigate();
  const account = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(readStoredCollapsed);

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("aaf_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // private browsing or storage disabled
      }
      return next;
    });
  };

  const go = (entry) => {
    setMobileOpen(false);
    if (entry.onClick) return entry.onClick();
    if (entry.path) navigate(entry.path, entry.state ? { state: entry.state } : undefined);
  };

  const name = account.user ? account.publicName : "";
  const role = account.user ? roleLabel(account) : "";

  return (
    <div className="aaf-shell">
      <a className="aaf-skip-link" href="#main-content">Skip to main content</a>

      <button
        className="aaf-mobile-toggle"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`aaf-sidebar ${mobileOpen ? "open" : ""} ${desktopCollapsed ? "collapsed" : ""}`}>
        <button type="button" className="aaf-sidebar-brand" onClick={() => navigate("/")} aria-label="AfriAgriFed home page">
          <img src={seedMark} alt="" />
          <span>AfriAgriFed</span>
        </button>

        <nav className="aaf-sidebar-nav" aria-label="Main">
          {navSections.map((section, sIndex) => (
            <div className="aaf-sidebar-section" key={section.heading || sIndex}>
              {section.heading && <p className="aaf-sidebar-heading">{section.heading}</p>}
              {section.items.map((entry) => (
                <button
                  key={entry.label}
                  className={`aaf-sidebar-link ${entry.active ? "active" : ""}`}
                  aria-current={entry.active ? "page" : undefined}
                  onClick={() => go(entry)}
                >
                  <span className="aaf-sidebar-icon" aria-hidden="true">{entry.icon}</span>
                  <span className="aaf-sidebar-label">{entry.label}</span>
                  {entry.badge ? <span className="aaf-sidebar-badge">{entry.badge}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="aaf-sidebar-footer">
          {name && (
            <button type="button" className="aaf-sidebar-user" onClick={() => go({ path: "/profile" })}>
              <span className="aaf-sidebar-avatar" aria-hidden="true">{name.trim()[0]?.toUpperCase() || "?"}</span>
              <span className="aaf-sidebar-user-text">
                <strong>{name}</strong>
                <span>{role}</span>
              </span>
            </button>
          )}
          {onLogout && (
            <button className="aaf-sidebar-logout" onClick={onLogout}>
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          )}
        </div>
      </aside>

      {mobileOpen && <div className="aaf-mobile-backdrop" onClick={() => setMobileOpen(false)} />}

      <div className="aaf-shell-main">
        <header className="aaf-shell-topbar">
          <div className="aaf-shell-topbar-left">
            <button
              className="aaf-sidebar-collapse-btn"
              onClick={toggleDesktopSidebar}
              aria-label={desktopCollapsed ? "Show sidebar" : "Hide sidebar"}
              title={desktopCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {desktopCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div className="aaf-shell-heading">
              <h1>{title}</h1>
              {subtitle && <p className="aaf-shell-subtitle">{subtitle}</p>}
            </div>
          </div>

          {(actions || headerRight) && (
            <div className="aaf-shell-topbar-right">
              {actions}
              {headerRight}
            </div>
          )}
        </header>

        <VerifyEmailBanner />
        <main id="main-content" className="aaf-shell-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
