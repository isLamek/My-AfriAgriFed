// Translating what members wrote (posts, comments, requests). Always machine translation,
// always labelled as such, never applied to private messages.

import { PROVIDER_MODE, TranslateError, browserTranslate, myMemoryTranslate, withTimeout } from "./providers";
import { languageInfo } from "../i18n";

export { TranslateError } from "./providers";
export { detectLanguage } from "./detect";

const READABLE = new Set(["en", "af"]); // what the free translators can read and write today

/**
 * The language a reader is offered a translation INTO: their own when a translator can
 * write it, English otherwise (Oshiwambo and Otjiherero readers get English, which is
 * better than nothing). null when translation is switched off.
 */
export function targetFor(readerLang) {
  if (PROVIDER_MODE === "off") return null;
  const info = languageInfo(readerLang);
  return info.mt && READABLE.has(readerLang) ? readerLang : "en";
}

export function canTranslate(from, to) {
  return PROVIDER_MODE !== "off" && !!from && !!to && from !== to && READABLE.has(from) && READABLE.has(to);
}

// ---- remembered answers, so the same post is not translated (and sent out) twice ---------------
const MEMORY = new Map();
const STORE_KEY = "aaf_translations";
const STORE_MAX = 150;

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};
const cacheKey = (text, from, to) => `${from}>${to}:${text.length}:${hash(text)}`;

const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeStore = (key, value) => {
  try {
    const store = readStore();
    store[key] = value;
    const keys = Object.keys(store);
    for (const k of keys.slice(0, Math.max(0, keys.length - STORE_MAX))) delete store[k];
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // private window or storage full: just do without the memory
  }
};

const PROVIDER_TIMEOUT_MS = 15000;

/** Translate `text` from one language to another. Throws a TranslateError. */
export async function translateText(text, from, to, { providers } = {}) {
  const clean = String(text || "").trim();
  if (!clean) return "";
  if (!canTranslate(from, to)) throw new TranslateError("unavailable");
  const key = cacheKey(clean, from, to);
  if (MEMORY.has(key)) return MEMORY.get(key);
  const stored = readStore()[key];
  if (stored) {
    MEMORY.set(key, stored);
    return stored;
  }

  const chain = providers || (PROVIDER_MODE === "browser" ? [browserTranslate] : [browserTranslate, myMemoryTranslate]);
  let last = new TranslateError("unavailable");
  for (const provider of chain) {
    try {
      const result = await withTimeout(Promise.resolve(provider(clean, from, to)), PROVIDER_TIMEOUT_MS);
      if (typeof result === "string" && result.trim()) {
        MEMORY.set(key, result);
        writeStore(key, result);
        return result;
      }
    } catch (error) {
      // "limit" is worth telling the reader about; otherwise keep the most useful complaint
      if (error instanceof TranslateError) {
        if (error.code === "limit" || last.code === "unavailable") last = error;
      } else {
        last = new TranslateError("failed");
      }
    }
  }
  throw last;
}

export function clearTranslationMemory() {
  MEMORY.clear();
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // nothing to clear
  }
}
