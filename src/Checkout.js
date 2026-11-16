import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck, Store, Truck, PackageCheck, Handshake } from "lucide-react";
import { auth } from "./firebaseConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import AddressPicker from "./delivery/AddressPicker";
import { quoteBasket, startBasketCheckout } from "./delivery/api";
import { formatDuration, formatKm, reasonText, vehicleName } from "./delivery/format";
import { groupBySeller, lineTotal, useCart } from "./cart/cart";
import { formatNad } from "./purchase";
import { nearestTown } from "./marketLocation";
import { t, tv } from "./i18n";
import "./delivery/delivery.css";

const LAST_ADDRESS = "aaf_last_delivery_address";
const WINDOWS = ["anytime", "morning", "afternoon"];

const ICONS = { collect: Handshake, seller: Truck, platform: PackageCheck };

function readLastAddress() {
  try {
    return JSON.parse(localStorage.getItem(LAST_ADDRESS) || "null") || {};
  } catch {
    return {};
  }
}

/** The next 15 days as YYYY-MM-DD in Namibia (UTC+2), for the day picker. */
function nextDays(count = 15) {
  const now = Date.now() + 2 * 3600000;
  return Array.from({ length: count }, (_, i) => new Date(now + i * 86400000).toISOString().slice(0, 10));
}

export default function Checkout() {
  const { theme, navSections, logout } = useAccountContext("/cart");
  const location = useLocation();
  const cart = useCart();
  const user = auth.currentUser;

  // What is being paid for: one listing ("Buy now") or one seller's part of the basket.
  const buyNow = location.state && location.state.buyNow;
  const sellerId = location.state && location.state.sellerId;
  const lines = useMemo(() => {
    if (buyNow) return [buyNow];
    return groupBySeller(cart.items).find((g) => g.sellerId === sellerId)?.lines || [];
  }, [buyNow, cart.items, sellerId]);

  const last = useMemo(readLastAddress, []);
  const [address, setAddress] = useState({
    pin: last.pin || null,
    landmark: last.landmark || "",
    contactName: last.contactName || user?.displayName || "",
  });
  const [method, setMethod] = useState("collect");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("anytime");
  const [note, setNote] = useState("");

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const wantedItems = useMemo(() => lines.map((l) => ({ listingId: l.listingId, quantity: l.quantity })), [lines]);
  const itemsKey = JSON.stringify(wantedItems);
  const latest = useRef(0);

  // Ask the server what each way of getting it would cost, whenever the items or the pin change.
  useEffect(() => {
    if (wantedItems.length === 0) return undefined;
    const ticket = ++latest.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const answer = await quoteBasket(wantedItems, address.pin || undefined);
        if (ticket !== latest.current) return;
        setQuote(answer);
        setQuoteError("");
        setMethod((current) => {
          const chosen = answer.quotes.find((q) => q.method === current);
          return chosen && chosen.ok ? current : answer.quotes.find((q) => q.ok)?.method || "collect";
        });
      } catch (error) {
        if (ticket === latest.current) setQuoteError(error.message);
      } finally {
        if (ticket === latest.current) setBusy(false);
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, address.pin?.lat, address.pin?.lng]);

  if (!location.state || (lines.length === 0 && !buyNow)) return <Navigate to="/cart" replace />;

  const sellerName = lines[0]?.sellerName || "";
  const itemsTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const chosen = quote?.quotes.find((q) => q.method === method);
  const fee = method !== "collect" && chosen?.ok ? chosen.fee : 0;
  const total = itemsTotal + fee;
  const delivering = method !== "collect";

  const missing = () => {
    if (!delivering) return "";
    if (!address.pin) return t("delivery.address.pinMissing");
    if (address.landmark.trim().length < 3) return t("delivery.address.needLandmark");
    if (!address.contactName.trim()) return t("delivery.address.needName");
    return "";
  };

  const pay = async () => {
    const problem = missing();
    if (problem) {
      toast.error(problem);
      return;
    }
    setPaying(true);
    try {
      const town = delivering ? nearestTown(address.pin.lat, address.pin.lng) : null;
      const delivery = { method };
      if (delivering) {
        delivery.address = {
          lat: address.pin.lat,
          lng: address.pin.lng,
          label: town ? `Near ${town.name}` : "Namibia", // stored in English, shown in the reader's language
          landmark: address.landmark.trim(),
          contactName: address.contactName.trim(),
        };
        delivery.expectedFee = fee;
        try {
          localStorage.setItem(LAST_ADDRESS, JSON.stringify({ pin: address.pin, landmark: address.landmark, contactName: address.contactName }));
        } catch {
          // fine: the next order just asks again
        }
      }
      if (date) delivery.date = date;
      delivery.window = slot;
      if (note.trim()) delivery.note = note.trim();
      await startBasketCheckout({ items: wantedItems, delivery });
    } catch (error) {
      toast.error(error.message);
      if (error.code === "delivery_price_changed") setAddress((a) => ({ ...a })); // ask again for the new price
      setPaying(false);
    }
  };

  const anyOk = quote?.quotes.some((q) => q.ok);

  return (
    <AppShell
      eyebrow={t("checkout.eyebrow")}
      title={t("checkout.title")}
      subtitle={t("checkout.subtitle")}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <div className="dl-checkout">
        <div className="dl-main">
          <section className="aaf-card dl-section">
            <h2>{t("checkout.yourItems")}</h2>
            <p className="dl-sub">
              <Store size={14} aria-hidden="true" /> {t("checkout.fromSeller", { name: sellerName })}
            </p>
            <ul className="dl-lines">
              {lines.map((l) => (
                <li key={l.listingId}>
                  <span>
                    {l.product} <small>{l.quantity} {l.unit ? tv(l.unit) : ""}</small>
                  </span>
                  <strong>{formatNad(lineTotal(l))}</strong>
                </li>
              ))}
            </ul>
            <p className="dl-sub">
              <Link to="/cart">{t("checkout.changeItems")}</Link>
            </p>
          </section>

          <section className="aaf-card dl-section">
            <h2>{t("checkout.howToGetIt")}</h2>
            {quoteError && <p className="dl-problem" role="alert">{quoteError}</p>}
            {!quote && !quoteError && <p className="dl-sub">{t("checkout.checkingOptions")}</p>}
            {quote && (
              <div className="dl-methods" role="radiogroup" aria-label={t("checkout.howToGetIt")}>
                {quote.quotes.map((q) => {
                  const Icon = ICONS[q.method];
                  const sub =
                    q.method === "collect"
                      ? q.ok
                        ? t("delivery.method.collectNote")
                        : t("delivery.reason.notOffered")
                      : q.ok
                      ? t(q.method === "platform" ? "delivery.method.platformNote" : "delivery.method.sellerNote", {
                          name: sellerName,
                          km: formatKm(q.km),
                          time: formatDuration(q.etaMinutes),
                          vehicle: q.vehicle ? vehicleName(q.vehicle) : "",
                        })
                      : reasonText(q);
                  return (
                    <label key={q.method} className={`dl-method ${method === q.method ? "on" : ""} ${q.ok ? "" : "off"}`}>
                      <input type="radio" name="method" value={q.method} checked={method === q.method} disabled={!q.ok} onChange={() => setMethod(q.method)} />
                      <Icon size={20} aria-hidden="true" />
                      <span className="dl-method-text">
                        <strong>{q.method === "seller" ? t("delivery.method.seller", { name: sellerName }) : t(`delivery.method.${q.method}`)}</strong>
                        <small>{sub}</small>
                      </span>
                      <span className="dl-method-fee">{q.ok ? (q.fee ? formatNad(q.fee) : t("delivery.free")) : ""}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {quote && !anyOk && <p className="dl-problem">{t("checkout.noWayToGetIt")}</p>}
          </section>

          {delivering && (
            <section className="aaf-card dl-section">
              <h2>{t("checkout.whereToDeliver")}</h2>
              <AddressPicker value={address} onChange={setAddress} pickup={quote?.pickup || null} />
            </section>
          )}

          <section className="aaf-card dl-section">
            <h2>{delivering ? t("checkout.whenDeliver") : t("checkout.whenCollect")}</h2>
            <div className="dl-row">
              <label className="dl-field">
                <span>{t("checkout.day")}</span>
                <select value={date} onChange={(e) => setDate(e.target.value)}>
                  <option value="">{t("checkout.asSoonAsPossible")}</option>
                  {nextDays().map((d) => (
                    <option key={d} value={d}>
                      {new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dl-field">
                <span>{t("checkout.timeOfDay")}</span>
                <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                  {WINDOWS.map((w) => (
                    <option key={w} value={w}>
                      {t(`checkout.window.${w}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="dl-field">
              <span>{t("checkout.noteForSeller")}</span>
              <textarea rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("checkout.noteExample")} />
            </label>
          </section>
        </div>

        <aside className="aaf-card dl-summary">
          <h2>{t("checkout.summary")}</h2>
          <dl>
            <div>
              <dt>{t("checkout.items")}</dt>
              <dd>{formatNad(itemsTotal)}</dd>
            </div>
            <div>
              <dt>{t("checkout.delivery")}</dt>
              <dd>{delivering ? (chosen?.ok ? formatNad(fee) : "—") : t("delivery.free")}</dd>
            </div>
            <div className="dl-total">
              <dt>{t("checkout.total")}</dt>
              <dd>{formatNad(total)}</dd>
            </div>
          </dl>
          <button type="button" className="pay-now-btn dl-pay" disabled={busy || paying || !chosen?.ok} onClick={pay}>
            {paying ? t("checkout.opening") : t("checkout.pay", { amount: formatNad(total) })}
          </button>
          <p className="pay-guarantee">
            <ShieldCheck size={14} aria-hidden="true" /> {t("listing.orderProtectedByTheAfriagrifedPayment")}
          </p>
          <p className="dl-hint">{t("checkout.codeNote")}</p>
        </aside>
      </div>
    </AppShell>
  );
}
