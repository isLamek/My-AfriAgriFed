import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CONSENT, getConsent, onConsentChange, setConsent } from "./consent";
import "./Legal.css";
import { t } from "./i18n";

/**
 * Asks once whether optional analytics may run. Both choices are the same
 * size and equally easy; nothing optional runs until "Allow" is chosen.
 */
export default function CookieBanner() {
  const [choice, setChoice] = useState(getConsent());
  useEffect(() => onConsentChange(setChoice), []);

  if (choice) return null;

  return (
    <section className="cookie-banner" aria-label={t("cookies.cookieChoice")}>
      <p>
        {t("cookies.notice")} <Link to="/cookies">{t("cookies.policy")}</Link>
      </p>
      <div className="cookie-banner-actions">
        <button className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => setConsent(CONSENT.DECLINED)}>
          {t("cookies.essentialOnly")}
        </button>
        <button className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => setConsent(CONSENT.ALLOWED)}>
          {t("cookies.allowAnalytics")}
        </button>
      </div>
    </section>
  );
}
