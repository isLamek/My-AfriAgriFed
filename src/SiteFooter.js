import React from "react";
import { Link } from "react-router-dom";
import { BUSINESS } from "./business";
import "./Legal.css";

/** Business details and legal links, shown at the foot of every public page. */
export default function SiteFooter({ tone = "light" }) {
  return (
    <footer className={`site-footer ${tone}`}>
      <div className="site-footer-inner">
        <div>
          <strong>{BUSINESS.legalName}</strong>
          <p>
            {BUSINESS.town}, {BUSINESS.country}
            {BUSINESS.registrationNumber ? ` · Reg. no. ${BUSINESS.registrationNumber}` : ""}
          </p>
          <p>
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>
          </p>
        </div>
        <nav aria-label="Legal">
          <Link to="/terms">Terms of service</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/refunds">Refunds</Link>
          <Link to="/cookies">Cookies</Link>
        </nav>
      </div>
      <p className="site-footer-copy">© {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.</p>
    </footer>
  );
}
