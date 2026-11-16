// WHERE THE MONEY SIDE PLUGS IN.
//
// The delivery flow (server/delivery.js) decides WHEN money should move: the goods were
// handed over, the buyer has had their chance to object, an order was cancelled, a
// problem was reported. It never moves money itself. This file is the one place where
// the payment work (holding the payment until delivery, paying the seller and the
// carrier, refunding the buyer) connects to those moments.
//
// Each function receives the order as it is NOW and returns an object of fields to save
// on the order (typically { payoutStatus: "..." }), or nothing. Throwing is safe: the
// delivery step has already happened, the error is logged, and the sweep tries the money
// step again on its next run (see "retryable" below).
//
// The defaults only RECORD what should happen, so a person (or the real implementation)
// can act on it. Replace the bodies; keep the names and the moments.
//
// Fields on an order that belong to this contract:
//   payoutStatus   "held" | "release_requested" | "released" | "refund_requested" | "refunded" | "on_hold"
//   releaseAt      milliseconds: the earliest the payout may be released (set at handover)
//   releasedAt     milliseconds: when onReleaseDue succeeded (the sweep skips orders that have it)
//   fulfilment.deliveryFee, fulfilment.method, payout.*: what the buyer paid for delivery, and
//                  who it belongs to ("seller" when they deliver, "platform" when a carrier does;
//                  the carrier's share is src/delivery/rules.js carrierPay)

module.exports = {
  /** The goods were handed over (code-verified or confirmed by the buyer). Funds stay held until releaseAt. */
  async onDelivered(order) { // eslint-disable-line no-unused-vars
    return { payoutStatus: "held" };
  },

  /** releaseAt has passed with no problem reported: pay the seller (and the carrier, for platform delivery). */
  async onReleaseDue(order) { // eslint-disable-line no-unused-vars
    return { payoutStatus: "release_requested" };
  },

  /** The order was cancelled before delivery (buyer, seller, support, or the seller did not answer in time): refund the buyer in full. */
  async onCancelled(order, why) { // eslint-disable-line no-unused-vars
    return { payoutStatus: "refund_requested" };
  },

  /** The buyer reported a problem: make sure nothing is paid out until support decides. */
  async onDisputed(order) { // eslint-disable-line no-unused-vars
    return { payoutStatus: "on_hold" };
  },

  /** Support decided. outcome is "release" (pay the seller) or "refund" (return the money to the buyer). */
  async onResolved(order, outcome) { // eslint-disable-line no-unused-vars
    return { payoutStatus: outcome === "refund" ? "refund_requested" : "release_requested" };
  },
};
