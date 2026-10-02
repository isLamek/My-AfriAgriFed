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
    mainItems.push({ label: "Community Feed", icon: <Newspaper {...iconProps} />, path: "/dashboard", onClick: onFeedClick });
    mainItems.push({ label: "Marketplace", icon: <ShoppingCart {...iconProps} />, path: "/dashboard", onClick: onMarketplaceClick });
  }

  mainItems.push({ label: "Demand Board", icon: <MessageSquare {...iconProps} />, path: "/demand-board" });

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
      { label: "Farm Map", icon: <MapIcon {...iconProps} />, path: "/farm-map" },
      { label: "Data Dashboard", icon: <BarChart3 {...iconProps} />, path: "/data" },
      { label: "Statistics", icon: <LineChart {...iconProps} />, path: "/statistics" },
      { label: "Promotions", icon: <Megaphone {...iconProps} />, path: "/promotions" },
    ],
  });

  const accountItems = [
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
