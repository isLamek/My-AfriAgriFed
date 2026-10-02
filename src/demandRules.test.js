import {
  countByFilter,
  deadlineState,
  filterDemands,
  isoToday,
  summarizePledges,
  validateDemand,
  validatePledge,
} from "./demandRules";

const TODAY = "2026-10-02";
const good = { title: "Maize for school feeding", product: "White maize", quantityNeeded: "500", unit: "kg", deadline: "", notes: "" };

describe("validateDemand", () => {
  it("accepts a complete request", () => expect(validateDemand(good, TODAY)).toEqual({}));
  it("needs a title, product and a positive quantity", () => {
    const e = validateDemand({ ...good, title: " ", product: "", quantityNeeded: "0" }, TODAY);
    expect(Object.keys(e).sort()).toEqual(["product", "quantityNeeded", "title"]);
  });
  it("rejects negative and non-numeric quantities (the old form allowed them)", () => {
    expect(validateDemand({ ...good, quantityNeeded: "-5" }, TODAY).quantityNeeded).toBeTruthy();
    expect(validateDemand({ ...good, quantityNeeded: "abc" }, TODAY).quantityNeeded).toBeTruthy();
    expect(validateDemand({ ...good, quantityNeeded: "" }, TODAY).quantityNeeded).toBeTruthy();
  });
  it("rejects a deadline in the past but accepts today and later", () => {
    expect(validateDemand({ ...good, deadline: "2026-10-01" }, TODAY).deadline).toBeTruthy();
    expect(validateDemand({ ...good, deadline: "2026-10-02" }, TODAY)).toEqual({});
    expect(validateDemand({ ...good, deadline: "2026-12-01" }, TODAY)).toEqual({});
  });
  it("rejects an unknown unit", () => expect(validateDemand({ ...good, unit: "bucket" }, TODAY).unit).toBeTruthy());
});

describe("validatePledge", () => {
  const open = { status: "open" };
  it("accepts a positive amount", () => expect(validatePledge({ quantity: "40" }, open)).toEqual({}));
  it("rejects zero, negative, empty", () => {
    for (const q of ["0", "-1", "", "x"]) expect(validatePledge({ quantity: q }, open).quantity).toBeTruthy();
  });
  it("refuses pledges to a fulfilled request", () =>
    expect(validatePledge({ quantity: "5" }, { status: "fulfilled" }).demand).toBeTruthy());
});

describe("summarizePledges", () => {
  const demand = { quantityNeeded: 100 };
  const pledges = [
    { farmerId: "a", quantity: 30 },
    { farmerId: "b", quantity: "20" }, // stored as a string by older data
    { farmerId: "a", quantity: 10 },
  ];
  it("totals, remaining, percent and my pledges", () => {
    const s = summarizePledges(demand, pledges, "a");
    expect(s).toMatchObject({ pledged: 60, remaining: 40, percent: 60, covered: false, count: 3 });
    expect(s.mine).toHaveLength(2);
  });
  it("caps at 100% when over-pledged and flags it covered", () => {
    const s = summarizePledges(demand, [{ farmerId: "a", quantity: 150 }], "z");
    expect(s).toMatchObject({ percent: 100, remaining: 0, covered: true });
  });
  it("survives no pledges and a bad quantity", () => {
    expect(summarizePledges(demand, undefined, "a")).toMatchObject({ pledged: 0, percent: 0, count: 0 });
    expect(summarizePledges({ quantityNeeded: 0 }, [], "a").percent).toBe(0);
  });
});

describe("deadlineState", () => {
  it("classifies deadlines", () => {
    expect(deadlineState({ deadline: "2026-10-01" }, TODAY)).toBe("overdue");
    expect(deadlineState({ deadline: "2026-10-02" }, TODAY)).toBe("soon");
    expect(deadlineState({ deadline: "2026-10-05" }, TODAY)).toBe("soon");
    expect(deadlineState({ deadline: "2026-10-06" }, TODAY)).toBe("later");
  });
  it("ignores missing deadlines and fulfilled requests", () => {
    expect(deadlineState({}, TODAY)).toBeNull();
    expect(deadlineState({ deadline: "2026-01-01", status: "fulfilled" }, TODAY)).toBeNull();
  });
});

describe("filters", () => {
  const demands = [
    { id: "1", status: "open", buyerId: "me" },
    { id: "2", status: "fulfilled", buyerId: "me" },
    { id: "3", status: "open", buyerId: "other" },
    { id: "4" }, // older documents may have no status: treat as open
  ];
  it("splits open, fulfilled and mine", () => {
    expect(filterDemands(demands, "open", "me").map((d) => d.id)).toEqual(["1", "3", "4"]);
    expect(filterDemands(demands, "fulfilled", "me").map((d) => d.id)).toEqual(["2"]);
    expect(filterDemands(demands, "mine", "me").map((d) => d.id)).toEqual(["1", "2"]);
  });
  it("counts for the tabs", () => expect(countByFilter(demands, "me")).toEqual({ open: 3, fulfilled: 1, mine: 2 }));
  it("formats today", () => expect(isoToday(new Date(2026, 9, 2))).toBe("2026-10-02"));
});
