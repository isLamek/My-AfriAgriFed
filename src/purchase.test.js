import { LOW_STOCK_AT, MAX_QUANTITY, availableUnits, clampQuantity, formatNad, lineTotal, quantityText, stockLabel } from "./purchase";

describe("availableUnits", () => {
  it("is the stock, zero when negative, and unlimited when the seller set none", () => {
    expect(availableUnits({ quantity: 7 })).toBe(7);
    expect(availableUnits({ quantity: -3 })).toBe(0);
    expect(availableUnits({ quantity: 0 })).toBe(0);
    expect(availableUnits({ quantity: null })).toBe(Infinity);
    expect(availableUnits({})).toBe(Infinity);
    expect(availableUnits(undefined)).toBe(Infinity);
  });
});

describe("clampQuantity", () => {
  const stocked = { quantity: 10 };
  it("keeps sensible whole numbers", () => expect(clampQuantity(3, stocked)).toBe(3));
  it("never goes above the stock or the order limit", () => {
    expect(clampQuantity(99, stocked)).toBe(10);
    expect(clampQuantity(5000, {})).toBe(MAX_QUANTITY);
  });
  it("turns junk into one unit", () => {
    for (const bad of ["", "abc", 0, -4, NaN, null, undefined]) expect(clampQuantity(bad, stocked)).toBe(1);
  });
  it("rounds down decimals", () => expect(clampQuantity("2.9", stocked)).toBe(2));
  it("is zero when sold out, so nothing can be bought", () => {
    expect(clampQuantity(1, { quantity: 0 })).toBe(0);
    expect(clampQuantity(5, { quantity: -1 })).toBe(0);
  });
});

describe("lineTotal", () => {
  it("multiplies and rounds to cents without floating point noise", () => {
    expect(lineTotal(120, 3)).toBe(360);
    expect(lineTotal(0.1, 3)).toBe(0.3); // plain 0.1 * 3 is 0.30000000000000004
    expect(lineTotal("12.5", "4")).toBe(50);
    expect(lineTotal(undefined, 2)).toBe(0);
  });
});

describe("stockLabel", () => {
  it("describes each state", () => {
    expect(stockLabel({ quantity: 0 })).toEqual({ state: "sold_out", text: "Sold out" });
    expect(stockLabel({ quantity: 3 })).toEqual({ state: "low", text: "Only 3 left" });
    expect(stockLabel({ quantity: LOW_STOCK_AT })).toMatchObject({ state: "low" });
    expect(stockLabel({ quantity: LOW_STOCK_AT + 1 })).toEqual({ state: "in_stock", text: "6 available" });
    expect(stockLabel({})).toEqual({ state: "unlimited", text: "" });
  });
});

describe("text helpers", () => {
  it("formats money", () => {
    expect(formatNad(1234.5)).toMatch(/^N\$1.?234[.,]50$/);
    expect(formatNad(226.5)).toMatch(/^N\$226[.,]50$/);
    expect(formatNad(50)).toBe("N$50");
  });
  it("shows the quantity on an order, and copes with old orders that have none", () => {
    expect(quantityText({ quantity: 3, unit: "kg" })).toBe("3 kg");
    expect(quantityText({ quantity: 3 })).toBe("3");
    expect(quantityText({ quantity: 1, unit: "crate" })).toBe("1 crate");
    expect(quantityText({})).toBe("");
    expect(quantityText(undefined)).toBe("");
  });
});
