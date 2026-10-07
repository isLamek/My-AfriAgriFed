import React, { useState } from "react";
import { MessageSquare, Minus, Plus, ShieldCheck } from "lucide-react";
import { clampQuantity, formatNad, lineTotal, stockLabel } from "./purchase";
import { maskContactInfo } from "./contactGuard";
import { exampleProducePhoto, fallBackToExample } from "./produceImages";

export const PAYMENT_METHODS = "Card, mobile money or bank transfer, all handled securely by our payment partner";

/**
 * One marketplace listing, with a quantity picker, the running total and a
 * prominent "Pay now". The total shown is a convenience: the server works out the
 * real price from the listing when the buyer pays.
 *
 * Paying and talking both happen on AfriAgriFed: there is a "Message seller"
 * button, and no contact details or offline payment instructions anywhere.
 */
export default function ListingCard({ listing, isOwn, onBuy, onMessage }) {
  const [typed, setTyped] = useState("1");
  const stock = stockLabel(listing);
  const soldOut = stock.state === "sold_out";
  const quantity = clampQuantity(typed, listing);
  const total = lineTotal(listing.price, quantity);
  const payoutsReady = !!listing.sellerSubaccountId;

  const step = (delta) => setTyped(String(clampQuantity(quantity + delta, listing)));

  return (
    <div className={`price-card ${soldOut ? "sold-out" : ""}`}>
      {listing.imageUrl ? (
        <img src={listing.imageUrl} alt={listing.product} className="price-card-image" onError={fallBackToExample(listing.product)} />
      ) : (
        <div className="price-card-photo-example">
          <img src={exampleProducePhoto(listing.product)} alt="" className="price-card-image" />
          <span>Example photo</span>
        </div>
      )}
      <h3>{maskContactInfo(listing.product)}</h3>

      <p className="price-line">
        {formatNad(listing.price)}
        {listing.unit && <span className="price-unit"> / {listing.unit}</span>}
      </p>

      {stock.text && <p className={`price-qty ${stock.state}`}>{stock.text}</p>}
      {listing.sellerName && <p className="price-seller">Sold by {listing.sellerName}</p>}

      {isOwn ? (
        <span className="price-own-badge">Your listing</span>
      ) : soldOut ? (
        <>
          <span className="price-soldout-badge">Sold out</span>
          {onMessage && (
            <button type="button" className="price-message-btn" onClick={() => onMessage(listing)}>
              <MessageSquare size={14} aria-hidden="true" /> Ask when it's back
            </button>
          )}
        </>
      ) : (
        <>
          <div className="qty-box" role="group" aria-label={`Quantity of ${listing.product}`}>
            <button type="button" onClick={() => step(-1)} disabled={quantity <= 1} aria-label="One fewer">
              <Minus size={14} />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={typed}
              aria-label="Quantity"
              onChange={(e) => setTyped(e.target.value)}
              onBlur={() => setTyped(String(quantity))} // tidy up whatever was typed
            />
            <button type="button" onClick={() => step(1)} aria-label="One more">
              <Plus size={14} />
            </button>
          </div>

          <button className="pay-now-btn" disabled={!payoutsReady} onClick={() => onBuy(listing, quantity)}>
            {payoutsReady ? `Pay now · ${formatNad(total)}` : "Online payment coming soon"}
          </button>

          <p className="pay-guarantee">
            <ShieldCheck size={14} aria-hidden="true" /> Order protected by the AfriAgriFed Payment Guarantee
          </p>
          <p className="pay-methods">{PAYMENT_METHODS}.</p>

          {onMessage && (
            <button type="button" className="price-message-btn" onClick={() => onMessage(listing)}>
              <MessageSquare size={14} aria-hidden="true" /> Message seller
            </button>
          )}
        </>
      )}
    </div>
  );
}
