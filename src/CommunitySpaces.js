import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Newspaper, ShoppingCart } from "lucide-react";
import farmingImg from "./images/farming.jpg";
import grainsImg from "./images/dash-grains.jpg";
import marketImg from "./images/dash-market.jpg";
import "./CommunitySpaces.css";

// The three places people meet on AfriAgriFed. Each has one job; this strip is
// shown on all of them so nobody has to guess which one to use.
export const SPACES = [
  {
    id: "feed",
    label: "Community Feed",
    icon: Newspaper,
    job: "Talk",
    blurb: "Share news, photos, tips and questions. Open conversation, no deals.",
    path: "/dashboard",
    state: { page: "feed" },
    photo: farmingImg,
  },
  {
    id: "demand",
    label: "Demand Board",
    icon: MessageSquare,
    job: "Request",
    blurb: "Buyers post a bulk quantity they need. Producers pledge to supply it.",
    path: "/demand-board",
    photo: grainsImg,
  },
  {
    id: "market",
    label: "Marketplace",
    icon: ShoppingCart,
    job: "Buy",
    blurb: "Ready-to-sell listings from producers. Pick one and pay.",
    path: "/dashboard",
    state: { page: "prices" },
    photo: marketImg,
  },
];

// Institutions use the Research Desk and the Demand Board only.
export const spacesFor = (userType) =>
  userType === "institution" ? SPACES.filter((s) => s.id === "demand") : SPACES;

export default function CommunitySpaces({ active, userType, onSelect }) {
  const navigate = useNavigate();
  const spaces = spacesFor(userType);
  if (spaces.length < 2) return null; // nothing to switch between

  const choose = (space) => {
    if (space.id === active) return;
    // Pages that own a space (the dashboard holds the feed and marketplace)
    // switch in place; anywhere else we go to it.
    if (onSelect && onSelect(space)) return;
    navigate(space.path, space.state ? { state: space.state } : undefined);
  };

  return (
    <nav className="aaf-spaces" aria-label="Community spaces">
      {spaces.map((space) => {
        const Icon = space.icon;
        const on = space.id === active;
        return (
          <button
            key={space.id}
            type="button"
            className={`aaf-space ${on ? "on" : ""}`}
            aria-current={on ? "page" : undefined}
            onClick={() => choose(space)}
            style={{ "--aaf-space-photo": `url(${space.photo})` }}
          >
            <span className="aaf-space-icon"><Icon size={18} /></span>
            <span className="aaf-space-text">
              <span className="aaf-space-title">
                {space.label}
                <em>{space.job}</em>
              </span>
              <span className="aaf-space-blurb">{space.blurb}</span>
            </span>
          </button>
        );
      })}
      {/* On phones the strip shrinks to three tabs; this line says what the open one is for. */}
      <p className="aaf-spaces-active">{spaces.find((s) => s.id === active)?.blurb}</p>
    </nav>
  );
}
