import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "./firebaseConfig";
import appIcon from "./images/seed-mark.png";
import "./SignIn.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setStatus({ type: "error", message: "Enter your email address." });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setStatus({
        type: "success",
        message: `If an account exists for ${email.trim()}, a password reset link is on its way.`,
      });
    } catch (error) {
      // Firebase can be picky about invalid-email vs user-not-found; keep the
      // message generic so this can't be used to probe which emails exist.
      if (error.code === "auth/invalid-email") {
        setStatus({ type: "error", message: "That doesn't look like a valid email address." });
      } else {
        setStatus({
          type: "success",
          message: `If an account exists for ${email.trim()}, a password reset link is on its way.`,
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
          <button className="nav-btn" onClick={() => navigate("/")}>
            Home
          </button>
          <button className="nav-btn primary">Contact Us</button>
        </div>
      </nav>

      <div className="signin-container">
        <div className="signin-card">
          <div className="signin-logo">
            <img src={appIcon} alt="AfriAgriFed" />
            <span className="signin-brand">AfriAgriFed</span>
          </div>

          <h1 className="signin-title">Reset your password</h1>
          <p className="signin-subtitle">
            Enter the email you signed up with and we'll send you a link to set a new password.
          </p>

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label>Email *</label>
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
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="signin-footnote">
            <Link to="/signin">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
