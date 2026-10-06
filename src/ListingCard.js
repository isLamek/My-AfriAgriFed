import React, { useState } from "react";
import { MapPin, Minus, Plus, Truck, MessageSquare, ImageOff } from "lucide-react";
import { clampQuantity, formatNad, lineTotal, stockLabel } from "./purchase";
import { categoryLabel, fulfilmentLabel, unitLabel } from "./listingRules";
import { regionLabel } from "./farmview/regions";

/**
 * One marketplace listing: what it is, where it is, how you get it, and a
 * quantity picker with the total you will pay. The server works out the real
 * price from the listing when the buyer pays, so the total here cannot be faked.
 */
export default function ListingCard({ listing, isOwn, canBuy = true, onBuy, onMessage }) {
  const [typed, setTyped] = useState("1");
  const stock = stockLabel(listing);
  const soldOut = stock.state === "sold_out";
  const quantity = clampQuantity(typed, listing);
  const total = lineTotal(listing.price, quantity);
  const payoutsReady = !!listing.sellerSubaccountId;

  const step = (delta) => setTyped(String(clampQuantity(quantity + delta, listing)));
  const unit = unitLabel(listing.unit);

  return (
    <article className={`price-card ${soldOut ? "sold-out" : ""}`} aria-label={listing.product}>
      {listing.imageUrl ? (
        <img src={listing.imageUrl} alt={`${listing.product}${listing.sellerName ? ` from ${listing.sellerName}` : ""}`} className="price-card-image" loading="lazy" />
      ) : (
        <div className="price-card-image placeholder" aria-hidden="true">
          <ImageOff size={28} />
        </div>
      )}

      <div className="price-card-body">
        {listing.category && <p className="price-meta">{categoryLabel(listing.category)}</p>}
        <h3>{listing.product}</h3>
        <p className="price-line">
          {formatNad(listing.price)} {unit && <span className="price-unit">{unit}</span>}
        </p>
        {listing.description && <p className="price-meta">{listing.description}</p>}
        {listing.sellerName && <p className="price-meta">Sold by {listing.sellerName}</p>}
        {listing.region && (
          <p className="price-meta">
            <MapPin size={12} aria-hidden="true" /> {regionLabel(listing.region)} Region
          </p>
        )}
        {listing.fulfilment && (
          <p className="price-meta">
            <Truck size={12} aria-hidden="true" /> {fulfilmentLabel(listing.fulfilment)}
            {listing.deliveryNote ? ` · ${listing.deliveryNote}` : ""}
          </p>
        )}
        {stock.text && !soldOut && <p className={`price-qty ${stock.state}`}>{stock.text}</p>}

        <div className="price-card-actions">
          {isOwn ? (
            <span className="price-own-badge">Your listing</span>
          ) : (
            <>
              {soldOut && <span className="price-soldout-badge">Sold out</span>}
              {!soldOut && canBuy && (
                <>
                  <div className="buy-row">
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
                        onBlur={() => setTyped(String(quantity))}
                      />
                      <button type="button" onClick={() => step(1)} aria-label="One more">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button className="aaf-btn aaf-btn-primary aaf-btn-sm" disabled={!payoutsReady} onClick={() => onBuy(listing, quantity)}>
                      Buy · {formatNad(total)}
                    </button>
                  </div>
                  <p className="price-note">
                    {payoutsReady
                      ? `You pay ${formatNad(total)} by card on the next page. Arrange collection or delivery with the seller.`
                      : "This seller can't take online payment yet. Message them to ask."}
                  </p>
                </>
              )}
              {onMessage && (
                <button type="button" className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => onMessage(listing)}>
                  <MessageSquare size={14} aria-hidden="true" /> Message seller
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
