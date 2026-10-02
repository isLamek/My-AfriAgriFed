import {
  ACTION_LABELS,
  allowedNext,
  buildHistoryEntry,
  buildTimeline,
  canTransition,
  isActive,
  normaliseStatus,
  rolesFor,
  timeReached,
} from "./orderStatus";

const order = (status, extra = {}) => ({ id: "o1", buyerId: "buyer1", sellerId: "seller1", status, ...extra });

describe("rolesFor", () => {
  it("identifies buyer, seller, both, and strangers", () => {
    expect(rolesFor(order("paid"), "buyer1")).toEqual(["buyer"]);
    expect(rolesFor(order("paid"), "seller1")).toEqual(["seller"]);
    expect(rolesFor({ buyerId: "x", sellerId: "x" }, "x")).toEqual(["seller", "buyer"]);
    expect(rolesFor(order("paid"), "stranger")).toEqual([]);
    expect(rolesFor(order("paid"), undefined)).toEqual([]);
  });
});

describe("transitions", () => {
  it("lets the seller advance one step at a time up to in_transit", () => {
    expect(allowedNext(order("paid"), "seller1")).toEqual(["confirmed"]);
    expect(allowedNext(order("confirmed"), "seller1")).toEqual(["dispatched"]);
    expect(allowedNext(order("dispatched"), "seller1")).toEqual(["in_transit"]);
    expect(allowedNext(order("in_transit"), "seller1")).toEqual([]);
  });

  it("only the buyer can confirm delivery", () => {
    expect(allowedNext(order("in_transit"), "buyer1")).toEqual(["delivered"]);
    expect(allowedNext(order("dispatched"), "buyer1")).toEqual(["delivered"]);
    expect(canTransition("in_transit", "delivered", "seller")).toBe(false);
  });

  it("does not let the buyer confirm delivery before dispatch", () => {
    expect(allowedNext(order("paid"), "buyer1")).toEqual([]);
    expect(allowedNext(order("confirmed"), "buyer1")).toEqual([]);
  });

  it("does not let the seller skip steps or go backwards", () => {
    expect(canTransition("paid", "dispatched", "seller")).toBe(false);
    expect(canTransition("dispatched", "confirmed", "seller")).toBe(false);
    expect(canTransition("paid", "delivered", "seller")).toBe(false);
  });

  it("offers nothing to strangers or on finished orders", () => {
    expect(allowedNext(order("paid"), "stranger")).toEqual([]);
    expect(allowedNext(order("delivered"), "seller1")).toEqual([]);
    expect(allowedNext(order("delivered"), "buyer1")).toEqual([]);
    expect(allowedNext(order("cancelled"), "seller1")).toEqual([]);
  });

  it("every status a user can move to has a button label", () => {
    for (const status of ["confirmed", "dispatched", "in_transit", "delivered"]) {
      expect(ACTION_LABELS[status]).toBeTruthy();
    }
  });
});

describe("legacy and unknown data", () => {
  it("treats unknown or missing status as paid", () => {
    expect(normaliseStatus(undefined)).toBe("paid");
    expect(normaliseStatus("pending-review")).toBe("paid");
    expect(normaliseStatus("cancelled")).toBe("cancelled");
  });

  it("a legacy 'paid' order with no history can still be confirmed", () => {
    expect(allowedNext({ buyerId: "b", sellerId: "s", status: "paid" }, "s")).toEqual(["confirmed"]);
  });
});

describe("history and timeline", () => {
  it("builds a trimmed, bounded history entry and omits empty notes", () => {
    expect(buildHistoryEntry({ status: "confirmed", by: "u", note: "   ", at: 5 })).toEqual({ status: "confirmed", by: "u", at: 5 });
    const long = buildHistoryEntry({ status: "dispatched", by: "u", note: " x".repeat(300), at: 5 });
    expect(long.note.length).toBeLessThanOrEqual(280);
    expect(long.note.startsWith("x")).toBe(true);
  });

  it("marks steps done / current / upcoming and carries times", () => {
    const o = order("dispatched", {
      statusHistory: [
        { status: "paid", at: 1000 },
        { status: "confirmed", at: 2000 },
        { status: "dispatched", at: 3000 },
      ],
    });
    const t = buildTimeline(o);
    expect(t.map((s) => s.state)).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
    expect(t.map((s) => s.at)).toEqual([1000, 2000, 3000, null, null]);
  });

  it("falls back to createdAt for the paid time on legacy orders", () => {
    const o = order("paid", { createdAt: { toDate: () => new Date(7777) } });
    expect(timeReached(o, "paid")).toBe(7777);
    expect(timeReached(o, "confirmed")).toBeNull();
  });

  it("uses the latest entry if a status somehow appears twice", () => {
    const o = order("confirmed", { statusHistory: [{ status: "confirmed", at: 1 }, { status: "confirmed", at: 9 }] });
    expect(timeReached(o, "confirmed")).toBe(9);
  });

  it("cancelled orders have no stepper and are not active", () => {
    expect(buildTimeline(order("cancelled"))).toEqual([]);
    expect(isActive(order("cancelled"))).toBe(false);
    expect(isActive(order("delivered"))).toBe(false);
    expect(isActive(order("in_transit"))).toBe(true);
  });
});
