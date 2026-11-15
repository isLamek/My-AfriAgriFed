import React from "react";
import { render } from "@testing-library/react";
import { t, setLanguage, getLanguage, subscribe, hasKey, formatNumber, formatDate, STORAGE_KEY } from "./core";
import { tRich } from "./rich";
import { LANGUAGES } from "./languages";
import { CATALOGS } from "./locales";

// A fake language, so these tests never depend on a real translation.
const FAKE = {
  code: "xx",
  name: "Test",
  native: "Testish",
  locale: "en-NA",
  status: "beta",
  // like Russian-ish: 1 -> one, everything else other (kept simple, the point is it differs from English for 0)
  plural: (n) => (n === 0 || n === 1 ? "one" : "other"),
};

beforeAll(() => {
  LANGUAGES.push(FAKE);
  CATALOGS.xx = {
    "test.hello": "Hallo wêreld",
    "test.greet": "Dag {name}, jy het {n} boodskappe",
    "test.items_one": "{count} ding",
    "test.items_other": "{count} goed",
    "test.link": "Ek stem in met die {terms} en die {privacy}.",
  };
  CATALOGS.en["test.hello"] = "Hello world";
  CATALOGS.en["test.greet"] = "Hi {name}, you have {n} messages";
  CATALOGS.en["test.items_one"] = "{count} thing";
  CATALOGS.en["test.items_other"] = "{count} things";
  CATALOGS.en["test.link"] = "I agree to the {terms} and the {privacy}.";
  CATALOGS.en["test.onlyEnglish"] = "Only in English";
});

afterAll(() => {
  LANGUAGES.pop();
  delete CATALOGS.xx;
  Object.keys(CATALOGS.en)
    .filter((k) => k.startsWith("test."))
    .forEach((k) => delete CATALOGS.en[k]);
  setLanguage("en");
});

beforeEach(() => {
  localStorage.clear();
  setLanguage("en");
});

describe("t()", () => {
  it("returns the text in the current language", () => {
    expect(t("test.hello")).toBe("Hello world");
    setLanguage("xx");
    expect(t("test.hello")).toBe("Hallo wêreld");
  });

  it("falls back to English for a key the language lacks", () => {
    setLanguage("xx");
    expect(t("test.onlyEnglish")).toBe("Only in English");
  });

  it("shows the key itself, not a blank, when no language has it", () => {
    expect(t("test.nope")).toBe("test.nope");
    setLanguage("xx");
    expect(t("test.nope")).toBe("test.nope");
  });

  it("fills {placeholders}", () => {
    expect(t("test.greet", { name: "Ndapewa", n: 3 })).toBe("Hi Ndapewa, you have 3 messages");
    setLanguage("xx");
    expect(t("test.greet", { name: "Ndapewa", n: 0 })).toBe("Dag Ndapewa, jy het 0 boodskappe");
  });

  it("leaves a placeholder visible when its value is not given (so a bug is noticed)", () => {
    expect(t("test.greet", { name: "Bea" })).toBe("Hi Bea, you have {n} messages");
  });

  it("does not treat the text as a pattern (a $ or ( in a value is safe)", () => {
    expect(t("test.greet", { name: "$& (x)", n: "$1" })).toBe("Hi $& (x), you have $1 messages");
  });

  it("picks the plural form by the language's own rule", () => {
    expect(t("test.items", { count: 1 })).toBe("1 thing");
    expect(t("test.items", { count: 2 })).toBe("2 things");
    expect(t("test.items", { count: 0 })).toBe("0 things"); // English: 0 is plural
    setLanguage("xx");
    expect(t("test.items", { count: 0 })).toBe("0 ding"); // this language: 0 is singular
    expect(t("test.items", { count: 5 })).toBe("5 goed");
  });
});

describe("choosing a language", () => {
  it("remembers the choice and sets <html lang>", () => {
    setLanguage("xx");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("xx");
    expect(document.documentElement.lang).toBe("xx");
    expect(getLanguage()).toBe("xx");
  });

  it("ignores a language the site does not have", () => {
    localStorage.removeItem(STORAGE_KEY);
    setLanguage("zz");
    expect(getLanguage()).toBe("en");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // nothing was saved
  });

  it("tells subscribers once per change", () => {
    const seen = [];
    const off = subscribe((c) => seen.push(c));
    setLanguage("xx");
    setLanguage("xx"); // no change, no call
    setLanguage("en");
    off();
    setLanguage("xx");
    expect(seen).toEqual(["xx", "en"]);
  });

  it("hasKey tells which languages have a key", () => {
    expect(hasKey("en", "test.hello")).toBe(true);
    expect(hasKey("xx", "test.onlyEnglish")).toBe(false);
    expect(hasKey("zz", "test.hello")).toBe(false);
  });
});

describe("tRich()", () => {
  it("puts elements where the placeholders are, in the language's own word order", () => {
    const terms = <a href="/terms">Terms</a>;
    const privacy = <a href="/privacy">Privacy</a>;
    const { container, rerender } = render(<p>{tRich("test.link", { terms, privacy })}</p>);
    expect(container.textContent).toBe("I agree to the Terms and the Privacy.");
    expect(container.querySelectorAll("a")).toHaveLength(2);
    setLanguage("xx");
    rerender(<p>{tRich("test.link", { terms, privacy })}</p>);
    expect(container.textContent).toBe("Ek stem in met die Terms en die Privacy.");
  });
});

describe("numbers and dates", () => {
  it("formats in the language's locale", () => {
    expect(formatNumber(1234.5)).toMatch(/1[,\s ]234[.,]5/);
    expect(formatDate("2026-10-07T12:00:00Z", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" })).toContain("2026");
  });

  it("returns empty text for a date that is not a date", () => {
    expect(formatDate("not a date")).toBe("");
  });
});
