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

  sections.push({ id: "market", heading: t("nav.market"), items: mainItems });

  // The things a person does every day, always in view.
  const basketCount = readCart(auth.currentUser?.uid).length;
  sections.push({
    id: "activity",
    heading: t("nav.activity"),
    items: [
      { label: t("nav.messages"), hint: t("nav.messagesHint"), icon: <MessageCircle {...iconProps} />, path: "/messages" },
      { label: t("nav.orders"), hint: t("nav.ordersHint"), icon: <Truck {...iconProps} />, path: "/track-orders" },
      { label: t("nav.basket"), hint: t("nav.basketHint"), icon: <ShoppingBasket {...iconProps} />, path: "/cart", badge: basketCount || null },
    ],
  });

  // Reading and looking things up: folded away until wanted (a group with one item is not folded).
  const learn = [{ label: t("nav.research"), icon: <BookOpen {...iconProps} />, path: "/research" }];
  if (userType === "farmer" || userType === "institution") {
    learn.push({ label: t("nav.trainingPrograms"), icon: <GraduationCap {...iconProps} />, path: "/training" });
    learn.push({ label: t("nav.internships"), icon: <Handshake {...iconProps} />, path: "/internships" });
  }
  sections.push({ id: "learn", heading: t("nav.learn"), collapsible: learn.length > 1, items: learn });

  sections.push({
    id: "insights",
    heading: t("nav.insights"),
    collapsible: true,
    items: [
      { label: t("nav.weatherMap"), hint: t("nav.weatherMapHint"), icon: <MapIcon {...iconProps} />, path: "/map" },
      { label: t("nav.dataDashboard"), icon: <BarChart3 {...iconProps} />, path: "/data" },
      { label: t("nav.statistics"), icon: <LineChart {...iconProps} />, path: "/statistics" },
      { label: t("nav.promotions"), icon: <Megaphone {...iconProps} />, path: "/promotions" },
    ],
  });

  if (isAdmin) {
    sections.push({
      id: "admin",
      items: [
        { label: "Admin Dashboard", icon: <Wrench {...iconProps} />, path: "/admin/dashboard" },
        { label: "Verification Queue", icon: <CheckCircle2 {...iconProps} />, path: "/admin" },
      ],
    });
  }

  // Personal things live in the menu that opens from the person's name at the foot of the sidebar
  // (AppShell shows any section marked `menu: true` there, not in the list).
  sections.push({
    id: "account",
    menu: true,
    items: [
      { label: t("nav.profile"), icon: <User {...iconProps} />, path: "/profile" },
      { label: t("nav.myOrders"), hint: t("nav.myOrdersHint"), icon: <Receipt {...iconProps} />, path: "/my-orders" },
      { label: t("nav.deliverForUs"), hint: t("nav.deliverForUsHint"), icon: <PackageCheck {...iconProps} />, path: "/carrier" },
    ],
  });

  // Mark whichever item matches the current route as active.
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      active: !!activePath && item.path === activePath,
    })),
  }));
};
