import React from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useI18n } from "./I18nProvider";
import "./LanguageSwitcher.css";

/**
 * Language picker. A native <select> (works well on cheap phones and with
 * screen readers). Each language is shown in its own name, so people can find
 * theirs even when the page is in a language they do not read.
 *
 *   tone     "light" for light backgrounds, "dark" for the dark sidebar / photos
 *   compact  icon only (the collapsed sidebar); the select is still there, invisible
 */
export default function LanguageSwitcher({ tone = "light", compact = false, className = "" }) {
  const { lang, setLanguage, t, languages } = useI18n();
  if (languages.length < 2) return null; // nothing to choose between yet
  const current = languages.find((l) => l.code === lang) || languages[0];

  return (
    <div className={`lang-switch-wrap ${className}`} data-i18n-ignore>
      <label className={`lang-switch ${tone} ${compact ? "compact" : ""}`} title={t("language.label")}>
        <Globe size={16} aria-hidden="true" />
        <span className="aaf-visually-hidden">{t("language.label")}</span>
        <select value={lang} onChange={(e) => setLanguage(e.target.value)}>
          {languages.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.native}
            </option>
          ))}
        </select>
        {!compact && <ChevronDown size={14} className="lang-caret" aria-hidden="true" />}
      </label>
      {current.status === "beta" && !compact && <p className={`lang-beta ${tone}`}>{t("language.betaNote")}</p>}
    </div>
  );
}
