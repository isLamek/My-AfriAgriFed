import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebaseConfig";
import { autoClaimPresetAdmin, isAdmin } from "./admin";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import appIcon from "./images/seed-mark.png";
import "./SignIn.css";

// DEVELOPMENT ONLY (the route and the sign-in link are not available in
// production builds). A minimal email+password account creator that skips the
// Register.js wizard, for developers testing locally. It creates only a login:
// no profile, and nothing is marked approved. To make a real admin in
// production, create the user in Firebase console (Authentication, Add user)
// and have a founder grant that email in the Admin Dashboard.
export default function QuickAccess() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email || password.length < 6) {
      setStatus("Enter an email and a password of at least 6 characters.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      let user;

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
        logTelemetryEvent(TELEMETRY_EVENTS.SIGN_UP, { userType: "quick-access" });
      } catch (error) {
        if (error.code !== "auth/email-already-in-use") throw error;
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
        logTelemetryEvent(TELEMETRY_EVENTS.SIGN_IN, {});
      }

      // No profile is written here: admins do not need one (sign-in checks the admin
      // list first), and a profile that approves itself would defeat verification.

      const claimResult = await autoClaimPresetAdmin(user);
      const alreadyAdmin = claimResult.claimed || (await isAdmin(user));

      if (alreadyAdmin) {
        navigate("/admin/dashboard");
      } else if (claimResult.error) {
        setStatus(claimResult.error);
      } else {
        setStatus("Signed in. This email isn't on the admin list, so redirecting to your dashboard.");
        setTimeout(() => navigate("/dashboard"), 1200);
      }
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-container">
        <div className="signin-card">
          <div className="signin-logo">
            <img src={appIcon} alt="AfriAgriFed" />
            <span className="signin-brand">AfriAgriFed</span>
          </div>

          <h1 className="signin-title">Quick Access</h1>
          <p className="signin-subtitle">
            Skips the full registration questionnaire. Creates (or signs into) a plain
            account - no farmer/consumer/institution profile, no document review.
          </p>

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>

            {status && <p className="signin-status is-error">{status}</p>}

            <button className="btn-primary" disabled={submitting}>
              {submitting ? "Working..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
