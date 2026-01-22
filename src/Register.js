import React, { useState } from "react";
//import { gsap } from "gsap";
import "./Register.css";

import logo from "./images/full-logo.png";
import { auth, db } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";


export default function Register({ onBackToHome, onNavigateToSignIn }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Phase 1: Personal Information
    userType: "",
    firstName: "",
    lastName: "",
    dob: "",
    nationality: "",
    gender: "",
    personalEmail: "",
    password: "",
    confirmPassword: "",
    agreedToTerms: false,
    
    // Phase 2: Farm Information
    farmName: "",
    farmingType: "",
    businessAge: "",
    farmScale: "",
    location: "",
    businessEmail: "",
    
    // Phase 3: Documents
    personalId: null,
    proofOfRegistration: null,
    businessCertificate: null,
    bankStatement: null,
    educatorCertificate: null,

  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Navigation handlers
  const handleHomeClick = () => {
    if (onBackToHome) {
      onBackToHome();
    }
  };

  const handleSignInClick = () => {
    if (onNavigateToSignIn) {
      onNavigateToSignIn();
    }
  };

  const handleContactClick = () => {
    console.log("Navigate to contact page");
    alert("Contact page coming soon!");
  };

  const handleInputChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : files ? files[0] : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validatePhase1 = () => {
    const newErrors = {};
    
    if (!formData.userType) newErrors.userType = "Please select your account type";
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.dob) newErrors.dob = "Date of birth is required";
    if (!formData.nationality.trim()) newErrors.nationality = "Nationality is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.personalEmail.trim()) {
      newErrors.personalEmail = "Personal email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.personalEmail)) {
      newErrors.personalEmail = "Personal email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhase2 = () => {
    const newErrors = {};
    
    if (!formData.farmName.trim()) newErrors.farmName = "Farm/Business name is required";
    if (!formData.farmingType) newErrors.farmingType = "Please select farming type";
    if (!formData.businessAge) newErrors.businessAge = "Business age is required";
    if (!formData.farmScale) newErrors.farmScale = "Please select farm scale";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.businessEmail.trim()) {
      newErrors.businessEmail = "Business email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) {
      newErrors.businessEmail = "Business email is invalid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleNext = async () => {
  if (currentStep === 1) {
    if (!validatePhase1()) return;

    // CUSTOMER → REGISTER & REDIRECT
    if (formData.userType === "customer") {
      await handleSubmit(true);
      return;
    }

    // FARMER / EDUCATOR
    setCurrentStep(2);
  } 
  else if (currentStep === 2) {
    if (!validatePhase2()) return;
    setCurrentStep(3);
  }
};








  const handleBack = () => {
    if (currentStep === 1) {
      handleHomeClick();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (completeRegistration = false) => {
  setIsSubmitting(true);

  try {
    // 1️⃣ VALIDATE DOCUMENTS IF COMPLETE REGISTRATION
    if (completeRegistration) {
  const docErrors = {};

  if (formData.userType === "farmer") {
    if (!formData.personalId) docErrors.personalId = "Required";
    if (!formData.proofOfRegistration) docErrors.proofOfRegistration = "Required";
    if (!formData.businessCertificate) docErrors.businessCertificate = "Required";
    if (!formData.bankStatement) docErrors.bankStatement = "Required";
  }

  if (formData.userType === "educator") {
    if (!formData.educatorCertificate)
      docErrors.educatorCertificate = "Educator certificate required";
  }

  if (Object.keys(docErrors).length > 0) {
    setErrors(prev => ({ ...prev, ...docErrors }));
    setIsSubmitting(false);
    return;
  }
}


    // 2️⃣ AUTHENTICATION — CREATE USER BY EMAIL + PASSWORD
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.personalEmail,
      formData.password
    );

    const user = userCredential.user;

    // 3️⃣ SAVE ALL FORM DATA TO FIRESTORE
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,

      // PERSONAL INFORMATION
      firstName: formData.firstName,
      lastName: formData.lastName,
      dob: formData.dob,
      nationality: formData.nationality,
      gender: formData.gender,

      personalEmail: formData.personalEmail,

      // FARM INFORMATION
      farmName: formData.farmName,
      farmingType: formData.farmingType,
      businessAge: formData.businessAge,
      farmScale: formData.farmScale,
      businessEmail: formData.businessEmail,
      location: formData.location,

      // ACCOUNT STATUS
      registrationStatus: completeRegistration ? "verified" : "pending",

      // TIMESTAMP
      createdAt: new Date(),
      userType: formData.userType,
documentStatus:
  formData.userType === "customer" ? "not_required" :
  completeRegistration ? "submitted" : "pending",

    });

    alert(
      completeRegistration
        ? "Registration complete! Documents under review."
        : "Registered as pending! Please upload remaining documents soon."
    );

    handleHomeClick();

  } catch (error) {
    console.error(error);
    alert("Registration failed: " + error.message);
  }

  setIsSubmitting(false);
};


  const renderProgressSteps = () => (
    <div className="progress-steps">
      {[1, 2, 3].map(step => (
        <div key={step} className={`step ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}>
          <div className="step-number">{step}</div>
          <div className="step-label">
            {step === 1 ? 'Personal Info' : step === 2 ? 'Farm Info' : 'Documents'}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="register-page">
      {/* NAVBAR - Same as Homepage */}
      <nav className="navbar">
        <div className="nav-links desktop-nav">
          <button className="nav-btn" onClick={handleHomeClick}>
            Home
          </button>
          <button className="nav-btn" onClick={handleSignInClick}>
            Sign In
          </button>
          <button className="nav-btn primary" onClick={handleContactClick}>
            Contact Us
          </button>
        </div>
      </nav>

      <div className="register-container">
        <div className="register-card">
          {/* Logo */}
          <div className="register-logo">
            <img src={logo} alt="Afriagrifed Logo" />
          </div>

          <h1 className="register-title">Create Your Account</h1>

          {/* Progress Steps */}
          {renderProgressSteps()}

          {/* Phase 1: Personal Information */}
          {currentStep === 1 && (
            <div className="form-phase">
              <h2>Personal Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={errors.firstName ? 'error' : ''}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={errors.lastName ? 'error' : ''}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>

                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className={errors.dob ? 'error' : ''}
                  />
                  {errors.dob && <span className="error-text">{errors.dob}</span>}
                </div>

                <div className="form-group">
                  <label>Nationality *</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className={errors.nationality ? 'error' : ''}
                    placeholder="Your nationality"
                  />
                  {errors.nationality && <span className="error-text">{errors.nationality}</span>}
                </div>

                <div className="form-group">
                  <label>Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={errors.gender ? 'error' : ''}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <span className="error-text">{errors.gender}</span>}
                </div>
                <div className="form-group full-width">
                <label>Account Type *</label>
                 <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleInputChange}
                  className={errors.userType ? 'error' : ''}
  >
                <option value="">Select Account Type</option>
                <option value="customer">Customer</option>
                <option value="farmer">Farmer</option>
                <option value="educator">Educator</option>
                </select>
                {errors.userType && <span className="error-text">{errors.userType}</span>}
                </div>


                <div className="form-group full-width">
                  <label>Personal Email *</label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleInputChange}
                    className={errors.personalEmail ? 'error' : ''}
                    placeholder="your.personal@example.com"
                  />
                  {errors.personalEmail && <span className="error-text">{errors.personalEmail}</span>}
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={errors.password ? 'error' : ''}
                    placeholder="Create a password"
                  />
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label>Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={errors.confirmPassword ? 'error' : ''}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                </div>

                {/* Terms and Conditions */}
                <div className="form-group full-width">
                  <div className="terms-container">
                    <label className="terms-label">
                      <input
                        type="checkbox"
                        name="agreedToTerms"
                        checked={formData.agreedToTerms}
                        onChange={handleInputChange}
                        className={errors.agreedToTerms ? 'error' : ''}
                      />
                      <span>I agree to the Terms and Conditions *</span>
                    </label>
                    {errors.agreedToTerms && <span className="error-text">{errors.agreedToTerms}</span>}
                    
                    <div className="terms-content">
                      <p><strong>Afriagrifed Terms and Conditions</strong></p>
                      <p>Afriagrifed is committed to fighting food insecurity by creating genuine connections between farmers and consumers. By creating an account, you agree to:</p>
                      <ul>
                        <li>Use the platform for its intended purpose of agricultural commerce and community building</li>
                        <li>Provide accurate and truthful information about your identity and business</li>
                        <li>Engage in ethical business practices with all platform users</li>
                        <li>Not engage in any fraudulent activities, scams, or misrepresentation</li>
                        <li>Understand that Afriagrifed has a zero-tolerance policy for fraudulent behavior</li>
                      </ul>
                      <p><strong>Legal Compliance:</strong> You acknowledge that any fraudulent activities, scams, or attempts to deceive other users will result in immediate account suspension and may be reported to relevant law enforcement authorities. Afriagrifed reserves the right to cooperate fully with legal investigations and pursue criminal charges against individuals who misuse the platform.</p>
                      <p><strong>Platform Mission:</strong> We are building a trusted community dedicated to sustainable agriculture and food security. Your commitment to honesty and integrity helps us achieve this mission.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={handleBack}>
                  Back to Home
                </button>
                <button className="btn-primary" onClick={handleNext}>
                  Continue to Farm Information
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Farm Information */}
          {currentStep === 2 && (
            <div className="form-phase">
              <h2>Farm Information</h2>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Farm/Business Name *</label>
                  <input
                    type="text"
                    name="farmName"
                    value={formData.farmName}
                    onChange={handleInputChange}
                    className={errors.farmName ? 'error' : ''}
                    placeholder="Enter your farm or business name"
                  />
                  {errors.farmName && <span className="error-text">{errors.farmName}</span>}
                </div>

                <div className="form-group">
                  <label>Type of Farming *</label>
                  <select
                    name="farmingType"
                    value={formData.farmingType}
                    onChange={handleInputChange}
                    className={errors.farmingType ? 'error' : ''}
                  >
                    <option value="">Select Type</option>
                    <option value="animal">Animal Farming</option>
                    <option value="crops">Crop Farming</option>
                    <option value="both">Both Animal and Crops</option>
                  </select>
                  {errors.farmingType && <span className="error-text">{errors.farmingType}</span>}
                </div>

                <div className="form-group">
                  <label>Business Age *</label>
                  <select
                    name="businessAge"
                    value={formData.businessAge}
                    onChange={handleInputChange}
                    className={errors.businessAge ? 'error' : ''}
                  >
                    <option value="">Select Age</option>
                    <option value="0-1">0-1 years</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5+">5+ years</option>
                  </select>
                  {errors.businessAge && <span className="error-text">{errors.businessAge}</span>}
                </div>

                <div className="form-group">
                  <label>Farm Scale *</label>
                  <select
                    name="farmScale"
                    value={formData.farmScale}
                    onChange={handleInputChange}
                    className={errors.farmScale ? 'error' : ''}
                  >
                    <option value="">Select Scale</option>
                    <option value="small">Small Scale</option>
                    <option value="medium">Medium Scale</option>
                    <option value="large">Large Scale</option>
                  </select>
                  {errors.farmScale && <span className="error-text">{errors.farmScale}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Business Email *</label>
                  <input
                    type="email"
                    name="businessEmail"
                    value={formData.businessEmail}
                    onChange={handleInputChange}
                    className={errors.businessEmail ? 'error' : ''}
                    placeholder="your.business@example.com"
                  />
                  {errors.businessEmail && <span className="error-text">{errors.businessEmail}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Location *</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                    className={errors.location ? 'error' : ''}
                  />
                  {errors.location && <span className="error-text">{errors.location}</span>}
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button className="btn-primary" onClick={handleNext}>
                  Continue to Document Upload
                </button>
              </div>
            </div>
          )}

          {/* Phase 3: Document Upload */}
          {currentStep === 3 && (
            <div className="form-phase">
              <h2>Document Verification</h2>
              <p className="phase-description">
                Upload the required documents to complete your registration and get full access to all features.
              </p>

              {/* Verification Timeline */}
              <div className="verification-timeline">
                <div className="timeline-item">
                  <div className="timeline-icon">
                    <div className="icon-document">DOC</div>
                  </div>
                  <div className="timeline-content">
                    <h4>Document Submission</h4>
                    <p>Upload all required documents below</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-icon">
                    <div className="icon-review">REV</div>
                  </div>
                  <div className="timeline-content">
                    <h4>Under Review (24 Hours)</h4>
                    <p>Our team will verify your documents within 24 hours</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-icon">
                    <div className="icon-verified">VER</div>
                  </div>
                  <div className="timeline-content">
                    <h4>Account Fully Verified</h4>
                    <p>Complete access to all platform features</p>
                  </div>
                </div>
              </div>

              <div className="document-grid">
                <div className="document-group">
                  <label>Personal ID *</label>
                  <p className="document-hint">Government issued ID (Passport, Driver's License, etc.)</p>
                  <input
                    type="file"
                    name="personalId"
                    onChange={handleInputChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={errors.personalId ? 'error' : ''}
                  />
                  {errors.personalId && <span className="error-text">{errors.personalId}</span>}
                  {formData.userType === "educator" && (
  <div className="document-group full-width">
    <label>Degree / Certification *</label>
    <p className="document-hint">Upload your academic proof</p>
    <input
      type="file"
      name="educatorCertificate"
      onChange={handleInputChange}
      accept=".pdf,.jpg,.jpeg,.png"
      className={errors.educatorCertificate ? 'error' : ''}
    />
    {errors.educatorCertificate && (
      <span className="error-text">{errors.educatorCertificate}</span>
    )}
  </div>
)}

                </div>

                <div className="document-group">
                  <label>Proof of Registration *</label>
                  <p className="document-hint">Business registration document</p>
                  <input
                    type="file"
                    name="proofOfRegistration"
                    onChange={handleInputChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={errors.proofOfRegistration ? 'error' : ''}
                  />
                  {errors.proofOfRegistration && <span className="error-text">{errors.proofOfRegistration}</span>}
                </div>

                <div className="document-group">
                  <label>Business Certificate *</label>
                  <p className="document-hint">Official business certification</p>
                  <input
                    type="file"
                    name="businessCertificate"
                    onChange={handleInputChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={errors.businessCertificate ? 'error' : ''}
                  />
                  {errors.businessCertificate && <span className="error-text">{errors.businessCertificate}</span>}
                </div>

                <div className="document-group">
                  <label>Last Month Bank Statement *</label>
                  <p className="document-hint">Business bank statement</p>
                  <input
                    type="file"
                    name="bankStatement"
                    onChange={handleInputChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={errors.bankStatement ? 'error' : ''}
                  />
                  {errors.bankStatement && <span className="error-text">{errors.bankStatement}</span>}
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <div className="completion-options">
                  <button 
                    className="btn-outline" 
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                  >
                    Register as Pending
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                  >
                    Complete Registration
                  </button>
                </div>
              </div>

              <div className="registration-note">
                <p><strong>Note:</strong> Your documents will be reviewed within 24 hours. Once verified, your account will have full access to all platform features. Registering as pending gives limited access until verification is complete.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
