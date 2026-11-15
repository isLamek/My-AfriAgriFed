// All the catalogs, by language code. Add a language: create <code>.js here,
// import it below, and list it in ../languages.js (see docs/I18N.md).
import en from "./en";

export const CATALOGS = { en };

// Test language (never in production): every text wrapped in brackets. The
// {placeholders} inside stay as they are, so t() still fills them.
if (process.env.NODE_ENV !== "production") {
  CATALOGS.pseudo = {};
  Object.keys(en).forEach((key) => {
    CATALOGS.pseudo[key] = `⟦${en[key]}⟧`;
  });
}
