import { FOR_YOU_GAP, MARKET_MAX, marketFeedItems, mixFeed } from "./feedMix";

const NOW = Date.parse("2026-10-07T12:00:00Z");
const days = (n) => NOW - n * 86400000;

describe("market items for the feed", () => {
  it("keeps fresh listings and open requests, newest first", () => {
    const items = marketFeedItems(
      [
        { id: "a", createdAt: { toMillis: () => days(1) }, quantity: 5 },
        { id: "old", createdAt: { toMillis: () => days(30) }, quantity: 5 },
        { id: "gone", createdAt: { toMillis: () => days(1) }, quantity: 0 },
      ],
      [
        { id: "d", status: "open", createdAt: { seconds: days(0.5) / 1000 } },
        { id: "done", status: "fulfilled", createdAt: { seconds: days(0.5) / 1000 } },
      ],
      NOW
    );
    expect(items.map((i) => `${i.feedKind}:${i.id}`)).toEqual(["wanted:d", "sale:a"]);
  });

  it("shows at most a dozen", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `l${i}`, createdAt: days(1) + i, quantity: 1 }));
    expect(marketFeedItems(many, [], NOW)).toHaveLength(MARKET_MAX);
  });
});

describe("mixing into the feed", () => {
  const posts = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, createdAt: days(i) }));
  const market = [
    { feedKind: "sale", id: "m1", at: days(0.5) },
    { feedKind: "wanted", id: "m2", at: days(2.5) },
  ];

  it("in Recent, places market cards by time", () => {
    const order = mixFeed(posts, market, "recent").map((i) => i.id);
    expect(order.slice(0, 4)).toEqual(["p0", "m1", "p1", "p2"]);
    expect(order.indexOf("m2")).toBe(order.indexOf("p2") + 1);
  });

  it("in For You, keeps the post ranking and adds one market card every few posts", () => {
    const order = mixFeed(posts, market, "forYou").map((i) => i.id);
    expect(order.filter((id) => id.startsWith("p"))).toEqual(posts.map((p) => p.id));
    expect(order[FOR_YOU_GAP]).toBe("m1");
    expect(order).toContain("m2");
  });

  it("still shows market cards when there are hardly any posts", () => {
    expect(mixFeed([], market, "forYou").map((i) => i.id)).toEqual(["m1", "m2"]);
  });

  it("doesn't let market cards take over a quiet feed", () => {
    const lots = Array.from({ length: 10 }, (_, i) => ({ feedKind: "sale", id: `s${i}`, at: days(i) }));
    const order = mixFeed(posts.slice(0, 2), lots, "forYou");
    expect(order.filter((i) => i.feedKind === "sale")).toHaveLength(3);
  });

  it("is just the posts when market updates are off", () => {
    expect(mixFeed(posts, [], "forYou")).toHaveLength(posts.length);
  });
});
