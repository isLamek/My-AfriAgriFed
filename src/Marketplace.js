import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";

import { db } from "./firebaseConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import ListingCard from "./ListingCard";
import useAccountContext from "./useAccountContext";
import { startCheckout } from "./payments";
import { openConversation } from "./conversations";
import { CATEGORIES, REGIONS, filterListings } from "./listingRules";
import { regionLabel } from "./farmview/regions";

export default function Marketplace() {
  const account = useAccountContext("/marketplace");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState(null);
  const [search, setSearch] = useState(params.get("q") || "");

  const region = REGIONS.includes(params.get("region")) ? params.get("region") : "";
  const category = CATEGORIES.some((c) => c.id === params.get("category")) ? params.get("category") : "";

  useEffect(
    () =>
      onSnapshot(
        collection(db, "marketPrices"),
        (snap) => setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setListings([])
      ),
    []
  );

  const visible = useMemo(() => filterListings(listings, { search, category, region }), [listings, search, category, region]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const messageSeller = async (listing) => {
    try {
      const id = await openConversation({
        me: { uid: account.user.uid, name: account.publicName },
        other: { uid: listing.sellerId, name: listing.sellerName },
        topic: { kind: "listing", id: listing.id, title: listing.product },
      });
      navigate(`/messages/${id}`);
    } catch (error) {
      toast.error(error.code === "permission-denied" ? "This listing is no longer available." : error.message);
    }
  };

  const uid = account.user?.uid;
  const isSeller = account.userType === "farmer";

  return (
    <AppShell
      title="Marketplace"
      subtitle="Produce for sale from producers across Namibia. Pay securely here, then arrange collection or delivery."
      navSections={account.navSections}
      actions={
        isSeller && (
          <button className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={() => navigate("/my-listings")}>
            <Plus size={15} aria-hidden="true" /> List a product
          </button>
        )
      }
      headerRight={<NotificationBell />}
      onLogout={account.logout}
    >
      <div className="market-filters" role="search">
        <label className="aaf-visually-hidden" htmlFor="market-search">Search listings</label>
        <input
          id="market-search"
          className="market-search"
          type="search"
          placeholder="Search products or sellers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="aaf-visually-hidden" htmlFor="market-category">Category</label>
        <select id="market-category" className="aaf-input" value={category} onChange={(e) => setFilter("category", e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <label className="aaf-visually-hidden" htmlFor="market-region">Region</label>
        <select id="market-region" className="aaf-input" value={region} onChange={(e) => setFilter("region", e.target.value)}>
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{regionLabel(r)}</option>
          ))}
        </select>
        {listings && (
          <span className="market-count" aria-live="polite">
            {visible.length} listing{visible.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {listings === null && <p className="aaf-empty">Loading listings…</p>}
      {listings && listings.length === 0 && <p className="aaf-empty">Nothing is listed yet. Check back soon.</p>}
      {listings && listings.length > 0 && visible.length === 0 && (
        <p className="aaf-empty">No listings match these filters.</p>
      )}

      <div className="market-grid">
        {visible.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            isOwn={listing.sellerId === uid}
            canBuy={!!uid}
            onBuy={(l, quantity) => startCheckout({ listingId: l.id, quantity, product: l.product, sellerId: l.sellerId })}
            onMessage={uid && listing.sellerId ? messageSeller : undefined}
          />
        ))}
      </div>
    </AppShell>
  );
}
