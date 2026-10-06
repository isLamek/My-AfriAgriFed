import {
  INPUT_TYPES,
  buildFarmDoc,
  buildInputDoc,
  parseAmount,
  sortInputs,
  summarizeInputs,
  todayIso,
  validateFarm,
  validateInput,
} from "./farmInputs";

describe("parseAmount", () => {
  it("handles empty, numbers, commas and rubbish", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount("12,5")).toBe(12.5); // decimal comma
    expect(parseAmount("abc")).toBeNaN();
    expect(parseAmount("-3")).toBeNaN(); // negative amounts make no sense here
  });
});

describe("validateFarm", () => {
  const ok = { name: "Shikongo Farm", lat: -17.79, lng: 15.7 };
  it("accepts a named farm inside Namibia", () => expect(validateFarm(ok)).toEqual({}));
  it("needs a name", () => expect(validateFarm({ ...ok, name: "   " }).name).toBeTruthy());
  it("rejects locations outside Namibia", () => {
    expect(validateFarm({ ...ok, lat: 51.5, lng: -0.1 }).location).toBeTruthy(); // London
    expect(validateFarm({ ...ok, lat: -26.2, lng: 28.0 }).location).toBeTruthy(); // Johannesburg
    expect(validateFarm({ ...ok, lat: null }).location).toBeTruthy();
  });
  it("rejects a bad area", () => expect(validateFarm({ ...ok, areaHa: "lots" }).areaHa).toBeTruthy());
});

describe("validateInput", () => {
  const ok = { date: "2026-10-02", type: "seed", item: "Mahangu seed", quantity: "20", costNad: "450", unit: "kg" };
  it("accepts a complete record", () => expect(validateInput(ok)).toEqual({}));
  it("accepts a record with only the essentials", () => expect(validateInput({ date: "2026-10-02", type: "labour", item: "Weeding" })).toEqual({}));
  it("catches a bad date, type, item and numbers", () => {
    const e = validateInput({ date: "02/10/2026", type: "magic", item: " ", quantity: "x", costNad: "-5" });
    expect(Object.keys(e).sort()).toEqual(["costNad", "date", "item", "quantity", "type"]);
  });
  it("lists every input type the rules allow", () => {
    expect(INPUT_TYPES.map((t) => t.id)).toEqual(
      ["seed", "fertiliser", "pesticide", "herbicide", "water", "labour", "feed", "veterinary", "equipment", "other"]
    );
  });
});

describe("documents for Firestore", () => {
  it("trims, rounds, and leaves out empty optional fields (Firestore rejects undefined)", () => {
    const doc = buildFarmDoc({ name: "  Farm  ", lat: -17.788123456, lng: 15.699, region: "Oshana", crops: [], areaHa: "", notes: "" });
    expect(doc).toEqual({ name: "Farm", lat: -17.78812, lng: 15.699, region: "Oshana" });
    expect(Object.values(doc).includes(undefined)).toBe(false);
  });
  it("keeps provided optional fields", () => {
    const doc = buildFarmDoc({ name: "F", lat: -17.7, lng: 15.7, crops: ["mahangu"], areaHa: "2,5", notes: " hi " });
    expect(doc).toMatchObject({ crops: ["mahangu"], areaHa: 2.5, notes: "hi" });
  });
  it("builds an input document with parsed numbers", () => {
    const doc = buildInputDoc({ date: "2026-10-02", type: "seed", item: " Seed ", quantity: "20", unit: "kg", costNad: "450,50", target: "mahangu", note: "" });
    expect(doc).toEqual({ date: "2026-10-02", type: "seed", item: "Seed", quantity: 20, unit: "kg", costNad: 450.5, target: "mahangu" });
  });
});

describe("summaries", () => {
  const inputs = [
    { date: "2026-10-01", type: "seed", costNad: 450, target: "mahangu" },
    { date: "2026-10-03", type: "fertiliser", costNad: 300.5, target: "mahangu" },
    { date: "2026-10-03", type: "labour", costNad: 200, target: "cowpea" },
    { date: "2026-10-02", type: "water" }, // no cost recorded
  ];
  it("totals money overall, by type and by crop, biggest first", () => {
    const s = summarizeInputs(inputs);
    expect(s.count).toBe(4);
    expect(s.costedEntries).toBe(3);
    expect(s.totalCost).toBe(950.5);
    expect(s.byType[0]).toEqual({ key: "seed", cost: 450 });
    expect(s.byTarget[0]).toEqual({ key: "mahangu", cost: 750.5 });
  });
  it("copes with nothing recorded", () => {
    expect(summarizeInputs([])).toMatchObject({ count: 0, totalCost: 0, byType: [], byTarget: [] });
    expect(summarizeInputs(undefined).count).toBe(0);
  });
  it("sorts newest first", () => {
    expect(sortInputs(inputs).map((i) => i.date)).toEqual(["2026-10-03", "2026-10-03", "2026-10-02", "2026-10-01"]);
  });
  it("formats today's date the way the form needs it", () => {
    expect(todayIso(new Date(2026, 9, 2))).toBe("2026-10-02");
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
