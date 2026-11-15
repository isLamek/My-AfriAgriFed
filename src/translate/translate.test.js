import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { detectLanguage } from "./detect";
import { TranslateError, browserTranslate, chunkText, myMemoryTranslate } from "./providers";
import { canTranslate, clearTranslationMemory } from "./index";
import TranslatableText from "./TranslatableText";
import { setLanguage } from "../i18n";

jest.mock("./index", () => ({
  ...jest.requireActual("./index"),
  translateText: jest.fn(),
}));
const mockedTranslate = require("./index").translateText;
const actual = jest.requireActual("./index");

afterEach(() => {
  setLanguage("en");
  clearTranslationMemory();
  mockedTranslate.mockReset();
});

describe("detectLanguage", () => {
  it("recognises English", () => {
    expect(detectLanguage("Fresh tomatoes are available from my farm this week, and we can deliver to the school")).toBe("en");
  });

  it("recognises Afrikaans", () => {
    expect(detectLanguage("Ek het vars tamaties beskikbaar van my plaas hierdie week, en ons kan by die skool aflewer")).toBe("af");
    expect(detectLanguage("Dit is 'n goeie prys vir die mahangu")).toBe("af");
  });

  it("says nothing when it cannot tell, so no wrong translation is offered", () => {
    expect(detectLanguage("Good luck!")).toBeNull();
    expect(detectLanguage("")).toBeNull();
    expect(detectLanguage(undefined)).toBeNull();
    expect(detectLanguage("Oshana mahangu omakunde ongombe Oshakati Ongwediva Ondangwa")).toBeNull();
  });
});

describe("chunkText", () => {
  it("keeps short text whole", () => {
    expect(chunkText("A short post.")).toEqual(["A short post."]);
  });

  it("cuts long text at sentence ends, never past the limit, losing nothing", () => {
    const sentence = "This is one sentence about mahangu prices in the north. ";
    const text = sentence.repeat(30).trim();
    const chunks = chunkText(text, 200);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " "));
  });

  it("splits a long text with no spaces rather than looping forever", () => {
    expect(chunkText("x".repeat(1000), 450).length).toBeGreaterThanOrEqual(3);
  });
});

const respond = (body, status = 200) => jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe("MyMemory", () => {
  it("asks for the right language pair and returns the text", async () => {
    const fetchImpl = respond({ responseStatus: 200, responseData: { translatedText: "Hello world" } });
    await expect(myMemoryTranslate("Hallo wêreld", "af", "en", fetchImpl)).resolves.toBe("Hello world");
    expect(fetchImpl.mock.calls[0][0]).toContain("langpair=af|en");
    expect(fetchImpl.mock.calls[0][0]).toContain(encodeURIComponent("Hallo wêreld"));
  });

  it("does not send Oshiwambo or Otjiherero anywhere (it cannot read them)", async () => {
    const fetchImpl = respond({});
    await expect(myMemoryTranslate("text", "ng", "en", fetchImpl)).rejects.toMatchObject({ code: "unavailable" });
    await expect(myMemoryTranslate("text", "en", "hz", fetchImpl)).rejects.toMatchObject({ code: "unavailable" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("tells a used-up daily limit apart from a failure", async () => {
    await expect(myMemoryTranslate("x y z", "en", "af", respond({}, 429))).rejects.toMatchObject({ code: "limit" });
    await expect(
      myMemoryTranslate("x y z", "en", "af", respond({ responseStatus: 200, responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" } }))
    ).rejects.toMatchObject({ code: "limit" });
    await expect(myMemoryTranslate("x y z", "en", "af", respond({}, 500))).rejects.toMatchObject({ code: "failed" });
    await expect(myMemoryTranslate("x y z", "en", "af", jest.fn().mockRejectedValue(new Error("offline")))).rejects.toMatchObject({ code: "failed" });
  });

  it("translates long text in pieces and joins them", async () => {
    const fetchImpl = jest.fn().mockImplementation(async (url) => ({ ok: true, status: 200, json: async () => ({ responseStatus: 200, responseData: { translatedText: `[${decodeURIComponent(url.split("q=")[1].split("&")[0]).length}]` } }) }));
    const text = "Sentence number one is here. ".repeat(40).trim();
    const out = await myMemoryTranslate(text, "en", "af", fetchImpl);
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(2);
    expect(out.split(" ").length).toBe(fetchImpl.mock.calls.length);
  });
});

describe("translateText (the real one: provider order, memory)", () => {
  // (made per test: the test setup resets every mock before each test)
  const makeUnavailable = () => jest.fn().mockRejectedValue(new TranslateError("unavailable"));

  it("falls through to the next provider when one cannot do it", async () => {
    const second = jest.fn().mockResolvedValue("Goeie môre");
    await expect(actual.translateText("Good morning everyone", "en", "af", { providers: [makeUnavailable(), second] })).resolves.toBe("Goeie môre");
  });

  it("remembers an answer, so the same post is not sent out twice", async () => {
    const provider = jest.fn().mockResolvedValue("Dankie");
    await actual.translateText("Thank you very much", "en", "af", { providers: [provider] });
    await actual.translateText("Thank you very much", "en", "af", { providers: [provider] });
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("reports a used-up limit even when another provider only said 'unavailable'", async () => {
    const limited = jest.fn().mockRejectedValue(new TranslateError("limit"));
    await expect(actual.translateText("Some text to translate", "en", "af", { providers: [limited, makeUnavailable()] })).rejects.toMatchObject({ code: "limit" });
  });

  it("refuses pairs no free translator can do", async () => {
    expect(canTranslate("ng", "en")).toBe(false);
    expect(canTranslate("en", "en")).toBe(false);
    expect(canTranslate("en", "af")).toBe(true);
    await expect(actual.translateText("Onda hala", "ng", "en", { providers: [jest.fn()] })).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("the browser's own translator", () => {
  afterEach(() => {
    delete window.Translator;
  });

  it("is skipped when the browser has none", async () => {
    await expect(browserTranslate("hello there", "en", "af")).rejects.toMatchObject({ code: "unavailable" });
  });

  it("is skipped when its language pack still has to be downloaded (that can take minutes)", async () => {
    const create = jest.fn();
    window.Translator = { availability: async () => "downloadable", create };
    await expect(browserTranslate("hello there", "en", "af")).rejects.toMatchObject({ code: "unavailable" });
    expect(create).not.toHaveBeenCalled();
  });

  it("is skipped when the browser never answers whether it can translate", async () => {
    jest.useFakeTimers();
    try {
      window.Translator = { availability: () => new Promise(() => {}), create: jest.fn() };
      const settled = browserTranslate("hello there", "en", "af").catch((e) => e);
      jest.advanceTimersByTime(3000);
      await expect(settled).resolves.toMatchObject({ code: "unavailable" });
    } finally {
      jest.useRealTimers();
    }
  });

  it("is used, and cleaned up, when the language pack is on the device", async () => {
    const destroy = jest.fn();
    window.Translator = { availability: async () => "available", create: async () => ({ translate: async (s) => `af:${s}`, destroy }) };
    await expect(browserTranslate("hello there", "en", "af")).resolves.toBe("af:hello there");
    expect(destroy).toHaveBeenCalled();
  });
});

describe("a translator that hangs", () => {
  it("gives up after a while instead of leaving the reader waiting", async () => {
    jest.useFakeTimers();
    try {
      const hang = jest.fn(() => new Promise(() => {}));
      const result = actual.translateText("A post that never gets translated", "en", "af", { providers: [hang] });
      const settled = result.catch((e) => e);
      jest.advanceTimersByTime(16000);
      await expect(settled).resolves.toMatchObject({ code: "failed" });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("<TranslatableText>", () => {
  const AFRIKAANS = "Ek het vars tamaties beskikbaar van my plaas hierdie week en ons kan by die skool aflewer";

  it("shows plain text and no button when it is already in the reader's language", () => {
    render(<TranslatableText text="Fresh tomatoes are available from my farm this week and we can deliver" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers a button for Afrikaans text to an English reader, and shows the translation with a machine note", async () => {
    mockedTranslate.mockResolvedValue("I have fresh tomatoes available from my farm this week");
    render(<TranslatableText text={AFRIKAANS} />);
    expect(screen.getByText(AFRIKAANS)).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: /translate/i }));
    expect(await screen.findByText(/I have fresh tomatoes/)).toBeInTheDocument();
    expect(screen.getByText(/by a machine/i)).toBeInTheDocument();
    expect(mockedTranslate).toHaveBeenCalledWith(AFRIKAANS, "af", "en");

    userEvent.click(screen.getByRole("button", { name: /show original/i }));
    expect(screen.getByText(AFRIKAANS)).toBeInTheDocument();
  });

  it("explains a failure in words and keeps the original", async () => {
    mockedTranslate.mockRejectedValue(new TranslateError("limit"));
    render(<TranslatableText text={AFRIKAANS} />);
    userEvent.click(screen.getByRole("button", { name: /translate/i }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/limit/i));
    expect(screen.getByText(AFRIKAANS)).toBeInTheDocument();
  });

  it("offers no button for text it cannot identify (e.g. Oshiwambo), instead of a nonsense translation", () => {
    render(<TranslatableText text="Oshana mahangu omakunde ongombe Oshakati Ongwediva Ondangwa" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("an Afrikaans reader gets English posts translated into Afrikaans", async () => {
    setLanguage("af");
    mockedTranslate.mockResolvedValue("Ek het vars tamaties");
    render(<TranslatableText text="Fresh tomatoes are available from my farm this week and we can deliver" />);
    userEvent.click(screen.getByRole("button", { name: /vertaal/i }));
    expect(await screen.findByText("Ek het vars tamaties")).toBeInTheDocument();
    expect(mockedTranslate).toHaveBeenCalledWith(expect.any(String), "en", "af");
  });
});
