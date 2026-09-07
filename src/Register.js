import React, { useState } from "react";
import "./Register.css";

import appIcon from "./images/seed-mark.png";
import { auth, db } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import FarmerQuestionnaire from "./FarmerQuestionnaire";
import ConsumerQuestionnaire from './ConsumerQuestionnaire';
import InstitutionQuestionnaire from "./InstitutionQuestionnaire";
import { useNavigate } from "react-router-dom";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";


import {
  ref,
  push,
  set
} from "firebase/database";

import {
  database
} from "./firebaseConfig";

import { uploadToCloudinary }
from "./cloudinairyUpload";



export default function Register({ onBackToHome, onNavigateToSignIn }) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Phase 1: Personal Information (for all users)
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
    
    // Phase 2: Will be different based on userType
    // For Farmers: Stored in questionnaireData
    // For Consumers: Will be in consumerData
    // For Institutions: Will be in institutionData
    
    // Phase 3: Documents
    personalId: null,
    proofOfRegistration: null,
    businessCertificate: null,
    bankStatement: null,
    educatorCertificate: null,
  });

  const [questionnaireData, setQuestionnaireData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Navigation handlers
  const handleHomeClick = () => {
    navigate("/");
    // onNavigate("home");
  };

  const handleSignInClick = () => {
    navigate("/signin");
    // onNavigate("signin");
  };

  const handleContactClick = () => {
    toast("Contact page coming soon!");
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

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validatePhase1()) return;

      // For Consumers: Skip to document upload or handle differently
      if (formData.userType === "consumer") {
        // Consumers might not need document upload, so we could submit directly
        // Or they might have a simpler questionnaire
        // For now, let's go to document upload
        setCurrentStep(3);
        return;
      }

      // For Farmers and Institutions: Go to questionnaire
      if (formData.userType === "farmer" || formData.userType === "institution") {
        setCurrentStep("questionnaire");
        return;
      }
    } 
  };

  const handleBack = () => {
    if (currentStep === 1) {
      handleHomeClick();
    } else if (currentStep === "questionnaire") {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      if (formData.userType === "farmer" || formData.userType === "institution") {
        setCurrentStep("questionnaire");
      } else {
        setCurrentStep(1);
      }
    }
  };

  const handleQuestionnaireComplete = (data) => {
    setQuestionnaireData(data);
    setCurrentStep(3); // Go to document upload
  };

const handleSubmit = async (completeRegistration = false) => {
  if (isSubmitting) return;
  setIsSubmitting(true);

  let user = null;

  try {
    // 1️⃣ Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.personalEmail,
      formData.password
    );

    user = userCredential.user;

    // 2️⃣ File validation
    const validateFile = (file) => {
      const allowedTypes = [
  "application/pdf",

  "image/jpeg",
  "image/png",
  "image/jpg",

  "application/msword",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

      const maxSize = 20 * 1024 * 1024;

      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type: ${file.name}`);
      }

      if (file.size > maxSize) {
        throw new Error(`File too large (max 20MB): ${file.name}`);
      }
    };

    // 3️⃣ File → folder mapping
    const fileMap = {
      personalId: "personal_id",
      proofOfRegistration: "proof_of_registration",
      businessCertificate: "business_certificate",
      bankStatement: "bank_statement",
      educatorCertificate: "educator_certificate",
    };

    const documentUrls = {};
    const uploadPromises = [];

    Object.entries(fileMap).forEach(([field, folder]) => {
      const file = formData[field];
      if (!file) return;

      validateFile(file);

      uploadPromises.push(
        uploadToCloudinary(
          file,
          `afriagrifed/users/${user.uid}/${folder}`
        ).then((upload) => {
          documentUrls[field] = {
  url: upload.secure_url,
  publicId: upload.public_id,
  fileType: file.type,
  fileName: file.name
};
        })
      );
    });

    await Promise.all(uploadPromises);

    // 4️⃣ Build Firestore document
    const userData = {
  uid: user.uid,

  userType: formData.userType,

  // Approval fields
  approved: false,
  status: "pending",       // pending | approved | rejected

  personalInfo: {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.personalEmail,
    dob: formData.dob,
    nationality: formData.nationality,
    gender: formData.gender,
  },

  accountStatus: {
    registrationStatus: "pending",
    documentStatus:
      formData.userType === "consumer"
        ? "not_required"
        : "submitted",
  },

  questionnaireData,

  documents: documentUrls,

  createdAt: serverTimestamp(),
  reviewedAt: null,
  reviewedBy: null
};
    // 5️⃣ Save to Firestore
    await setDoc(doc(db, "users", user.uid), userData);

    logTelemetryEvent(TELEMETRY_EVENTS.SIGN_UP, { userType: formData.userType });

    toast.success("Registration successful!");
    handleHomeClick();

  } catch (error) {
    console.error("Registration failed:", error);

    // Optional rollback (recommended)
    if (user) {
      await user.delete().catch(() => {});
    }

    toast.error(error.message || "Registration failed");
  } finally {
    setIsSubmitting(false);
  }
};


  const renderProgressSteps = () => {
    const steps = [
      { number: 1, label: 'Personal Info' },
      { number: 2, label: formData.userType === "farmer" ? "Farm Info" : 
                        formData.userType === "institution" ? "Institution Info" : 
                        formData.userType === "consumer" ? "Consumer Info" : "Additional Info" },
      { number: 3, label: 'Documents' }
    ];

    return (
      <div className="progress-steps">
        {steps.map(step => {
          let stepStatus = "";
          const stepNumber = step.number;
          
          // Determine current step status
          if (currentStep === "questionnaire" && stepNumber === 2) {
            stepStatus = "active";
          } else if (typeof currentStep === "number" && currentStep === stepNumber) {
            stepStatus = "active";
          } else if (
            (currentStep === "questionnaire" && stepNumber < 2) ||
            (typeof currentStep === "number" && currentStep > stepNumber)
          ) {
            stepStatus = "completed";
          }

          return (
            <div key={step.number} className={`step ${stepStatus}`}>
              <div className="step-number">{step.number}</div>
              <div className="step-label">{step.label}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render the appropriate questionnaire based on user type** (Event Handler typa thing)
 const renderQuestionnaire = () => {
  switch (formData.userType) {
    case "farmer":
      return (
        <FarmerQuestionnaire
          onComplete={handleQuestionnaireComplete}
          onBack={() => setCurrentStep(1)}
          initialData={questionnaireData}
        />
      );

    case "consumer":
      return (
        <ConsumerQuestionnaire
          onComplete={handleQuestionnaireComplete}
          onBack={() => setCurrentStep(1)}
          initialData={questionnaireData}
        />
      );

    case "institution":
      return (
        <InstitutionQuestionnaire
          onComplete={handleQuestionnaireComplete}
          onBack={() => setCurrentStep(1)}
          initialData={questionnaireData}
        />
      );

    default:
      return null;
  }
};




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
            <img src={appIcon} alt="AfriAgriFed" />
            <span className="register-brand">AfriAgriFed</span>
          </div>

          <h1 className="register-title">Create Your Account</h1>

          {/* Show progress steps only if not in questionnaire */}
          {currentStep !== "questionnaire" && renderProgressSteps()}

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
                    <option value="consumer">Consumer</option>
                    <option value="farmer">Farmer</option>
                    <option value="institution">Tertiary Institution</option>
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

                {/* Updated Terms and Conditions from PDF */}
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
                      <p>Afriagrifed is committed to fighting food insecurity by creating genuine connections between farmers, consumers and education. By creating an account, you agree to:</p>
                      <ul>
                        <li>Use the platform for its intended purpose of agricultural commerce and fighting food insecurity.</li>
                        <li>Perform all transactions on the platform for capturing agricultural realistic data and to avoid scams.</li>
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
                  Continue to {formData.userType === "consumer" ? "Registration" : 
                              formData.userType === "farmer" ? "Farmer Questionnaire" : 
                              formData.userType === "institution" ? "Institution Questionnaire" : 
                              "Next Step"}
                </button>
              </div>
            </div>
          )}

          {/* Questionnaire Phase - Dynamic based on user type */}
          {currentStep === "questionnaire" && renderQuestionnaire()}

          {/* Phase 3: Document Upload */}
          {currentStep === 3 && (
            <div className="form-phase">
              <h2>Document Verification</h2>
              
              <p className="phase-description">
                {formData.userType === "farmer" 
                  ? "Upload the required documents to complete your farmer registration and get full access to all features."
                  : formData.userType === "institution"
                  ? "Upload the required documents to complete your institution registration."
                  : "Upload documents for verification (optional for consumers)."}
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
                {/* Personal ID - Required for all */}
                <div className="document-group">
                  <label>Personal ID {formData.userType !== "consumer" ? "*" : ""}</label>
                  <p className="document-hint">Government issued ID (Passport, Driver's License, etc.)</p>
                  <input
                    type="file"
                    name="personalId"
                    onChange={handleInputChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={errors.personalId ? 'error' : ''}
                  />
                  {formData.personalId && (
  <p className="selected-file">
    {formData.personalId.name}
  </p>
)}
                  {errors.personalId && <span className="error-text">{errors.personalId}</span>}
                </div>

                {/* Additional documents based on user type */}
                {formData.userType === "farmer" && (
                  <>
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
                      {formData.proofOfRegistration && (
  <p className="selected-file">
    {formData.proofOfRegistration.name}
  </p>
)}
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
                      {formData.businessCertificate && (
  <p className="selected-file">
    {formData.businessCertificate.name}
  </p>
)}
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
                      {formData.bankStatement && (
  <p className="selected-file">
    {formData.bankStatement.name}
  </p>
)}
                      {errors.bankStatement && <span className="error-text">{errors.bankStatement}</span>}
                    </div>
                  </>
                )}

                {formData.userType === "institution" && (
                  <div className="document-group full-width">
                    <label>Institution Certificate/Degree *</label>
                    <p className="document-hint">Upload your academic institution proof</p>
                    <input
                      type="file"
                      name="educatorCertificate"
                      onChange={handleInputChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className={errors.educatorCertificate ? 'error' : ''}
                    />
                    {formData.educatorCertificate && (
  <p className="selected-file">
    {formData.educatorCertificate.name}
  </p>
)}

                    {errors.educatorCertificate && (
                      <span className="error-text">{errors.educatorCertificate}</span>
                    )}
                  </div>
                )}

                {/* For consumers, document upload is optional */}
                {formData.userType === "consumer" && (
                  <div className="document-group">
                    <label>Additional Verification (Optional)</label>
                    <p className="document-hint">Any additional documents for verification</p>
                    <input
                      type="file"
                      name="proofOfRegistration"
                      onChange={handleInputChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <div className="completion-options">
                 {formData.userType === "consumer" ? (
  <button
    className="btn-primary"
    onClick={() => handleSubmit(true)}
    disabled={isSubmitting}
  >
    {isSubmitting ? "Registering..." : "Complete Registration"}
  </button>
) : (
  <button
    className="btn-primary"
    onClick={() => handleSubmit(false)}
    disabled={isSubmitting}
  >
    {isSubmitting ? "Submitting..." : "Submit for Verification"}
  </button>
)}
                </div>
              </div>

              <div className="registration-note">
                <p><strong>Note:</strong> 
                  {formData.userType === "farmer" 
                    ? " Your documents will be reviewed within 24 hours. Once verified, your account will have full access to all platform features. Registering as pending gives limited access until verification is complete."
                    : formData.userType === "institution"
                    ? " Your institution documents will be verified within 24 hours. Full access to educational and research features will be granted upon verification."
                    : " Document verification is optional for consumers. Your account will be active immediately."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
