import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getLanguage, setLanguage, subscribe, t } from "./core";
import { LANGUAGES } from "./languages";

const I18nContext = createContext(null);

/**
 * Holds the chosen language. When it changes the whole app below is rebuilt
 * (key={lang}), so every piece of text is read again in the new language,
 * including text inside event handlers and validators that only call t()
 * when something happens.
 */
export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getLanguage);
  useEffect(() => subscribe(setLang), []);
  const value = useMemo(() => ({ lang, setLanguage, t, languages: LANGUAGES }), [lang]);
  return (
    <I18nContext.Provider value={value}>
      <React.Fragment key={lang}>{children}</React.Fragment>
    </I18nContext.Provider>
  );
}

/** { lang, setLanguage, t, languages } for components that need the language itself. */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) return { lang: getLanguage(), setLanguage, t, languages: LANGUAGES };
  return ctx;
}
