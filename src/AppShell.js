import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Menu, LogOut } from "lucide-react";
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
import useUnreadMessages from "./useUnreadMessages";
import { auth } from "./firebaseConfig";
import { getAdminProfile } from "./admin";
import { ensurePublicProfile, PROFILE_UPDATED_EVENT } from "./publicProfile";
import "./AppShell.css";
import "./glass.css";
import { t, useI18n } from "./i18n";

/** The signed-in member's photo and name at the foot of the menu. */
function MemberChip({ collapsed, onOpen, expanded }) {
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
  const name = card?.displayName || user.displayName || user.email?.split("@")[0] || t("shell.member");
  return (
    <button
      type="button"
      className="aaf-member-chip"
      onClick={onOpen}
      aria-haspopup="menu"
      aria-expanded={expanded}
      title={collapsed ? t("shell.nameProfile", { name }) : t("shell.accountMenu")}
    >
      <Avatar name={name} photoURL={card?.photoURL} size={34} />
      <span className="aaf-sidebar-label aaf-member-text">
        <strong>{name}</strong>
        <small>{card?.username ? `@${card.username}` : t("shell.setUpYourProfile")}</small>
      </span>
    </button>
  );
}

/**
 * The menu that opens from the person's name: their own pages, the language and signing out.
 * It is placed with position: fixed from the chip's own spot, so the sidebar's scrolling never clips it,
 * above the chip when the menu is wide and beside it when the menu is folded to icons.
 */
function MemberMenu({ collapsed, items, onGo, onLogout }) {
  const { lang, setLanguage, languages } = useI18n();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);

  const toggle = () => {
    if (!open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setPos(collapsed ? { left: (wrapRef.current.closest(".aaf-sidebar")?.getBoundingClientRect().right ?? r.right) + 8, bottom: Math.max(8, window.innerHeight - r.bottom) } : { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 8 });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!wrapRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    menuRef.current?.querySelector("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const pick = (item) => {
    setOpen(false);
    onGo(item);
  };

  return (
    <div className="aaf-member-wrap" ref={wrapRef}>
      <MemberChip collapsed={collapsed} onOpen={toggle} expanded={open} />
      {open && pos && (
        <div className="aaf-member-menu" role="menu" aria-label={t("shell.accountMenu")} ref={menuRef} style={pos}>
          {items.map((item) => (
            <button key={item.label} type="button" role="menuitem" className="aaf-menu-item" onClick={() => pick(item)} title={item.hint}>
              <span className="aaf-sidebar-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {languages.length > 1 && (
            <div className="aaf-menu-lang" role="group" aria-label={t("language.label")} data-i18n-ignore>
              <p className="aaf-menu-heading">{t("language.label")}</p>
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={l.code === lang}
                  lang={l.code}
                  className="aaf-menu-item"
                  title={l.status === "beta" ? t("language.betaNote") : undefined}
                  onClick={() => {
                    setLanguage(l.code);
                    setOpen(false);
                  }}
                >
                  <span className="aaf-sidebar-icon">{l.code === lang ? <Check size={16} aria-hidden="true" /> : null}</span>
                  {l.native}
                </button>
              ))}
            </div>
          )}
          {onLogout && (
            <button type="button" role="menuitem" className="aaf-menu-item aaf-menu-logout" onClick={() => { setOpen(false); onLogout(); }}>
              <span className="aaf-sidebar-icon"><LogOut size={16} aria-hidden="true" /></span>
              {t("shell.logout")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function readOpenSections() {
  try {
    return JSON.parse(localStorage.getItem("aaf_nav_open") || "{}") || {};
  } catch {
    return {};
  }
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
  const unreadMessages = useUnreadMessages();
  const [openSections, setOpenSections] = useState(readOpenSections);
  const toggleSection = (id) =>
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("aaf_nav_open", JSON.stringify(next));
      } catch {
        // ignore - private browsing / storage disabled
      }
      return next;
    });
  const listSections = navSections.filter((s) => !s.menu);
  const menuItems = navSections.filter((s) => s.menu).flatMap((s) => s.items);
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
        aria-label={t("shell.toggleNavigation")}
      >
        <Menu size={20} />
      </button>

      <div className={`aaf-sidebar-rail ${desktopCollapsed ? "collapsed" : ""}`}>
      <aside className={`aaf-sidebar ${mobileOpen ? "open" : ""} ${desktopCollapsed ? "collapsed" : ""}`}>
        <div className="aaf-sidebar-brand" onClick={() => navigate("/")} title={t("shell.afriagrifedHome")}>
          <img src={seedMark} alt="AfriAgriFed" />
          <span className="aaf-sidebar-label">AfriAgriFed</span>
        </div>

        <nav className="aaf-sidebar-nav">
          {listSections.map((section, sIndex) => {
            // A folded group opens by itself when the page you are on is inside it, and the folded
            // icon rail always shows every icon.
            const foldable = !!section.collapsible && !desktopCollapsed;
            const hasActive = section.items.some((i) => i.active);
            const open = !foldable || hasActive || !!openSections[section.id];
            const listId = `aaf-nav-${section.id || sIndex}`;
            return (
            <div className="aaf-sidebar-section" key={section.id || section.heading || sIndex}>
              {section.heading && foldable && (
                <button
                  type="button"
                  className="aaf-sidebar-heading aaf-sidebar-fold"
                  aria-expanded={open}
                  aria-controls={listId}
                  onClick={() => !hasActive && toggleSection(section.id)}
                >
                  {section.heading}
                  <ChevronDown size={13} className={open ? "open" : ""} aria-hidden="true" />
                </button>
              )}
              {section.heading && !foldable && <p className="aaf-sidebar-heading">{section.heading}</p>}
              <div id={listId} hidden={!open}>
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
                  {(() => {
                    const isMessages = item.path === "/messages";
                    const count = isMessages ? unreadMessages : item.badge;
                    if (!count) return null;
                    return <span className="aaf-sidebar-badge" aria-label={isMessages ? t("nav.unreadMessages", { count }) : String(count)}>{count > 99 ? "99+" : count}</span>;
                  })()}
                </button>
              ))}
              </div>
            </div>
            );
          })}
        </nav>

        <MemberMenu collapsed={desktopCollapsed} items={menuItems} onGo={go} onLogout={onLogout} />
      </aside>
        {/* A slim tab on the menu's edge: shows on hover, folds the menu to icons. */}
        <button
          type="button"
          className="aaf-rail-toggle"
          onClick={toggleDesktopSidebar}
          aria-label={desktopCollapsed ? t("shell.expandMenu") : t("shell.collapseMenu")}
          aria-expanded={!desktopCollapsed}
          title={desktopCollapsed ? t("shell.expandMenu2") : t("shell.collapseMenu2")}
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
