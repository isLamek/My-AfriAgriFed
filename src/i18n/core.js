// The translation engine: no React, no dependencies.
//
//   t("profile.editProfile")                      -> "Edit profile"
//   t("demand.needed", { qty: 50, unit: "kg" })   -> "50 kg needed"   ({qty}, {unit} in the text)
//   t("time.minutesAgo", { count: 5 })            -> picks time.minutesAgo_one / _other
//
// A key missing from the chosen language falls back to English, so a gap shows
// English text and never a blank or a raw key. (catalog.test.js stops gaps from
// being released in the first place.)

import { DEFAULT_LANGUAGE, isSupported, languageInfo } from "./languages";
import { CATALOGS } from "./locales";

export const STORAGE_KEY = "aaf_lang";

const has = (dict, key) => Object.prototype.hasOwnProperty.call(dict, key);

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isSupported(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE; // storage blocked: English for this visit
  }
}

let current = readSaved();
const listeners = new Set();

function applyToDocument() {
  if (typeof document !== "undefined") document.documentElement.lang = current;
}
applyToDocument();

export const getLanguage = () => current;

export function setLanguage(code) {
  if (!isSupported(code) || code === current) return;
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage blocked: the choice lasts until the page is closed
  }
  applyToDocument();
  listeners.forEach((fn) => fn(current));
}

/** Calls fn(code) whenever the language changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const warned = new Set();
function warnMissing(lang, key) {
  if (process.env.NODE_ENV !== "development") return;
  const id = `${lang}:${key}`;
  if (warned.has(id)) return;
  warned.add(id);
  // eslint-disable-next-line no-console
  console.warn(`[i18n] "${key}" has no ${lang} text${lang === DEFAULT_LANGUAGE ? " (and no English either)" : ", showing English"}`);
}

/** The raw text for a key, or undefined. Tries the language, then English. */
function find(lang, keys) {
  const dict = CATALOGS[lang];
  for (const k of keys) if (dict && has(dict, k)) return dict[k];
  return undefined;
}

function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name) => (has(vars, name) && vars[name] != null ? String(vars[name]) : whole));
}

/**
 * Translates a key. vars fills {placeholders}; a numeric vars.count also picks
 * the plural form (key_one / key_other).
 */
export function t(key, vars) {
  const lang = current;
  const keys = [];
  if (vars && typeof vars.count === "number") {
    const form = languageInfo(lang).plural(vars.count);
    keys.push(`${key}_${form}`, `${key}_other`);
  }
  keys.push(key);

  let text = find(lang, keys);
  if (text === undefined && lang !== DEFAULT_LANGUAGE) {
    warnMissing(lang, key);
    // English plural forms follow English rules, not the visitor's language's
    const enKeys = [];
    if (vars && typeof vars.count === "number") enKeys.push(`${key}_${languageInfo(DEFAULT_LANGUAGE).plural(vars.count)}`, `${key}_other`);
    enKeys.push(key);
    text = find(DEFAULT_LANGUAGE, enKeys);
  }
  if (text === undefined) {
    warnMissing(DEFAULT_LANGUAGE, key);
    return key;
  }
  return interpolate(text, vars);
}

/** True when the key has text in the language (used by tests and tools). */
export const hasKey = (lang, key) => !!CATALOGS[lang] && has(CATALOGS[lang], key);

// ---- numbers and dates, in the visitor's language -------------------------
const localeFor = (lang = current) => languageInfo(lang).locale;

export const formatNumber = (n, options) => new Intl.NumberFormat(localeFor(), options).format(n);

export const formatDate = (value, options) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(localeFor(), options).format(d);
};

export const formatDateTime = (value, options = { dateStyle: "medium", timeStyle: "short" }) => formatDate(value, options);
