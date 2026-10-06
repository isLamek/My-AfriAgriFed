import { dailyCounts, demandBoard, formatQuantities, lastDays, priceBoard } from "./insights";

describe("priceBoard", () => {
  const listings = [
    { product: "Mahangu", price: 10, unit: "kg", sellerId: "a" },
    { product: " mahangu ", price: "14", unit: "KG", sellerId: "b" }, // same product despite case/space/string price
    { product: "Mahangu", price: 12, unit: "kg", sellerId: "a" },
    { product: "Mahangu", price: 300, unit: "crate", sellerId: "c" }, // different unit: separate row
    { product: "Tomatoes", price: 25, unit: "kg", sellerId: "b" },
    { product: "", price: 5 }, // incomplete: ignored
    { product: "Beans", price: "abc" }, // bad price: ignored
    { product: "Beans", price: -4 }, // negative: ignored
  ];

  it("groups by product and unit with min, average, max, listings and distinct sellers", () => {
    const rows = priceBoard(listings);
    const mahangu = rows.find((r) => r.product === "Mahangu" && r.unit === "kg");
    expect(mahangu).toEqual({ product: "Mahangu", unit: "kg", listings: 3, sellers: 2, min: 10, max: 14, avg: 12 });
    expect(rows.find((r) => r.unit === "crate")).toMatchObject({ listings: 1, min: 300, max: 300 });
  });
  it("ignores incomplete listings and sorts by popularity", () => {
    const rows = priceBoard(listings);
    expect(rows.map((r) => `${r.product}/${r.unit}`)).toEqual(["Mahangu/kg", "Mahangu/crate", "Tomatoes/kg"]);
  });
  it("leaves out sold-out listings but keeps ones with no stock limit", () => {
    const rows = priceBoard([
      { product: "Beans", price: 50, unit: "kg", sellerId: "a", quantity: 0 },
      { product: "Beans", price: 60, unit: "kg", sellerId: "b", quantity: 4 },
      { product: "Beans", price: 70, unit: "kg", sellerId: "c", quantity: null },
    ]);
    expect(rows).toEqual([{ product: "Beans", unit: "kg", listings: 2, sellers: 2, min: 60, max: 70, avg: 65 }]);
  });
  it("copes with nothing", () => {
    expect(priceBoard([])).toEqual([]);
    expect(priceBoard(undefined)).toEqual([]);
  });
});

describe("demandBoard", () => {
  const demands = [
    { product: "Maize", quantityNeeded: 500, unit: "kg", status: "open" },
    { product: "maize", quantityNeeded: "250", unit: "kg" }, // no status: open
    { product: "Maize", quantityNeeded: 10, unit: "crate", status: "open" },
    { product: "Beans", quantityNeeded: 80, unit: "kg", status: "fulfilled" },
    { product: "Cabbage", quantityNeeded: 0, unit: "kg", status: "open" }, // no real quantity
  ];
  it("counts open and fulfilled", () => {
    expect(demandBoard(demands)).toMatchObject({ open: 4, fulfilled: 1, total: 5 });
  });
  it("lists what open requests want and never adds different units together", () => {
    const [top] = demandBoard(demands).topProducts;
    expect(top).toEqual({ product: "Maize", requests: 3, quantities: { kg: 750, crate: 10 } });
    expect(formatQuantities(top.quantities)).toBe("750 kg + 10 crate");
  });
  it("leaves fulfilled and zero-quantity requests out of the top list", () => {
    expect(demandBoard(demands).topProducts.map((p) => p.product)).toEqual(["Maize"]);
  });
  it("copes with nothing", () => expect(demandBoard(undefined)).toMatchObject({ open: 0, fulfilled: 0, topProducts: [] }));
});

describe("lastDays and dailyCounts", () => {
  const now = new Date(2026, 9, 2, 15, 0); // 2 Oct 2026
  it("returns n local days, oldest first, ending today, across a month boundary", () => {
    expect(lastDays(3, now)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });
  it("counts documents per day, handles Firestore timestamps, and compares with the period before", () => {
    const days = lastDays(3, now);
    const before = ["2026-09-27", "2026-09-28", "2026-09-29"];
    const ts = (y, m, d) => ({ toDate: () => new Date(y, m, d, 9) });
    const docs = [
      { createdAt: ts(2026, 9, 2) },
      { createdAt: new Date(2026, 9, 2, 1) },
      { createdAt: ts(2026, 9, 1) },
      { createdAt: ts(2026, 8, 28) }, // previous period
      { createdAt: ts(2026, 7, 1) }, // too old: ignored
      {}, // no date: ignored
    ];
    const { series, total, previous, max } = dailyCounts(docs, days, before);
    expect(series).toEqual([
      { day: "2026-09-30", count: 0 },
      { day: "2026-10-01", count: 1 },
      { day: "2026-10-02", count: 2 },
    ]);
    expect(total).toBe(3);
    expect(previous).toBe(1);
    expect(max).toBe(2);
  });
});
