import React, { useState } from "react";
import "./SignIn.css";

import logo from "./images/full-logo.png";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig";

export default function SignIn({ onBackToHome }) {
  const [formData, setFormData] = useState({
    loginId: "",
    password: ""
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleHomeClick = () => {
    if (onBackToHome) {
      onBackToHome();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!formData.loginId.trim()) {
      newErrors.loginId = "Email is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // 🔥 Firebase Authentication Login
      const result = await signInWithEmailAndPassword(
        auth,
        formData.loginId,
        formData.password
      );

      console.log("Logged in:", result.user);

      alert("Login successful! Redirecting to dashboard...");

      // TODO: Replace alert later with actual navigation
      // e.g. navigate("/dashboard");

    } catch (err) {
      console.error("Login error:", err);

      let msg = "Login failed.";

      if (err.code === "auth/user-not-found") msg = "No account found with that email.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      if (err.code === "auth/invalid-email") msg = "Invalid email format.";

      alert(msg);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="signin-page">
      <nav className="navbar">
        <div className="nav-links desktop-nav">
          <button className="nav-btn" onClick={handleHomeClick}>
            Home
          </button>
          <button className="nav-btn primary">
            Contact Us
          </button>
        </div>
      </nav>

      <div className="signin-container">
        <div className="signin-card">
          <div className="signin-logo">
            <img src={logo} alt="Afriagrifed Logo" />
          </div>

          <h1 className="signin-title">Sign In</h1>

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="text"
                name="loginId"
                value={formData.loginId}
                onChange={handleInputChange}
                className={errors.loginId ? "error" : ""}
                placeholder="your.email@example.com"
              />
              {errors.loginId && <span className="error-text">{errors.loginId}</span>}
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? "error" : ""}
                placeholder="Enter your password"
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
