import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { clampQuantity, formatNad, lineTotal, stockLabel } from "./purchase";

/**
 * One marketplace listing, with a quantity picker and the running total.
 * The total shown is a convenience: the server works out the real price from
 * the listing when the buyer pays.
 */
export default function ListingCard({ listing, isOwn, onBuy }) {
  const [typed, setTyped] = useState("1");
  const stock = stockLabel(listing);
  const soldOut = stock.state === "sold_out";
  const quantity = clampQuantity(typed, listing);
  const total = lineTotal(listing.price, quantity);
  const payoutsReady = !!listing.sellerSubaccountId;

  const step = (delta) => setTyped(String(clampQuantity(quantity + delta, listing)));

  return (
    <div className={`price-card ${soldOut ? "sold-out" : ""}`}>
      {listing.imageUrl && <img src={listing.imageUrl} alt={listing.product} className="price-card-image" />}
      <h3>{listing.product}</h3>

      <p className="price-line">
        {formatNad(listing.price)}
        {listing.unit && <span className="price-unit"> / {listing.unit}</span>}
      </p>

      {stock.text && <p className={`price-qty ${stock.state}`}>{stock.text}</p>}
      {listing.sellerName && <p className="price-seller">Sold by {listing.sellerName}</p>}

      {isOwn ? (
        <span className="price-own-badge">Your listing</span>
      ) : soldOut ? (
        <span className="price-soldout-badge">Sold out</span>
      ) : (
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
              onBlur={() => setTyped(String(quantity))} // tidy up whatever was typed
            />
            <button type="button" onClick={() => step(1)} aria-label="One more">
              <Plus size={14} />
            </button>
          </div>
          <button
            className="buy-btn"
            disabled={!payoutsReady}
            onClick={() => onBuy(listing, quantity)}
            title={payoutsReady ? "" : "This seller hasn't set up payouts yet"}
          >
            Buy {quantity > 1 ? `${quantity} ` : ""}· {formatNad(total)}
          </button>
        </div>
      )}
    </div>
  );
}
