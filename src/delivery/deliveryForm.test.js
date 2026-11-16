import { defaultDelivery, fromListing, lastDelivery, rememberDelivery, toDoc } from "./deliveryForm";

describe("a seller's delivery settings form", () => {
  it("starts with collection only", () => {
    expect(defaultDelivery()).toMatchObject({ collect: true, platform: false, ownEnabled: false });
  });

  it("makes the document to save from what was typed", () => {
    const state = { collect: true, platform: true, ownEnabled: true, baseFee: "25", perKm: "6", maxKm: "60" };
    expect(toDoc(state, { hasPin: true })).toEqual({ doc: { collect: true, platform: true, own: { enabled: true, baseFee: 25, perKm: 6, maxKm: 60 } } });
  });

  it("leaves the own-delivery numbers out when it is switched off", () => {
    expect(toDoc({ ...defaultDelivery(), ownEnabled: false, baseFee: "abc" }, { hasPin: false })).toEqual({ doc: { collect: true, platform: false, own: null } });
  });

  it("explains what is wrong", () => {
    expect(toDoc({ collect: false, platform: false, ownEnabled: false }, { hasPin: true }).problem).toBe("none");
    expect(toDoc({ ...defaultDelivery(), ownEnabled: true, baseFee: "-5" }, { hasPin: true }).problem).toBe("fees");
    expect(toDoc({ ...defaultDelivery(), ownEnabled: true, maxKm: "" }, { hasPin: true }).problem).toBe("fees");
    expect(toDoc({ ...defaultDelivery(), platform: true }, { hasPin: false }).problem).toBe("pin");
  });

  it("does not need a pin when buyers can only collect", () => {
    expect(toDoc(defaultDelivery(), { hasPin: false }).doc).toBeTruthy();
  });

  it("reads a saved listing back into the form, and an old listing as collect only", () => {
    const listing = { delivery: { collect: false, platform: true, own: { enabled: true, baseFee: 10, perKm: 3, maxKm: 40 } } };
    expect(fromListing(listing)).toEqual({ collect: false, platform: true, ownEnabled: true, baseFee: "10", perKm: "3", maxKm: "40" });
    expect(fromListing({})).toMatchObject({ collect: true, platform: false, ownEnabled: false });
  });

  it("remembers the last settings for the next listing", () => {
    rememberDelivery({ ...defaultDelivery(), platform: true });
    expect(lastDelivery().platform).toBe(true);
    localStorage.setItem("aaf_last_delivery_settings", "not json");
    expect(lastDelivery()).toEqual(defaultDelivery());
  });
});
