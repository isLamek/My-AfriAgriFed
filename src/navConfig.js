// Central place for "what links does the sidebar show for this kind of
// account". Keeps ConsumerDashboard/FarmerDashboard/InstitutionDashboard/
// AdminDashboard/Profile all in sync instead of each hard-coding its own
// slightly-different nav list.

import React from "react";
import {
  Newspaper,
  ShoppingCart,
  Microscope,
  BookOpen,
  GraduationCap,
  Handshake,
  BarChart3,
  LineChart,
  Megaphone,
  User,
  Wrench,
  CheckCircle2,
  Tags,
  Receipt,
  MessageSquare,
  Map as MapIcon,
  Truck,
  MessageCircle,
  MapPinned,
} from "lucide-react";

const iconProps = { size: 18, strokeWidth: 2 };

export const buildNavSections = ({ userType, isAdmin, activePath, onFeedClick, onMarketplaceClick }) => {
  const sections = [];
  const mainItems = [];

  if (userType === "institution") {
    mainItems.push({ label: "Research Desk", icon: <Microscope {...iconProps} />, path: "/institutiondashboard" });
  } else {
    // Consumers and farmers share the same dashboard component, with
    // Feed/Marketplace as in-page tabs rather than separate routes.
    mainItems.push({ label: "Community Feed", hint: "Talk: news, photos, tips and questions", icon: <Newspaper {...iconProps} />, path: "/dashboard", state: { page: "feed" }, onClick: onFeedClick });
    mainItems.push({ label: "Marketplace", hint: "Buy: ready-to-sell listings", icon: <ShoppingCart {...iconProps} />, path: "/dashboard", state: { page: "prices" }, onClick: onMarketplaceClick });
  }

  mainItems.push({ label: "Demand Board", hint: "Request: buyers post bulk needs, producers pledge", icon: <MessageSquare {...iconProps} />, path: "/demand-board" });
  mainItems.push({ label: "Market Map", hint: "Where produce is for sale and where it's wanted", icon: <MapPinned {...iconProps} />, path: "/market-map" });

  if (userType === "farmer") {
    mainItems.push({ label: "My Listings", icon: <Tags {...iconProps} />, path: "/my-listings" });
  }

  mainItems.push({ label: "Research", icon: <BookOpen {...iconProps} />, path: "/research" });

  if (userType === "farmer" || userType === "institution") {
    mainItems.push({ label: "Training Programs", icon: <GraduationCap {...iconProps} />, path: "/training" });
    mainItems.push({ label: "Internships", icon: <Handshake {...iconProps} />, path: "/internships" });
  }

  sections.push({ heading: "Workspace", items: mainItems });

  sections.push({
    heading: "Insights",
    items: [
      { label: "Weather Map", hint: "Live weather, satellite and fire hotspots", icon: <MapIcon {...iconProps} />, path: "/map" },
      { label: "Data Dashboard", icon: <BarChart3 {...iconProps} />, path: "/data" },
      { label: "Statistics", icon: <LineChart {...iconProps} />, path: "/statistics" },
      { label: "Promotions", icon: <Megaphone {...iconProps} />, path: "/promotions" },
    ],
  });

  const accountItems = [
    { label: "Messages", hint: "Private chats with buyers and sellers", icon: <MessageCircle {...iconProps} />, path: "/messages" },
    { label: "Order Tracker", icon: <Truck {...iconProps} />, path: "/track-orders" },
    { label: "My Orders", icon: <Receipt {...iconProps} />, path: "/my-orders" },
    { label: "Profile", icon: <User {...iconProps} />, path: "/profile" },
  ];

  if (isAdmin) {
    accountItems.push({ label: "Admin Dashboard", icon: <Wrench {...iconProps} />, path: "/admin/dashboard" });
    accountItems.push({ label: "Verification Queue", icon: <CheckCircle2 {...iconProps} />, path: "/admin" });
  }

  sections.push({ heading: "Account", items: accountItems });

  // Mark whichever item matches the current route as active.
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      active: !!activePath && item.path === activePath,
    })),
  }));
};
