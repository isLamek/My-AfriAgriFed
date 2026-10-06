import { countByRegion, filterListings, REGIONS, validateListing } from "./listingRules";

const good = {
  product: " Tomatoes ",
  description: "Firm, picked this week.",
  category: "vegetables",
  price: "18.5",
  unit: "kg",
  quantity: "40",
  region: "Oshana",
  fulfilment: "both",
  deliveryNote: "Delivery within Ongwediva",
};

describe("validateListing", () => {
  it("accepts a complete listing and cleans it", () => {
    const result = validateListing(good);
    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({ product: "Tomatoes", price: 18.5, quantity: 40, region: "Oshana", fulfilment: "both" });
  });

  it("needs a region and a way to get the goods, so buyers know before they pay", () => {
    const result = validateListing({ ...good, region: "", fulfilment: "" });
    expect(result.ok).toBe(false);
    expect(result.errors.region).toBeTruthy();
    expect(result.errors.fulfilment).toBeTruthy();
  });

  it("refuses a zero or missing price", () => {
    expect(validateListing({ ...good, price: "0" }).errors.price).toBeTruthy();
    expect(validateListing({ ...good, price: "" }).errors.price).toBeTruthy();
  });

  it("treats an empty quantity as no limit, and refuses negative stock", () => {
    expect(validateListing({ ...good, quantity: "" }).value.quantity).toBeNull();
    expect(validateListing({ ...good, quantity: "-3" }).errors.quantity).toBeTruthy();
  });

  it("files unknown categories under Other", () => {
    expect(validateListing({ ...good, category: "spaceships" }).value.category).toBe("other");
  });
});

describe("filterListings", () => {
  const listings = [
    { id: "a", product: "Tomatoes", category: "vegetables", region: "Oshana", quantity: 0 },
    { id: "b", product: "Goats", category: "livestock", region: "Kunene", quantity: 4, sellerName: "Kaoko Farm" },
    { id: "c", product: "Cherry tomatoes", category: "vegetables", region: "Khomas", quantity: null },
  ];

  it("searches product and seller names", () => {
    expect(filterListings(listings, { search: "tomato" }).map((l) => l.id)).toEqual(["c", "a"]);
    expect(filterListings(listings, { search: "kaoko" }).map((l) => l.id)).toEqual(["b"]);
  });

  it("filters by category and region, and puts sold-out listings last", () => {
    expect(filterListings(listings, { category: "vegetables" }).map((l) => l.id)).toEqual(["c", "a"]);
    expect(filterListings(listings, { region: "Kunene" }).map((l) => l.id)).toEqual(["b"]);
  });
});

describe("countByRegion", () => {
  it("counts only listings that can be bought now", () => {
    expect(countByRegion([{ region: "Oshana", quantity: 0 }, { region: "Oshana", quantity: 2 }, { region: "Erongo" }, {}])).toEqual({
      Oshana: 1,
      Erongo: 1,
    });
  });

  it("knows all 14 regions", () => {
    expect(REGIONS).toHaveLength(14);
  });
});
