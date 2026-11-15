// The two free ways a post can be translated, tried in this order:
//
//   1. The browser's own translator (Chrome's on-device Translator API). Private: the text
//      never leaves the phone or computer. Only some browsers have it.
//   2. MyMemory (translated.net), a free online service. The text is sent to them, so this
//      is used only for text that is already public (posts, comments, requests) and the
//      privacy policy says so. It reads English and Afrikaans, not Oshiwambo/Otjiherero.
//
// REACT_APP_TRANSLATE_PROVIDER  "auto" (default) | "browser" (never send text out) | "off"

export const PROVIDER_MODE = (process.env.REACT_APP_TRANSLATE_PROVIDER || "auto").toLowerCase();

export class TranslateError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code; // "unavailable" | "limit" | "failed"
  }
}

// A provider that hangs must not leave the reader looking at "Translating..." for ever.
export const withTimeout = (promise, ms, code = "failed") =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TranslateError(code, "timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

// ---- 1. on-device -----------------------------------------------------------------------------
export async function browserTranslate(text, from, to) {
  const Translator = typeof window !== "undefined" ? window.Translator : undefined;
  if (!Translator || typeof Translator.create !== "function") throw new TranslateError("unavailable");
  // Only when the language pack is already on the device: downloading one can take minutes
  // and needs the reader's go-ahead, so otherwise the next provider is tried straight away.
  if (typeof Translator.availability !== "function") throw new TranslateError("unavailable");
  // (some browsers never answer this question: after 2.5 s it counts as "no")
  const state = await withTimeout(Promise.resolve(Translator.availability({ sourceLanguage: from, targetLanguage: to })), 2500, "unavailable");
  if (state !== "available") throw new TranslateError("unavailable");
  const translator = await Translator.create({ sourceLanguage: from, targetLanguage: to });
  try {
    return await translator.translate(text);
  } finally {
    if (translator && typeof translator.destroy === "function") translator.destroy();
  }
}

// ---- 2. MyMemory ------------------------------------------------------------------------------
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const MYMEMORY_PAIRS = new Set(["en", "af"]);
const MAX_CHUNK = 450; // their limit is 500 bytes per request

/** Cut text into pieces of at most `max` characters, at sentence ends where possible. */
export function chunkText(text, max = MAX_CHUNK) {
  const out = [];
  let rest = String(text || "").trim();
  while (rest.length > max) {
    let cut = Math.max(rest.lastIndexOf(". ", max), rest.lastIndexOf("! ", max), rest.lastIndexOf("? ", max), rest.lastIndexOf("\n", max));
    if (cut < max * 0.4) cut = rest.lastIndexOf(" ", max);
    if (cut < 1) cut = max;
    out.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export async function myMemoryTranslate(text, from, to, fetchImpl = typeof fetch === "function" ? fetch : null) {
  if (!fetchImpl || !MYMEMORY_PAIRS.has(from) || !MYMEMORY_PAIRS.has(to)) throw new TranslateError("unavailable");
  const parts = [];
  for (const chunk of chunkText(text)) {
    let res;
    try {
      res = await fetchImpl(`${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}&langpair=${from}|${to}`);
    } catch {
      throw new TranslateError("failed");
    }
    if (res.status === 429) throw new TranslateError("limit");
    if (!res.ok) throw new TranslateError("failed");
    let data;
    try {
      data = await res.json();
    } catch {
      throw new TranslateError("failed");
    }
    const status = Number(data && data.responseStatus);
    if (status === 429 || (data && data.quotaFinished)) throw new TranslateError("limit");
    const translated = data && data.responseData && data.responseData.translatedText;
    if (status !== 200 || typeof translated !== "string" || !translated.trim()) throw new TranslateError("failed");
    // MyMemory answers a used-up quota with a warning text instead of an error code
    if (/MYMEMORY WARNING|INVALID LANGUAGE PAIR/i.test(translated)) throw new TranslateError(/WARNING/i.test(translated) ? "limit" : "unavailable");
    parts.push(translated);
  }
  return parts.join(" ");
}
