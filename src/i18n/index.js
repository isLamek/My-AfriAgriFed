// Everything a page needs from the translation system:
//
//   import { t } from "./i18n";                  text:   t("profile.editProfile")
//   import { tRich } from "./i18n";              text with links/elements inside it
//   import { formatNumber, formatDate } from "./i18n";
//   import { useI18n, LanguageSwitcher } from "./i18n";
//
// See docs/I18N.md for how the language files work and how to add a language.

export { t, getLanguage, setLanguage, subscribe, hasKey, formatNumber, formatDate, formatDateTime } from "./core";
export { tRich } from "./rich";
export { I18nProvider, useI18n } from "./I18nProvider";
export { default as LanguageSwitcher } from "./LanguageSwitcher";
export { LANGUAGES, languageInfo, isSupported, DEFAULT_LANGUAGE } from "./languages";
