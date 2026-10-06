import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import seedMark from "./images/seed-mark.png";
import SiteFooter from "./SiteFooter";
import { LEGAL_PAGES } from "./legalContent";
import { LEGAL_UPDATED } from "./business";
import { CONSENT, getConsent, onConsentChange, setConsent } from "./consent";
import "./Legal.css";

function CookieChoice() {
  const [choice, setChoice] = useState(getConsent());
  useEffect(() => onConsentChange(setChoice), []);
  return (
    <section className="legal-choice" aria-labelledby="cookie-choice">
      <h2 id="cookie-choice">Your choice</h2>
      <p>
        Analytics is currently <strong>{choice === CONSENT.ALLOWED ? "allowed" : "off"}</strong>.
      </p>
      <div className="legal-choice-actions">
        <button className="aaf-btn aaf-btn-secondary" onClick={() => setConsent(CONSENT.DECLINED)} aria-pressed={choice === CONSENT.DECLINED}>
          Turn analytics off
        </button>
        <button className="aaf-btn aaf-btn-secondary" onClick={() => setConsent(CONSENT.ALLOWED)} aria-pressed={choice === CONSENT.ALLOWED}>
          Allow analytics
        </button>
      </div>
    </section>
  );
}

export default function Legal({ page }) {
  const navigate = useNavigate();
  const content = LEGAL_PAGES[page];

  useEffect(() => {
    document.title = `${content.title} · AfriAgriFed`;
    window.scrollTo(0, 0);
    return () => {
      document.title = "AfriAgriFed";
    };
  }, [content.title]);

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-brand">
          <img src={seedMark} alt="" />
          <span>AfriAgriFed</span>
        </Link>
        <button type="button" className="aaf-btn aaf-btn-secondary aaf-btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} aria-hidden="true" /> Back
        </button>
      </header>

      <main className="legal-body">
        <h1>{content.title}</h1>
        <p className="legal-updated">Last updated {LEGAL_UPDATED}</p>
        <p className="legal-intro">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {(section.body || []).map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {(section.after || []).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}

        {page === "cookies" && <CookieChoice />}
      </main>

      <SiteFooter />
    </div>
  );
}
