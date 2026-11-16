import { actionLabel, allowedNext, buildTimeline, isActive, lastRealStatus, methodOf, needsAction, normaliseStatus, serverActions, stepLabel, waitingOn } from "./orderStatus";

const order = (status, extra = {}) => ({ id: "o1", buyerId: "buyer1", sellerId: "seller1", status, statusHistory: [], ...extra });
const withMethod = (method, extra = {}) => ({ fulfilment: { method }, ...extra });

describe("how an order reaches the buyer", () => {
  it("reads the method, and treats an older order as the seller delivering", () => {
    expect(methodOf(order("paid", withMethod("collect")))).toBe("collect");
    expect(methodOf(order("paid", withMethod("platform")))).toBe("platform");
    expect(methodOf(order("paid", withMethod("seller")))).toBe("seller");
    expect(methodOf(order("paid"))).toBe("seller");
    expect(methodOf(order("paid", withMethod("drone")))).toBe("seller");
    expect(methodOf(undefined)).toBe("seller");
  });

  it("lets the seller start the trip only when they are the one delivering", () => {
    expect(allowedNext(order("dispatched", withMethod("seller")), "seller1")).toEqual(["in_transit"]);
    expect(allowedNext(order("dispatched"), "seller1")).toEqual(["in_transit"]); // an older order
    expect(allowedNext(order("dispatched", withMethod("platform")), "seller1")).toEqual([]); // the carrier does it
    expect(allowedNext(order("dispatched", withMethod("collect")), "seller1")).toEqual([]); // the buyer collects
  });

  it("lets the seller accept and mark ready whatever the method", () => {
    for (const method of ["collect", "seller", "platform"]) {
      expect(allowedNext(order("paid", withMethod(method)), "seller1")).toEqual(["confirmed"]);
      expect(allowedNext(order("confirmed", withMethod(method)), "seller1")).toEqual(["dispatched"]);
    }
  });

  it("names the steps for the way the order travels", () => {
    expect(stepLabel(order("paid", withMethod("collect")), "dispatched")).toBe("Ready for collection");
    expect(stepLabel(order("paid", withMethod("platform")), "dispatched")).toBe("Ready for the carrier");
    expect(stepLabel(order("paid", withMethod("platform")), "in_transit")).toBe("With the carrier");
    expect(stepLabel(order("paid", withMethod("seller")), "dispatched")).toBe("Dispatched");
    expect(actionLabel(order("paid", withMethod("collect")), "dispatched")).toBe("Ready for collection");
    expect(actionLabel(order("paid", withMethod("seller")), "dispatched")).toBe("Mark as dispatched");
  });

  it("leaves out the 'in transit' step when nobody travels", () => {
    expect(buildTimeline(order("dispatched", withMethod("collect"))).map((s) => s.id)).toEqual(["paid", "confirmed", "dispatched", "delivered"]);
    expect(buildTimeline(order("dispatched", withMethod("seller"))).map((s) => s.id)).toEqual(["paid", "confirmed", "dispatched", "in_transit", "delivered"]);
  });

  it("says who it is waiting for in the right words for the method", () => {
    expect(waitingOn(order("dispatched", withMethod("collect")))).toMatch(/collect/i);
    expect(waitingOn(order("dispatched", withMethod("platform")))).toMatch(/carrier/i);
    expect(waitingOn(order("confirmed", withMethod("platform")))).toMatch(/carrier/i);
    expect(waitingOn(order("disputed"))).toMatch(/problem/i);
  });
});

describe("a problem reported on an order", () => {
  const disputed = order("disputed", {
    statusHistory: [
      { status: "paid", at: 1 },
      { status: "confirmed", at: 2 },
      { status: "dispatched", at: 3 },
      { status: "in_transit", at: 4 },
      { status: "disputed", at: 5 },
    ],
  });

  it("is a known status, still open, and offers nobody a move", () => {
    expect(normaliseStatus("disputed")).toBe("disputed");
    expect(isActive(disputed)).toBe(true);
    expect(allowedNext(disputed, "seller1")).toEqual([]);
    expect(allowedNext(disputed, "buyer1")).toEqual([]);
  });

  it("keeps the stepper where the order had got to", () => {
    expect(lastRealStatus(disputed)).toBe("in_transit");
    expect(buildTimeline(disputed).map((s) => s.state)).toEqual(["done", "done", "done", "current", "upcoming"]);
  });
});

describe("what each person can ask the server to do", () => {
  const now = 1_000_000;

  it("lets the buyer cancel a new order, confirm what arrived, and report a problem", () => {
    expect(serverActions(order("paid"), "buyer1", now)).toEqual(["cancel"]);
    expect(serverActions(order("confirmed"), "buyer1", now)).toEqual([]);
    expect(serverActions(order("dispatched", withMethod("seller")), "buyer1", now).sort()).toEqual(["confirm", "dispute"]);
    expect(serverActions(order("in_transit", withMethod("platform")), "buyer1", now).sort()).toEqual(["confirm", "dispute"]);
  });

  it("keeps 'report a problem' open after delivery only while the objection window is", () => {
    expect(serverActions(order("delivered", { releaseAt: now + 1000 }), "buyer1", now)).toEqual(["dispute"]);
    expect(serverActions(order("delivered", { releaseAt: now - 1 }), "buyer1", now)).toEqual([]);
    expect(serverActions(order("delivered", { releaseAt: now + 1000, releasedAt: now - 5 }), "buyer1", now)).toEqual([]);
    expect(serverActions(order("delivered"), "buyer1", now)).toEqual([]); // an older order: nothing to object to
  });

  it("lets the seller decline before dispatch, ask for a carrier once, and finish a handover", () => {
    expect(serverActions(order("paid"), "seller1", now)).toEqual(["decline"]);
    expect(serverActions(order("confirmed", withMethod("platform")), "seller1", now).sort()).toEqual(["decline", "requestCarrier"]);
    expect(serverActions(order("confirmed", { fulfilment: { method: "platform", carrierRequestedAt: 5 } }), "seller1", now)).toEqual(["decline"]);
    expect(serverActions(order("dispatched", withMethod("collect")), "seller1", now)).toEqual(["handover"]);
    expect(serverActions(order("in_transit", withMethod("seller")), "seller1", now)).toEqual(["handover"]);
    expect(serverActions(order("in_transit", withMethod("platform")), "seller1", now)).toEqual([]); // the carrier hands it over
  });

  it("offers nothing to strangers or on finished orders", () => {
    expect(serverActions(order("paid"), "nobody", now)).toEqual([]);
    expect(serverActions(order("cancelled"), "seller1", now)).toEqual([]);
    expect(serverActions(order("cancelled"), "buyer1", now)).toEqual([]);
  });
});

describe("what is waiting on someone", () => {
  it("counts an order the seller must move, one that needs a carrier, and a driver at the buyer's door", () => {
    expect(needsAction(order("paid"), "seller1")).toBe(true);
    expect(needsAction(order("confirmed", withMethod("platform")), "seller1")).toBe(true);
    expect(needsAction(order("in_transit", { fulfilment: { method: "platform", arrivedAt: 5 } }), "buyer1")).toBe(true);
  });

  it("does not count orders that are simply on their way", () => {
    expect(needsAction(order("in_transit", withMethod("platform")), "buyer1")).toBe(false);
    expect(needsAction(order("in_transit", { fulfilment: { method: "platform", carrierRequestedAt: 1 } }), "seller1")).toBe(false);
    expect(needsAction(order("paid"), "buyer1")).toBe(false);
  });
});
