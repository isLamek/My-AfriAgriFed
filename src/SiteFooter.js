import React from "react";
import { Link } from "react-router-dom";
import { BUSINESS } from "./business";
import "./Legal.css";
import { t } from "./i18n";

/** Business details and legal links, shown at the foot of every public page. */
export default function SiteFooter({ tone = "light" }) {
  return (
    <footer className={`site-footer ${tone}`}>
      <div className="site-footer-inner">
        <div>
          <strong>{BUSINESS.legalName}</strong>
          <p>
            {BUSINESS.town}, {t("common.namibia")}
            {BUSINESS.registrationNumber ? ` · ${t("footer.regNo", { number: BUSINESS.registrationNumber })}` : ""}
          </p>
          <p>
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>
          </p>
        </div>
        <nav aria-label={t("footer.legal")}>
          <Link to="/terms">{t("footer.termsOfService")}</Link>
          <Link to="/privacy">{t("footer.privacyPolicy")}</Link>
          <Link to="/refunds">{t("footer.refunds")}</Link>
          <Link to="/cookies">{t("footer.cookies")}</Link>
        </nav>
      </div>
      <p className="site-footer-copy">{t("footer.copyright", { year: new Date().getFullYear(), name: BUSINESS.legalName })}</p>
    </footer>
  );
}
