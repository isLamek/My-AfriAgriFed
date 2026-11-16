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
  ShoppingBasket,
  PackageCheck,
} from "lucide-react";
import { t } from "./i18n";
import { auth } from "./firebaseConfig";
import { readCart } from "./cart/cart";

const iconProps = { size: 18, strokeWidth: 2 };

export const buildNavSections = ({ userType, isAdmin, activePath, onFeedClick, onMarketplaceClick }) => {
  const sections = [];
  const mainItems = [];

  if (userType === "institution") {
    mainItems.push({ label: t("nav.researchDesk"), icon: <Microscope {...iconProps} />, path: "/institutiondashboard" });
  } else {
    // Consumers and farmers share the same dashboard component, with
    // Feed/Marketplace as in-page tabs rather than separate routes.
    mainItems.push({ label: t("nav.communityFeed"), hint: t("nav.communityFeedHint"), icon: <Newspaper {...iconProps} />, path: "/dashboard", state: { page: "feed" }, onClick: onFeedClick });
    mainItems.push({ label: t("nav.marketplace"), hint: t("nav.marketplaceHint"), icon: <ShoppingCart {...iconProps} />, path: "/dashboard", state: { page: "prices" }, onClick: onMarketplaceClick });
  }

  mainItems.push({ label: t("nav.demandBoard"), hint: t("nav.demandBoardHint"), icon: <MessageSquare {...iconProps} />, path: "/demand-board" });
  mainItems.push({ label: t("nav.marketMap"), hint: t("nav.marketMapHint"), icon: <MapPinned {...iconProps} />, path: "/market-map" });

  if (userType === "farmer") {
    mainItems.push({ label: t("nav.myListings"), icon: <Tags {...iconProps} />, path: "/my-listings" });
  }

  mainItems.push({ label: t("nav.research"), icon: <BookOpen {...iconProps} />, path: "/research" });

  if (userType === "farmer" || userType === "institution") {
    mainItems.push({ label: t("nav.trainingPrograms"), icon: <GraduationCap {...iconProps} />, path: "/training" });
    mainItems.push({ label: t("nav.internships"), icon: <Handshake {...iconProps} />, path: "/internships" });
  }

  sections.push({ heading: t("nav.workspace"), items: mainItems });

  sections.push({
    heading: t("nav.insights"),
    items: [
      { label: t("nav.weatherMap"), hint: t("nav.weatherMapHint"), icon: <MapIcon {...iconProps} />, path: "/map" },
      { label: t("nav.dataDashboard"), icon: <BarChart3 {...iconProps} />, path: "/data" },
      { label: t("nav.statistics"), icon: <LineChart {...iconProps} />, path: "/statistics" },
      { label: t("nav.promotions"), icon: <Megaphone {...iconProps} />, path: "/promotions" },
    ],
  });

  const basketCount = readCart(auth.currentUser?.uid).length;
  const accountItems = [
    { label: t("nav.messages"), hint: t("nav.messagesHint"), icon: <MessageCircle {...iconProps} />, path: "/messages" },
    { label: t("nav.basket"), hint: t("nav.basketHint"), icon: <ShoppingBasket {...iconProps} />, path: "/cart", badge: basketCount || null },
    { label: t("nav.orderTracker"), icon: <Truck {...iconProps} />, path: "/track-orders" },
    { label: t("nav.deliverForUs"), hint: t("nav.deliverForUsHint"), icon: <PackageCheck {...iconProps} />, path: "/carrier" },
    { label: t("nav.myOrders"), icon: <Receipt {...iconProps} />, path: "/my-orders" },
    { label: t("nav.profile"), icon: <User {...iconProps} />, path: "/profile" },
  ];

  if (isAdmin) {
    accountItems.push({ label: "Admin Dashboard", icon: <Wrench {...iconProps} />, path: "/admin/dashboard" });
    accountItems.push({ label: "Verification Queue", icon: <CheckCircle2 {...iconProps} />, path: "/admin" });
  }

  sections.push({ heading: t("nav.account"), items: accountItems });

  // Mark whichever item matches the current route as active.
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      active: !!activePath && item.path === activePath,
    })),
  }));
};
