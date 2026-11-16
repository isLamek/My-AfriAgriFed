const rules = require("./rules");

const OSHAKATI = { lat: -17.788, lng: 15.699 };
const ONGWEDIVA = { lat: -17.785, lng: 15.767 };
const WINDHOEK = { lat: -22.57, lng: 17.083 };

describe("distance and time", () => {
  it("measures a short hop and a long haul sensibly", () => {
    expect(rules.haversineKm(OSHAKATI, ONGWEDIVA)).toBeGreaterThan(6.5);
    expect(rules.haversineKm(OSHAKATI, ONGWEDIVA)).toBeLessThan(8);
    expect(rules.roadKm(OSHAKATI, WINDHOEK)).toBeGreaterThan(650);
    expect(rules.roadKm(OSHAKATI, WINDHOEK)).toBeLessThan(750);
    expect(rules.roadKm(OSHAKATI, OSHAKATI)).toBe(0);
  });

  it("adds handling time to the drive", () => {
    expect(rules.etaMinutes(0)).toBe(30);
    expect(rules.etaMinutes(55)).toBe(90);
  });
});

describe("vehicles", () => {
  it("weighs an order from its units", () => {
    expect(rules.orderWeightKg([{ unit: "kg", quantity: 10 }, { unit: "tray", quantity: 2 }])).toBe(22);
    expect(rules.orderWeightKg([{ unit: "mystery", quantity: 3 }])).toBe(3);
    expect(rules.orderWeightKg([])).toBe(0);
  });

  it("picks the smallest vehicle that fits, and none when too big", () => {
    expect(rules.vehicleFor(20).id).toBe("small");
    expect(rules.vehicleFor(300).id).toBe("bakkie");
    expect(rules.vehicleFor(2000).id).toBe("truck");
    expect(rules.vehicleFor(9000)).toBeNull();
  });

  it("lets a bigger vehicle take a smaller job but never the reverse", () => {
    expect(rules.vehicleFits("truck", "small")).toBe(true);
    expect(rules.vehicleFits("bakkie", "bakkie")).toBe(true);
    expect(rules.vehicleFits("small", "bakkie")).toBe(false);
    expect(rules.vehicleFits("nonsense", "small")).toBe(false);
  });
});

describe("fees", () => {
  it("never charges less than the minimum and rounds up to a whole dollar", () => {
    expect(rules.platformFee(1, "bakkie")).toBe(60);
    expect(rules.platformFee(10.3, "bakkie")).toBe(118); // 35 + 82.4 = 117.4
    expect(rules.platformFee(100, "truck")).toBe(Math.ceil((35 + 800) * 1.9));
  });

  it("pays the carrier their share", () => {
    expect(rules.carrierPay(100)).toBe(85);
  });

  it("works out a seller's own fee from their settings", () => {
    expect(rules.sellerFee(10, { baseFee: 20, perKm: 5 })).toBe(70);
    expect(rules.sellerFee(0, { baseFee: 0, perKm: 0 })).toBe(0);
    expect(rules.sellerFee(3.2, { baseFee: 10, perKm: 2.5 })).toBe(18);
  });
});

describe("a seller's delivery settings", () => {
  it("keeps good settings and tidies the numbers", () => {
    expect(rules.cleanDelivery({ collect: true, platform: true, own: { enabled: true, baseFee: "20", perKm: 5.555, maxKm: "40.4" } })).toEqual({
      collect: true,
      platform: true,
      own: { enabled: true, baseFee: 20, perKm: 5.56, maxKm: 40 },
    });
  });

  it("refuses nonsense and settings that leave the buyer no way to get the goods", () => {
    expect(rules.cleanDelivery({ collect: true, own: { enabled: true, baseFee: -1, perKm: 1, maxKm: 10 } })).toBeNull();
    expect(rules.cleanDelivery({ collect: true, own: { enabled: true, baseFee: 1, perKm: 999, maxKm: 10 } })).toBeNull();
    expect(rules.cleanDelivery({ collect: true, own: { enabled: true, baseFee: 1, perKm: 1, maxKm: 0 } })).toBeNull();
    expect(rules.cleanDelivery({ collect: false, platform: false })).toBeNull();
    expect(rules.cleanDelivery("yes")).toBeNull();
    expect(rules.cleanDelivery(undefined)).toBeNull();
  });

  it("treats a listing with no settings as collection only", () => {
    expect(rules.deliveryOf({})).toEqual({ collect: true, platform: false, own: null });
    expect(rules.deliveryOf({ delivery: { collect: false, platform: false } })).toEqual({ collect: true, platform: false, own: null });
  });
});

describe("the drop-off address", () => {
  const good = { lat: -17.79, lng: 15.7, label: "Near Oshakati", landmark: "Blue gate behind the Engen garage", contactName: "Bea", contactPhone: "+264 81 123 4567" }; // a phone sent by an older app is ignored

  it("accepts a pin with a description, keeps no phone number, and tidies it", () => {
    const r = rules.cleanAddress(good);
    expect(r.ok).toBe(true);
    expect(r.address.contactPhone).toBeUndefined();
    expect(JSON.stringify(r.address)).not.toContain("264");
    expect(r.address.landmark).toBe("Blue gate behind the Engen garage");
  });

  it("says what is missing", () => {
    expect(rules.cleanAddress({ ...good, lat: 10 }).problem).toBe("pin");
    expect(rules.cleanAddress({ ...good, lat: "x" }).problem).toBe("pin");
    expect(rules.cleanAddress({ ...good, landmark: "  " }).problem).toBe("landmark");
    expect(rules.cleanAddress({ ...good, contactPhone: "" }).ok).toBe(true); // no phone is asked for any more
    expect(rules.cleanAddress({ ...good, contactName: "" }).problem).toBe("name");
    expect(rules.cleanAddress(null).problem).toBe("pin");
  });

  it("refuses a way to talk or pay outside the app hidden in the words", () => {
    for (const landmark of ["Gate 3, call 081 123 4567", "mail bea at gmail dot com", "whatsapp me please", "zero eight one one two three four", "see www.example.com"]) {
      expect(rules.cleanAddress({ ...good, landmark }).problem).toBe("contact");
    }
    expect(rules.cleanAddress({ ...good, contactName: "Bea 0811234567" }).problem).toBe("contact");
    expect(rules.cleanAddress({ ...good, landmark: "Erf 4521, house 12, 2026-10-07 10:00" }).ok).toBe(true);
    expect(rules.hasContactDetails("")).toBe(false);
    expect(rules.hasContactDetails(undefined)).toBe(false);
  });

  it("blurs a pin to about a kilometre for people who have not taken the job yet", () => {
    expect(rules.roughPlace({ lat: -17.78812, lng: 15.69949 })).toEqual({ lat: -17.79, lng: 15.7 });
  });
});

describe("the handover code", () => {
  it("is six digits, with leading zeros kept", () => {
    expect(rules.newHandoverCode(() => 42)).toBe("000042");
    expect(rules.newHandoverCode(() => 999999)).toBe("999999");
  });

  it("ignores spaces and dashes when it is typed in", () => {
    expect(rules.normaliseCode(" 123-456 ")).toBe("123456");
  });
});

describe("quoting a whole order", () => {
  const items = [{ unit: "kg", quantity: 50 }];
  const everything = { collect: true, platform: true, own: { enabled: true, baseFee: 20, perKm: 5, maxKm: 30 } };
  const near = { ...ONGWEDIVA };
  const byMethod = (list) => Object.fromEntries(list.map((x) => [x.method, x]));

  it("offers all three ways when the seller allows them", () => {
    const q = byMethod(rules.quoteAll({ listings: [{ delivery: everything }], items, pickup: OSHAKATI, dropoff: near }));
    expect(q.collect).toMatchObject({ ok: true, fee: 0 });
    expect(q.seller.ok).toBe(true);
    expect(q.seller.fee).toBe(rules.sellerFee(q.seller.km, { baseFee: 20, perKm: 5 }));
    expect(q.platform).toMatchObject({ ok: true, vehicle: "bakkie" });
    expect(q.platform.fee).toBe(rules.platformFee(q.platform.km, "bakkie"));
  });

  it("refuses own delivery beyond the seller's limit, with the reason", () => {
    const q = byMethod(rules.quoteAll({ listings: [{ delivery: everything }], items, pickup: OSHAKATI, dropoff: WINDHOEK }));
    expect(q.seller).toMatchObject({ ok: false, reason: "too_far", maxKm: 30 });
    expect(q.platform.ok).toBe(true);
  });

  it("only offers what every item in the basket allows", () => {
    const q = byMethod(rules.quoteAll({ listings: [{ delivery: everything }, { delivery: { collect: true, platform: false } }], items, pickup: OSHAKATI, dropoff: near }));
    expect(q.platform).toMatchObject({ ok: false, reason: "not_offered" });
    expect(q.seller).toMatchObject({ ok: false, reason: "not_offered" });
    expect(q.collect.ok).toBe(true);
  });

  it("uses the strictest own-delivery settings when items share a trip", () => {
    const a = { collect: true, own: { enabled: true, baseFee: 10, perKm: 2, maxKm: 100 } };
    const b = { collect: true, own: { enabled: true, baseFee: 30, perKm: 1, maxKm: 20 } };
    const q = byMethod(rules.quoteAll({ listings: [{ delivery: a }, { delivery: b }], items, pickup: OSHAKATI, dropoff: near })).seller;
    expect(q.fee).toBe(rules.sellerFee(q.km, { baseFee: 30, perKm: 2 }));
  });

  it("explains why platform delivery is not possible for a load that is too heavy", () => {
    const q = byMethod(rules.quoteAll({ listings: [{ delivery: everything }], items: [{ unit: "kg", quantity: 9000 }], pickup: OSHAKATI, dropoff: near })).platform;
    expect(q).toMatchObject({ ok: false, reason: "too_heavy" });
  });

  it("asks for an address before quoting a delivery", () => {
    const q = byMethod(rules.quoteAll({ listings: [{ delivery: everything }], items, pickup: OSHAKATI, dropoff: null }));
    expect(q.platform).toMatchObject({ ok: false, reason: "no_address" });
  });

  it("cannot quote a delivery for a listing with no pin", () => {
    const q = byMethod(rules.quoteAll({ listings: [{ delivery: everything }], items, pickup: null, dropoff: near }));
    expect(q.platform).toMatchObject({ ok: false, reason: "no_pickup" });
  });
});
