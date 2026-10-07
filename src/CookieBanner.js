import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CONSENT, getConsent, onConsentChange, setConsent } from "./consent";
import "./Legal.css";

/**
 * Asks once whether optional analytics may run. Both choices are the same
 * size and equally easy; nothing optional runs until "Allow" is chosen.
 */
export default function CookieBanner() {
  const [choice, setChoice] = useState(getConsent());
  useEffect(() => onConsentChange(setChoice), []);

  if (choice) return null;

  return (
    <section className="cookie-banner" aria-label="Cookie choice">
      <p>
        We use essential storage to keep you signed in. With your permission we also record simple, anonymous usage events to
        improve AfriAgriFed. No advertising, no third-party trackers. <Link to="/cookies">Cookie policy</Link>
      </p>
      <div className="cookie-banner-actions">
        <button className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => setConsent(CONSENT.DECLINED)}>
          Essential only
        </button>
        <button className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => setConsent(CONSENT.ALLOWED)}>
          Allow analytics
        </button>
      </div>
    </section>
  );
}
