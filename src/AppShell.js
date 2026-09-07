import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut } from "lucide-react";
import seedMark from "./images/seed-mark-reversed.png";
import "./AppShell.css";

/**
 * Shared sidebar + topbar layout for every signed-in area of the app
 * (dashboards, profile, admin). Keeps navigation, branding and page
 * headers consistent instead of every page rolling its own header bar.
 *
 * navSections: [{ heading?: string, items: [{ label, icon, path?, onClick?, active? }] }]
 */
export default function AppShell({
  eyebrow,
  title,
  subtitle,
  navSections = [],
  headerRight,
  onLogout,
  theme,
  children,
}) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (item) => {
    setMobileOpen(false);
    if (item.onClick) return item.onClick();
    if (item.path) navigate(item.path);
  };

  return (
    <div className={`aaf-shell ${theme ? `aaf-theme-${theme}` : ""}`}>
      <button
        className="aaf-mobile-toggle"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </button>

      <aside className={`aaf-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="aaf-sidebar-brand" onClick={() => navigate("/")}>
          <img src={seedMark} alt="AfriAgriFed" />
          <span>AfriAgriFed</span>
        </div>

        <nav className="aaf-sidebar-nav">
          {navSections.map((section, sIndex) => (
            <div className="aaf-sidebar-section" key={section.heading || sIndex}>
              {section.heading && <p className="aaf-sidebar-heading">{section.heading}</p>}
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className={`aaf-sidebar-link ${item.active ? "active" : ""}`}
                  onClick={() => go(item)}
                >
                  <span className="aaf-sidebar-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {onLogout && (
          <button className="aaf-sidebar-logout" onClick={onLogout}>
            <span className="aaf-sidebar-icon"><LogOut size={18} /></span> Logout
          </button>
        )}
      </aside>

      {mobileOpen && <div className="aaf-mobile-backdrop" onClick={() => setMobileOpen(false)} />}

      <div className="aaf-shell-main">
        <header className="aaf-shell-topbar">
          <div>
            {eyebrow && <p className="aaf-eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {subtitle && <p className="aaf-shell-subtitle">{subtitle}</p>}
          </div>

          {headerRight && <div className="aaf-shell-topbar-right">{headerRight}</div>}
        </header>

        <main className="aaf-shell-content aaf-animate-in">{children}</main>
      </div>
    </div>
  );
}
