// The languages the site can be shown in.
//
//   code    ISO 639-1 code, also what is saved in the browser and set on <html lang>
//   name    English name (for docs and logs)
//   native  how the language names itself (what the language picker shows)
//   locale  what Intl (numbers, dates) should use; falls back to English formats
//           where the browser has no data for the language
//   status  "source"   the language the text is written in
//           "beta"     complete, but a native speaker has not signed it off yet
//           "reviewed" checked and signed off by a native speaker
//   plural  which plural form a count takes: "one" or "other"
//   mt      which machine translation can read/write it (see translate/). Oshiwambo
//           and Otjiherero have no free machine translation, so posts in them
//           cannot be translated automatically.
//
// A language only appears in the picker once it is listed here AND its catalog
// (locales/<code>.js) passes the checks in catalog.test.js.

const oneOrOther = (n) => (n === 1 ? "one" : "other");

export const LANGUAGES = [
  { code: "en", name: "English", native: "English", locale: "en-NA", status: "source", plural: oneOrOther, mt: true },
  { code: "af", name: "Afrikaans", native: "Afrikaans", locale: "af-NA", status: "beta", plural: oneOrOther, mt: true },
];

// A test language, only outside production builds: every catalog text is shown
// wrapped like "[[Save]]". English left on a page WITHOUT the brackets is text that
// was never moved into a catalog (see scripts/i18n/pseudo-scan.js and docs/I18N.md).
export const PSEUDO = "pseudo";
if (process.env.NODE_ENV !== "production") {
  LANGUAGES.push({ code: PSEUDO, name: "Pseudo (testing)", native: "⟦Pseudo⟧", locale: "en-NA", status: "test", plural: oneOrOther, mt: false });
}

export const DEFAULT_LANGUAGE = "en";

export const isSupported = (code) => LANGUAGES.some((l) => l.code === code);
export const languageInfo = (code) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
