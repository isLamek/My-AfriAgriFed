import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Menu, LogOut } from "lucide-react";
import seedMark from "./images/seed-mark-reversed.png";
import farmingImg from "./images/farming.jpg";
import consumersImg from "./images/consumers.jpg";
import educatorsImg from "./images/educators.jpg";
import dataImg from "./images/farming-data.jpg";
import programsImg from "./images/programs.jpg";
import promotionImg from "./images/promotion.jpg";
import statisticsImg from "./images/statistics.jpg";
import cattleImg from "./images/dash-cattle.jpg";
import grainsImg from "./images/dash-grains.jpg";
import marketImg from "./images/dash-market.jpg";
import namibiaImg from "./images/dash-namibia.jpg";
import { VerifyEmailBanner } from "./VerifyEmail";
import { TestRoleBanner } from "./AdminTestRole";
import Avatar from "./Avatar";
import { auth } from "./firebaseConfig";
import { getAdminProfile } from "./admin";
import { ensurePublicProfile, PROFILE_UPDATED_EVENT } from "./publicProfile";
import "./AppShell.css";
import "./glass.css";

/** The signed-in member's photo and name at the foot of the menu. */
function MemberChip({ collapsed, onOpen }) {
  const [card, setCard] = useState(null);
  useEffect(() => {
    let live = true;
    ensurePublicProfile(auth.currentUser, getAdminProfile).then((c) => live && setCard(c));
    const onUpdate = (event) => setCard(event.detail);
    window.addEventListener(PROFILE_UPDATED_EVENT, onUpdate);
    return () => {
      live = false;
      window.removeEventListener(PROFILE_UPDATED_EVENT, onUpdate);
    };
  }, []);
  const user = auth.currentUser;
  if (!user) return null;
  const name = card?.displayName || user.displayName || user.email?.split("@")[0] || "Member";
  return (
    <button type="button" className="aaf-member-chip" onClick={onOpen} title={collapsed ? `${name} - your profile` : "Your profile"}>
      <Avatar name={name} photoURL={card?.photoURL} size={34} />
      <span className="aaf-sidebar-label aaf-member-text">
        <strong>{name}</strong>
        <small>{card?.username ? `@${card.username}` : "Set up your profile"}</small>
      </span>
    </button>
  );
}

function readStoredCollapsed() {
  try {
    return localStorage.getItem("aaf_sidebar_collapsed") === "1";
  } catch {
    return false;
  }
}

/**
 * Shared sidebar + topbar layout for every signed-in area of the app
 * (dashboards, profile, admin). Keeps navigation, branding and page
 * headers consistent instead of every page rolling its own header bar.
 *
 * navSections: [{ heading?: string, items: [{ label, icon, path?, onClick?, active? }] }]
 */
// The page header carries the home page's photography: a farm photo under a
// dark-green wash, so the signed-in app feels like the same site.
const BANNERS = {
  farmer: farmingImg,
  consumer: consumersImg,
  organization: consumersImg,
  institution: educatorsImg,
  admin: dataImg,
};

// Pages with a photo that says what the page is about. The home page's own
// photos are reused where they fit; the rest are free Unsplash photos
// (credits in docs/IMAGE_CREDITS.md). Anything not listed uses the role photo.
const PAGE_BANNERS = {
  Marketplace: marketImg,
  Map: namibiaImg,
  "Demand Board": grainsImg,
  "My Listings": cattleImg,
  "My Orders": consumersImg,
  "Order Tracker": consumersImg,
  "Farming Research Articles": educatorsImg,
  "Farming Research Desk": educatorsImg,
  "Training Programs": programsImg,
  Internships: programsImg,
  Promotions: promotionImg,
  "Statistics Dashboard": statisticsImg,
  "Data Dashboard": dataImg,
};

export default function AppShell({
  eyebrow,
  title,
  subtitle,
  navSections = [],
  headerRight,
  onLogout,
  theme,
  banner,
  children,
}) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(readStoredCollapsed);

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("aaf_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // ignore - private browsing / storage disabled
      }
      return next;
    });
  }, []);

  // "[" folds and unfolds the menu, unless the person is typing somewhere.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "[" || event.ctrlKey || event.metaKey || event.altKey) return;
      const el = document.activeElement;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      toggleDesktopSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleDesktopSidebar]);

  const go = (item) => {
    setMobileOpen(false);
    if (item.onClick) return item.onClick();
    if (item.path) navigate(item.path, item.state ? { state: item.state } : undefined);
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

      <div className={`aaf-sidebar-rail ${desktopCollapsed ? "collapsed" : ""}`}>
      <aside className={`aaf-sidebar ${mobileOpen ? "open" : ""} ${desktopCollapsed ? "collapsed" : ""}`}>
        <div className="aaf-sidebar-brand" onClick={() => navigate("/")} title="AfriAgriFed home">
          <img src={seedMark} alt="AfriAgriFed" />
          <span className="aaf-sidebar-label">AfriAgriFed</span>
        </div>

        <nav className="aaf-sidebar-nav">
          {navSections.map((section, sIndex) => (
            <div className="aaf-sidebar-section" key={section.heading || sIndex}>
              {section.heading && <p className="aaf-sidebar-heading">{section.heading}</p>}
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className={`aaf-sidebar-link ${item.active ? "active" : ""}`}
                  title={item.hint || (desktopCollapsed ? item.label : undefined)}
                  aria-label={item.label}
                  onClick={() => go(item)}
                >
                  <span className="aaf-sidebar-icon">{item.icon}</span>
                  <span className="aaf-sidebar-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <MemberChip collapsed={desktopCollapsed} onOpen={() => go({ path: "/profile" })} />

        {onLogout && (
          <button className="aaf-sidebar-logout" onClick={onLogout} title={desktopCollapsed ? "Logout" : undefined}>
            <span className="aaf-sidebar-icon"><LogOut size={18} /></span>
            <span className="aaf-sidebar-label">Logout</span>
          </button>
        )}
      </aside>
        {/* A slim tab on the menu's edge: shows on hover, folds the menu to icons. */}
        <button
          type="button"
          className="aaf-rail-toggle"
          onClick={toggleDesktopSidebar}
          aria-label={desktopCollapsed ? "Expand menu" : "Collapse menu"}
          aria-expanded={!desktopCollapsed}
          title={desktopCollapsed ? "Expand menu  [" : "Collapse menu  ["}
        >
          {desktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {mobileOpen && <div className="aaf-mobile-backdrop" onClick={() => setMobileOpen(false)} />}

      <div className="aaf-shell-main">
        <header className="aaf-shell-topbar" style={{ "--aaf-banner": `url(${banner || PAGE_BANNERS[title] || BANNERS[theme] || dataImg})` }}>
          <div className="aaf-shell-topbar-left">
            <div>
              {eyebrow && <p className="aaf-eyebrow">{eyebrow}</p>}
              <h1>{title}</h1>
              {subtitle && <p className="aaf-shell-subtitle">{subtitle}</p>}
            </div>
          </div>

          {headerRight && <div className="aaf-shell-topbar-right">{headerRight}</div>}
        </header>

        <VerifyEmailBanner />
        <TestRoleBanner />
        <main className="aaf-shell-content aaf-animate-in">{children}</main>
      </div>
    </div>
  );
}
