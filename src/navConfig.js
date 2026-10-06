// What the sidebar shows for each kind of account, and what each place is
// called for that person. One list, used by every signed-in page.
//
// The rule: show people only the places that do something for them, and name
// each place after what it does for *them*. A buyer has no farm, so the map is
// "Find produce" for them; for a farmer the same page is "My farms & weather".

import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Newspaper,
  ClipboardList,
  Tags,
  Package,
  MessageSquare,
  Megaphone,
  Map as MapIcon,
  BookOpen,
  GraduationCap,
  Handshake,
  BarChart3,
  LineChart,
  Microscope,
  User,
  Wrench,
  CheckCircle2,
  BadgePercent,
} from "lucide-react";

const iconProps = { size: 18, strokeWidth: 1.75 };
const icon = (Icon) => <Icon {...iconProps} />;

/** The map's name and purpose for each kind of account. */
export const MAP_COPY = {
  farmer: {
    label: "My farms & weather",
    title: "My farms & weather",
    subtitle: "Your farms, input costs, rain, wind and fire alerts on one map.",
  },
  institution: {
    label: "Regional conditions",
    title: "Regional conditions",
    subtitle: "Weather, satellite and crop suitability across Namibia's 14 regions.",
  },
  consumer: {
    label: "Find produce",
    title: "Find produce",
    subtitle: "See which regions have produce for sale, and the weather where it grows.",
  },
};

export const mapCopyFor = (userType) => MAP_COPY[userType] || MAP_COPY.consumer;

/** What the Demand Board is called for each kind of account. */
export const demandLabelFor = (userType) => (userType === "farmer" ? "Buyer requests" : "Bulk requests");

/** What the Promotions page is called for each kind of account. */
export const promotionsLabelFor = (userType) => (userType === "farmer" ? "Promote a product" : "Deals");

/** Plain-language name of the account type, shown under the person's name. */
export const roleLabel = ({ userType, isOrganization, isAdmin }) => {
  if (isAdmin && !userType) return "Administrator";
  if (userType === "farmer") return "Producer";
  if (userType === "institution") return "Institution";
  if (isOrganization) return "Business buyer";
  return "Buyer";
};

const item = (label, Icon, path, extra = {}) => ({ label, icon: icon(Icon), path, ...extra });

function sectionsFor(userType) {
  const map = mapCopyFor(userType);

  if (userType === "farmer") {
    return [
      {
        heading: "Sell",
        items: [
          item("Overview", LayoutDashboard, "/dashboard"),
          item("My listings", Tags, "/my-listings"),
          item("Orders", Package, "/orders"),
          item("Messages", MessageSquare, "/messages"),
          item(demandLabelFor(userType), ClipboardList, "/demand-board"),
          item(promotionsLabelFor(userType), Megaphone, "/promotions"),
        ],
      },
      {
        heading: "Farm",
        items: [
          item(map.label, MapIcon, "/map"),
          item("Research", BookOpen, "/research"),
          item("Training", GraduationCap, "/training"),
          item("Internships", Handshake, "/internships"),
        ],
      },
      {
        heading: "Community",
        items: [
          item("Community feed", Newspaper, "/feed"),
          item("Marketplace", ShoppingCart, "/marketplace"),
        ],
      },
      {
        heading: "Market insights",
        items: [item("Market data", BarChart3, "/data"), item("Trends", LineChart, "/statistics")],
      },
    ];
  }

  if (userType === "institution") {
    return [
      {
        heading: "Research",
        items: [
          item("Research desk", Microscope, "/institutiondashboard"),
          item("Training", GraduationCap, "/training"),
          item("Internships", Handshake, "/internships"),
          item("Messages", MessageSquare, "/messages"),
        ],
      },
      {
        heading: "Sourcing",
        items: [
          item(demandLabelFor(userType), ClipboardList, "/demand-board"),
          item("Marketplace", ShoppingCart, "/marketplace"),
          item("Orders", Package, "/orders"),
        ],
      },
      {
        heading: "Insights",
        items: [
          item(map.label, MapIcon, "/map"),
          item("Market data", BarChart3, "/data"),
          item("Trends", LineChart, "/statistics"),
        ],
      },
    ];
  }

  // Buyers: individuals and businesses (shops, restaurants, schools).
  return [
    {
      heading: "Shop",
      items: [
        item("Overview", LayoutDashboard, "/dashboard"),
        item("Marketplace", ShoppingCart, "/marketplace"),
        item(promotionsLabelFor(userType), BadgePercent, "/promotions"),
        item(demandLabelFor(userType), ClipboardList, "/demand-board"),
        item(map.label, MapIcon, "/map"),
      ],
    },
    {
      heading: "Your activity",
      items: [item("Orders", Package, "/orders"), item("Messages", MessageSquare, "/messages")],
    },
    {
      heading: "Community",
      items: [item("Community feed", Newspaper, "/feed"), item("Market data", BarChart3, "/data")],
    },
  ];
}

export const buildNavSections = ({ userType, isAdmin, activePath }) => {
  // An admin without a member profile only needs the admin tools.
  const sections = isAdmin && !userType ? [] : sectionsFor(userType);

  const account = { heading: "Account", items: [item("Profile", User, "/profile")] };
  if (isAdmin) {
    account.items.push(item("Admin dashboard", Wrench, "/admin/dashboard"));
    account.items.push(item("Verification queue", CheckCircle2, "/admin"));
  }
  sections.push(account);

  return sections.map((section) => ({
    ...section,
    items: section.items.map((entry) => ({ ...entry, active: !!activePath && entry.path === activePath })),
  }));
};

/** Where someone lands after signing in. */
export const homePathFor = (userType) => (userType === "institution" ? "/institutiondashboard" : "/dashboard");
