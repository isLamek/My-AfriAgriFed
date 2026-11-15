import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "./firebaseConfig";
import appIcon from "./images/seed-mark.png";
import "./SignIn.css";
import { t, LanguageSwitcher } from "./i18n";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setStatus({ type: "error", message: t("forgotPassword.enterEmail") });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setStatus({
        type: "success",
        message: t("forgotPassword.sent", { email: email.trim() }),
      });
    } catch (error) {
      // Firebase can be picky about invalid-email vs user-not-found; keep the
      // message generic so this can't be used to probe which emails exist.
      if (error.code === "auth/invalid-email") {
        setStatus({ type: "error", message: t("forgotPassword.invalidEmail") });
      } else {
        setStatus({
          type: "success",
          message: t("forgotPassword.sent", { email: email.trim() }),
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signin-page">
      <nav className="navbar">
        <div className="nav-links desktop-nav">
          <LanguageSwitcher tone="dark" />
          <button className="nav-btn" onClick={() => navigate("/")}>
            {t("forgotPassword.home")}
          </button>
          <button className="nav-btn primary">{t("forgotPassword.contactUs")}</button>
        </div>
      </nav>

      <div className="signin-container">
        <div className="signin-card">
          <div className="signin-logo">
            <img src={appIcon} alt="AfriAgriFed" />
            <span className="signin-brand">AfriAgriFed</span>
          </div>

          <h1 className="signin-title">{t("forgotPassword.resetYourPassword")}</h1>
          <p className="signin-subtitle">
            {t("forgotPassword.enterTheEmailYouSignedUp")}
          </p>

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label>{t("forgotPassword.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {status && (
              <p className={`signin-status ${status.type === "error" ? "is-error" : "is-success"}`}>
                {status.message}
              </p>
            )}

            <button className="btn-primary" disabled={submitting}>
              {submitting ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
            </button>
          </form>

          <p className="signin-footnote">
            <Link to="/signin">{t("forgotPassword.backToSignIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
