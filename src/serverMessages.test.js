import { serverMessage } from "./serverMessages";
import { setLanguage } from "./i18n";

afterEach(() => setLanguage("en"));

describe("serverMessage", () => {
  it("says a known error in the reader's language", () => {
    expect(serverMessage({ error: "sold_out", message: "This listing is sold out." })).toBe("This listing is sold out.");
    setLanguage("af");
    expect(serverMessage({ error: "sold_out", message: "This listing is sold out." })).toBe("Hierdie advertensie is uitverkoop.");
  });

  it("puts the server's values into the text", () => {
    setLanguage("af");
    expect(serverMessage({ error: "bad_quantity", message: "x", params: { max: 1000 } })).toContain("1000");
    expect(serverMessage({ error: "seller_not_ready", message: "x", params: { name: "Sam" } })).toContain("Sam");
  });

  it("uses the plural form for a count", () => {
    expect(serverMessage({ error: "not_enough_stock", message: "x", params: { count: 1 } })).toBe("Only 1 is available.");
    expect(serverMessage({ error: "not_enough_stock", message: "x", params: { count: 10 } })).toBe("Only 10 are available.");
  });

  it("has a wording for a seller without a name", () => {
    expect(serverMessage({ error: "seller_not_ready", message: "x" })).toBe("This seller hasn't set up payouts yet. Please contact them directly.");
  });

  it("falls back to the server's own message for a code it does not know, then to the default", () => {
    expect(serverMessage({ error: "something_new", message: "Brand new problem." })).toBe("Brand new problem.");
    expect(serverMessage({}, "default text")).toBe("default text");
    expect(serverMessage(null, "default text")).toBe("default text");
  });
});
