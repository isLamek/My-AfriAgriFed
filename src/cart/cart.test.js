import { addToCart, clampLine, groupBySeller, lineTotal, MAX_LINES, refreshLines, removeLine, setLineQuantity } from "./cart";

const mahangu = { id: "L1", product: "Mahangu", price: 18, unit: "kg", quantity: 40, sellerId: "s1", sellerName: "Sam" };
const beans = { id: "L2", product: "Beans", price: 50, unit: "kg", quantity: 3, sellerId: "s1", sellerName: "Sam" };
const maize = { id: "L3", product: "Maize", price: 10, unit: "kg", sellerId: "s2", sellerName: "Nia" }; // no stock limit

describe("adding to the basket", () => {
  it("adds a listing, and adding it again adds to the same line", () => {
    const one = addToCart([], mahangu, 5);
    expect(one.items).toHaveLength(1);
    expect(one.items[0]).toMatchObject({ listingId: "L1", quantity: 5, price: 18, sellerId: "s1", quantityLeft: 40 });
    const two = addToCart(one.items, mahangu, 7);
    expect(two.items).toHaveLength(1);
    expect(two.items[0].quantity).toBe(12);
  });

  it("never holds more than is for sale, and says when it had to stop", () => {
    const r = addToCart([], beans, 10);
    expect(r.items[0].quantity).toBe(3);
    expect(r.atLimit).toBe(true);
    expect(addToCart(r.items, beans, 1).items[0].quantity).toBe(3);
  });

  it("refuses a sold-out listing and a listing it knows nothing about", () => {
    expect(addToCart([], { ...beans, quantity: 0 }, 1)).toMatchObject({ changed: false, reason: "sold_out" });
    expect(addToCart([], null, 1)).toMatchObject({ changed: false });
    expect(addToCart([], { product: "x" }, 1)).toMatchObject({ changed: false });
  });

  it("treats a missing or silly quantity as one", () => {
    expect(addToCart([], maize).items[0].quantity).toBe(1);
    expect(addToCart([], maize, "abc").items[0].quantity).toBe(1);
    expect(addToCart([], maize, 2.9).items[0].quantity).toBe(2);
  });

  it("stops at the number of different items a basket may hold", () => {
    let items = [];
    for (let i = 0; i < MAX_LINES; i += 1) items = addToCart(items, { ...maize, id: `X${i}` }, 1).items;
    expect(items).toHaveLength(MAX_LINES);
    expect(addToCart(items, { ...maize, id: "one-too-many" }, 1)).toMatchObject({ changed: false, reason: "full" });
    expect(addToCart(items, { ...maize, id: "X0" }, 1).changed).toBe(true); // more of one it already holds is fine
  });

  it("does not change the basket it was given", () => {
    const before = addToCart([], mahangu, 1).items;
    const copy = JSON.parse(JSON.stringify(before));
    addToCart(before, mahangu, 2);
    addToCart(before, beans, 1);
    expect(before).toEqual(copy);
  });
});

describe("changing lines", () => {
  it("sets a quantity within the stock and removes a line", () => {
    const items = addToCart(addToCart([], mahangu, 5).items, beans, 1).items;
    expect(setLineQuantity(items, "L1", 30).find((i) => i.listingId === "L1").quantity).toBe(30);
    expect(setLineQuantity(items, "L1", 400).find((i) => i.listingId === "L1").quantity).toBe(40);
    expect(setLineQuantity(items, "L1", 0).find((i) => i.listingId === "L1").quantity).toBe(1);
    expect(removeLine(items, "L1").map((i) => i.listingId)).toEqual(["L2"]);
  });

  it("clamps typed quantities", () => {
    expect(clampLine("12", mahangu)).toBe(12);
    expect(clampLine("", mahangu)).toBe(1);
    expect(clampLine(5000, maize)).toBe(1000);
    expect(clampLine(2, { quantity: 0 })).toBe(0);
  });
});

describe("grouping by seller", () => {
  it("gives each seller their own group and total, in the order they were added", () => {
    let items = addToCart([], maize, 10).items;
    items = addToCart(items, mahangu, 10).items;
    items = addToCart(items, beans, 2).items;
    const groups = groupBySeller(items);
    expect(groups.map((g) => g.sellerId)).toEqual(["s2", "s1"]);
    expect(groups[0].total).toBe(100);
    expect(groups[1].total).toBe(280);
    expect(groups[1].lines).toHaveLength(2);
    expect(lineTotal(items[0])).toBe(100);
  });
});

describe("keeping the basket honest", () => {
  it("drops what is gone or sold out, refreshes prices, and trims quantities to the stock", () => {
    const items = addToCart(addToCart(addToCart([], mahangu, 30).items, beans, 3).items, maize, 4).items;
    const live = {
      L1: { ...mahangu, price: 20, quantity: 10 }, // dearer and mostly sold
      L2: { ...beans, quantity: 0 }, // sold out
      // L3 deleted
    };
    const { items: kept, dropped } = refreshLines(items, live);
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ listingId: "L1", quantity: 10, price: 20, quantityLeft: 10 });
    expect(dropped.map((d) => d.listingId).sort()).toEqual(["L2", "L3"]);
  });
});
