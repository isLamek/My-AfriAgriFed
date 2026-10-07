// Mixes marketplace listings and Demand Board requests into the Community
// Feed. They stay their own kind of card (see FeedMarketCard.js), so the feed
// still reads as conversation with market updates in between.

export const MARKET_WINDOW_DAYS = 14; // only fresh market posts reach the feed
export const MARKET_MAX = 12;
export const FOR_YOU_GAP = 3; // in "For You", one market card after every 3 posts
export const QUIET_FEED_EXTRA = 3; // at most this many more after the last post

const millis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Recent listings and open requests as feed items, newest first. */
export function marketFeedItems(listings, demands, now = Date.now()) {
  const since = now - MARKET_WINDOW_DAYS * 86400000;
  const sale = (listings || [])
    .map((l) => ({ feedKind: "sale", id: l.id, at: millis(l.createdAt), data: l }))
    .filter((i) => i.at >= since && i.data.quantity !== 0);
  const wanted = (demands || [])
    .filter((d) => d.status === "open")
    .map((d) => ({ feedKind: "wanted", id: d.id, at: millis(d.createdAt), data: d }))
    .filter((i) => i.at >= since);
  return [...sale, ...wanted].sort((a, b) => b.at - a.at).slice(0, MARKET_MAX);
}

/**
 * The feed in order. Posts keep their ranking; market items go in by time
 * ("recent") or one after every few posts ("forYou").
 */
export function mixFeed(posts, market, mode) {
  const postItems = posts.map((p) => ({ feedKind: "post", id: p.id, at: millis(p.createdAt), data: p }));
  if (!market.length) return postItems;
  if (mode === "recent") {
    // same balance as "For You": about one market card per few posts
    const room = Math.max(QUIET_FEED_EXTRA, Math.ceil(postItems.length / FOR_YOU_GAP));
    return [...postItems, ...market.slice(0, room)].sort((a, b) => b.at - a.at);
  }

  const out = [];
  let m = 0;
  postItems.forEach((item, i) => {
    out.push(item);
    if ((i + 1) % FOR_YOU_GAP === 0 && m < market.length) out.push(market[m++]);
  });
  // a quiet feed still shows a little of what is on offer, without being taken over
  const extra = Math.min(QUIET_FEED_EXTRA, market.length - m);
  for (let i = 0; i < extra; i += 1) out.push(market[m++]);
  return out;
}
