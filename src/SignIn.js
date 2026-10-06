import React, { useState } from "react";
import "./SignIn.css";
import appIcon from "./images/seed-mark.png";

import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { autoClaimPresetAdmin, isAdmin } from "./admin";
import { friendlyAuthError } from "./authErrors";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import { Link, useNavigate } from "react-router-dom";
import { BUSINESS } from "./business";
import toast from "react-hot-toast";

export default function SignIn() {
const navigate = useNavigate()
  const [formData, setFormData] = useState({
    loginId: "",
    password: ""
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleHomeClick = () => {
    navigate("/");
    // onNavigate("home");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  const newErrors = {};

  if (!formData.loginId)
    newErrors.loginId = "Email is required";

  if (!formData.password)
    newErrors.password = "Password is required";

  if (Object.keys(newErrors).length) {
    setErrors(newErrors);
    return;
  }

  setIsSubmitting(true);

  try {
    const cred = await signInWithEmailAndPassword(
      auth,
      formData.loginId,
      formData.password
    );

    const user = cred.user;

    logTelemetryEvent(TELEMETRY_EVENTS.SIGN_IN, {});

    const claimResult = await autoClaimPresetAdmin(user);
    const admin = claimResult.claimed || (await isAdmin(user));

    if (admin) {
      navigate("/admin/dashboard");
      return;
    }

    if (claimResult.error) {
      toast.error(claimResult.error);
    }

    const userSnapshot = await getDoc(doc(db, "users", user.uid));
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};

    if (userData.userType === "farmer") {
      const approved =
        userData.approved === true ||
        userData.status === "approved" ||
        userData.status === "verified" ||
        userData.accountStatus?.registrationStatus === "verified" ||
        userData.accountStatus?.documentStatus === "approved";

      if (approved) {
        navigate("/dashboard");
      } else {
        toast.error("Your farmer account is still awaiting admin approval.");
        await auth.signOut();
        navigate("/signin");
      }
    } else if (userData.userType === "institution") {
      const approved =
        userData.approved === true ||
        userData.status === "approved" ||
        userData.status === "verified" ||
        userData.accountStatus?.registrationStatus === "verified" ||
        userData.accountStatus?.documentStatus === "approved";

      if (approved) {
        navigate("/institutiondashboard");
      } else {
        toast.error("Your institution account is still awaiting admin approval.");
        await auth.signOut();
        navigate("/signin");
      }
    } else {
      navigate("/dashboard");
    }

  } catch (err) {
    console.error(err);

    toast.error(friendlyAuthError(err, "Login failed. Please try again."));

  } finally {
    setIsSubmitting(false);
  }
};
  

  return (
    <div className="signin-page">
      <nav className="navbar">
        <div className="nav-links desktop-nav">
          <button className="nav-btn" onClick={handleHomeClick}>
            Home
          </button>
          <a className="nav-btn primary" href={`mailto:${BUSINESS.email}`}>
            Contact us
          </a>
        </div>
      </nav>

      <div className="signin-container">
        <div className="signin-card">
          <div className="signin-logo">
            <img src={appIcon} alt="AfriAgriFed" />
            <span className="signin-brand">AfriAgriFed</span>
          </div>

          <h1 className="signin-title">Sign in</h1>

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label htmlFor="signin-email">E-mail address</label>
              <input
                id="signin-email"
                type="email"
                name="loginId"
                autoComplete="email"
                required
                aria-invalid={!!errors.loginId}
                value={formData.loginId}
                onChange={handleInputChange}
                className={errors.loginId ? "error" : ""}
              />
              {errors.loginId && <span className="error-text">{errors.loginId}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                aria-invalid={!!errors.password}
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? "error" : ""}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <Link to="/forgot-password" className="signin-forgot-link">
              Forgot password?
            </Link>

            <button className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="signin-footnote">
            Need an account? <Link to="/register">Register</Link>
            {process.env.NODE_ENV !== "production" && (
              <>
                {" "}or use <Link to="/quick-access">Quick Access</Link> (development only)
              </>
            )}
            .
          </p>
        </div>
      </div>
    </div>
  );
}
