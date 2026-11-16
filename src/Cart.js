import React, { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Minus, Plus, ShoppingBasket, Store, Trash2 } from "lucide-react";
import { db } from "./firebaseConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import { groupBySeller, lineTotal, refreshLines, useCart } from "./cart/cart";
import { formatNad } from "./purchase";
import { exampleProducePhoto, fallBackToExample } from "./produceImages";
import { t, tv } from "./i18n";
import "./delivery/delivery.css";

export default function Cart() {
  const { theme, navSections, logout } = useAccountContext("/cart");
  const navigate = useNavigate();
  const cart = useCart();
  const [checking, setChecking] = useState(true);
  const checked = useRef(false);

  // Bring the basket up to date with the listings as they are now (price, stock, gone), once per visit.
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    (async () => {
      try {
        const live = {};
        await Promise.all(
          cart.items.map(async (line) => {
            const snap = await getDoc(doc(db, "marketPrices", line.listingId));
            if (snap.exists()) live[line.listingId] = { id: snap.id, ...snap.data() };
          })
        );
        const { items, dropped } = refreshLines(cart.items, live);
        if (JSON.stringify(items) !== JSON.stringify(cart.items)) cart.replace(items);
        if (dropped.length) toast(t("cart.removedUnavailable", { count: dropped.length }), { icon: "ℹ️" });
      } catch {
        // offline or blocked: show the basket as it was saved; the server checks everything again at payment
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = groupBySeller(cart.items);

  return (
    <AppShell
      eyebrow={t("cart.eyebrow")}
      title={t("cart.title")}
      subtitle={t("cart.subtitle")}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      {groups.length === 0 ? (
        <div className="aaf-card dl-empty">
          <ShoppingBasket size={30} aria-hidden="true" />
          <p>{checking ? t("cart.loading") : t("cart.empty")}</p>
          <button type="button" className="dl-btn primary" onClick={() => navigate("/dashboard", { state: { page: "prices" } })}>
            {t("cart.browse")}
          </button>
        </div>
      ) : (
        <div className="dl-groups">
          {groups.length > 1 && <p className="dl-hint">{t("cart.severalSellers")}</p>}
          {groups.map((group) => (
            <section key={group.sellerId} className="aaf-card dl-section">
              <header className="dl-group-head">
                <h2>
                  <Store size={16} aria-hidden="true" /> {t("cart.fromSeller", { name: group.sellerName })}
                </h2>
                <strong>{formatNad(group.total)}</strong>
              </header>
              <ul className="dl-cart-lines">
                {group.lines.map((line) => (
                  <li key={line.listingId}>
                    <img src={line.imageUrl || exampleProducePhoto(line.product)} alt="" onError={fallBackToExample(line.product)} />
                    <div className="dl-cart-info">
                      <strong>{line.product}</strong>
                      <small>
                        {formatNad(line.price)}
                        {line.unit ? ` / ${tv(line.unit)}` : ""}
                      </small>
                    </div>
                    <div className="qty-box" role="group" aria-label={t("listing.quantityOf", { product: line.product })}>
                      <button type="button" onClick={() => cart.setQuantity(line.listingId, line.quantity - 1)} disabled={line.quantity <= 1} aria-label={t("listing.oneFewer")}>
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={line.quantity}
                        aria-label={t("listing.quantity")}
                        onChange={(e) => cart.setQuantity(line.listingId, e.target.value)}
                      />
                      <button type="button" onClick={() => cart.setQuantity(line.listingId, line.quantity + 1)} aria-label={t("listing.oneMore")}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <strong className="dl-line-total">{formatNad(lineTotal(line))}</strong>
                    <button type="button" className="dl-icon-btn" onClick={() => cart.remove(line.listingId)} aria-label={t("cart.remove", { product: line.product })}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="dl-group-foot">
                <button type="button" className="dl-btn" onClick={() => cart.removeSeller(group.sellerId)}>
                  {t("cart.clearSeller")}
                </button>
                <button type="button" className="pay-now-btn" onClick={() => navigate("/checkout", { state: { sellerId: group.sellerId } })}>
                  {t("cart.checkout", { amount: formatNad(group.total) })}
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
