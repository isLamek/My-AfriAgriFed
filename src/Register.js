import React, { useState } from "react";
import "./Register.css";

import appIcon from "./images/seed-mark.png";
import { auth, db } from "./firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import FarmerQuestionnaire from "./FarmerQuestionnaire";
import ConsumerQuestionnaire from './ConsumerQuestionnaire';
import InstitutionQuestionnaire from "./InstitutionQuestionnaire";
import { Link, useNavigate } from "react-router-dom";
import { BUSINESS } from "./business";
import { ageOn } from "./registrationRules";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import { sendVerification } from "./emailVerification";
import { friendlyAuthError } from "./authErrors";



import { checkFile, uploadDocumentToCloudinary } from "./cloudinaryUpload";



// Where each verification document is stored in Cloudinary.
const DOCUMENT_FOLDERS = {
  personalId: "personal_id",
  proofOfRegistration: "proof_of_registration",
  businessCertificate: "business_certificate",
  bankStatement: "bank_statement",
  educatorCertificate: "educator_certificate",
};

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
    buyerType: "Individual Buyer",
    businessName: "",
    
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
    window.location.href = `mailto:${BUSINESS.email}`;
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
    else if (ageOn(formData.dob) < 18) newErrors.dob = "You must be 18 or older to create an account.";
    if (formData.userType === "consumer" && formData.buyerType !== "Individual Buyer" && !formData.businessName.trim()) {
      newErrors.businessName = "Enter the name of your business or organisation";
    }
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
      newErrors.agreedToTerms = "Please agree to the Terms of service and Privacy policy to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validatePhase1()) return;

      // For Consumers: Skip to document upload or handle differently
      // Buyers need no documents: create the account straight away. Business
      // buyers (shops, restaurants, schools) are marked as organisations.
      if (formData.userType === "consumer") {
        await handleSubmit(true, {
          consumerType: formData.buyerType,
          businessName: formData.buyerType === "Individual Buyer" ? "" : formData.businessName.trim(),
        });
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

const handleSubmit = async (completeRegistration = false, extraQuestionnaire = null) => {
  if (isSubmitting) return;

  // Check every file before creating the account, so a wrong file type never
  // leaves a half-made account behind.
  try {
    Object.keys(DOCUMENT_FOLDERS).forEach((field) => formData[field] && checkFile(formData[field], "document"));
  } catch (error) {
    toast.error(error.message);
    return;
  }

  const questionnaire = extraQuestionnaire ? { ...questionnaireData, ...extraQuestionnaire } : questionnaireData;
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

    // Ask them to verify the address (never blocks registration if it fails).
    sendVerification(user);

    // Posts/comments/listings elsewhere fall back to auth.currentUser's
    // displayName (and to the account email when it's unset) rather than
    // an extra Firestore read per author - set it here so it's never blank.
    await updateProfile(user, {
      displayName: `${formData.firstName} ${formData.lastName}`.trim(),
    }).catch(() => {});

    // 3️⃣ File → folder mapping
    const fileMap = DOCUMENT_FOLDERS;

    const documentUrls = {};
    const uploadPromises = [];

    Object.entries(fileMap).forEach(([field, folder]) => {
      const file = formData[field];
      if (!file) return;

      uploadPromises.push(
        uploadDocumentToCloudinary(
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
    // Consumer accounts capture a business type in their questionnaire
    // (Retailer/Wholesaler/Processor/Restaurant/NGO vs. Individual Buyer) -
    // anything but "Individual Buyer" is an organization (supermarkets,
    // cooperatives, food processors, etc.), not an individual end-consumer,
    // even though they share the same account type and approval flow.
    const isOrganization =
      formData.userType === "consumer" &&
      !!questionnaire.consumerType &&
      questionnaire.consumerType !== "Individual Buyer";

    const userData = {
  uid: user.uid,

  userType: formData.userType,
  isOrganization,

  // Approval fields
  approved: false,
  status: "pending",       // pending | approved | rejected

  personalInfo: {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.personalEmail,
    dob: formData.dob,
    // Optional: only stored when the person chose to give them.
    ...(formData.nationality.trim() ? { nationality: formData.nationality.trim() } : {}),
    ...(formData.gender ? { gender: formData.gender } : {}),
  },

  accountStatus: {
    registrationStatus: "pending",
    documentStatus:
      formData.userType === "consumer"
        ? "not_required"
        : "submitted",
  },

  questionnaireData: questionnaire,
  agreedToTermsAt: new Date().toISOString(),

  documents: documentUrls,

  createdAt: serverTimestamp(),
  reviewedAt: null,
  reviewedBy: null
};
    // 5️⃣ Save to Firestore
    await setDoc(doc(db, "users", user.uid), userData);

    logTelemetryEvent(TELEMETRY_EVENTS.SIGN_UP, { userType: formData.userType });

    if (formData.userType === "consumer") {
      toast.success("Welcome to AfriAgriFed! Check your e-mail to verify your address.");
      navigate("/dashboard");
    } else {
      toast.success("Thank you. Your documents are with our team; you can sign in once your account is approved.");
      handleHomeClick();
    }

  } catch (error) {
    console.error("Registration failed:", error);

    // Optional rollback (recommended)
    if (user) {
      await user.delete().catch(() => {});
    }

    toast.error(friendlyAuthError(error, "Registration failed. Please check your details and try again."));
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
            Sign in
          </button>
          <button className="nav-btn primary" onClick={handleContactClick}>
            Contact us
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

          <h1 className="register-title">Create your account</h1>

          {/* Show progress steps only if not in questionnaire */}
          {currentStep !== "questionnaire" && renderProgressSteps()}

          {/* Phase 1: Personal Information */}
          {currentStep === 1 && (
            <div className="form-phase">
              <h2>Personal Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="reg-firstName">First name</label>
                  <input
                    id="reg-firstName"
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
                  <label htmlFor="reg-lastName">Last name</label>
                  <input
                    id="reg-lastName"
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
                  <label htmlFor="reg-dob">Date of birth</label>
                  <input
                    id="reg-dob"
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className={errors.dob ? 'error' : ''}
                  />
                  {errors.dob && <span className="error-text">{errors.dob}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-nationality">Nationality <span className="optional">(optional)</span></label>
                  <input
                    id="reg-nationality"
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
                  <label htmlFor="reg-gender">Gender <span className="optional">(optional)</span></label>
                  <select
                    id="reg-gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={errors.gender ? 'error' : ''}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <span className="error-text">{errors.gender}</span>}
                </div>
                <div className="form-group full-width">
                  <label htmlFor="reg-userType">I am joining as</label>
                  <select
                    id="reg-userType"
                    name="userType"
                    value={formData.userType}
                    onChange={handleInputChange}
                    className={errors.userType ? 'error' : ''}
                  >
                    <option value="">Choose one</option>
                    <option value="consumer">A buyer (a person, shop, restaurant, school or other business)</option>
                    <option value="farmer">A producer (farmer or grower who sells)</option>
                    <option value="institution">A tertiary institution (research and training)</option>
                  </select>
                  <span className="field-hint">
                    {formData.userType === "farmer"
                      ? "Producers answer a short questionnaire and upload documents so we can verify them before they sell."
                      : formData.userType === "institution"
                      ? "Institutions answer a short questionnaire and upload proof of accreditation before they publish."
                      : formData.userType === "consumer"
                      ? "Buyers can start straight away. No documents needed."
                      : ""}
                  </span>
                  {errors.userType && <span className="error-text">{errors.userType}</span>}
                </div>

                {formData.userType === "consumer" && (
                  <>
                    <div className="form-group">
                      <label htmlFor="reg-buyerType">Buying as</label>
                      <select id="reg-buyerType" name="buyerType" value={formData.buyerType} onChange={handleInputChange}>
                        <option value="Individual Buyer">An individual</option>
                        <option value="Retailer">A shop or supermarket</option>
                        <option value="Restaurant">A restaurant, hotel or caterer</option>
                        <option value="School / Institution">A school, hospital or other institution</option>
                        <option value="Processor">A food processor</option>
                        <option value="Wholesaler">A wholesaler or trader</option>
                        <option value="NGO">An NGO or relief programme</option>
                      </select>
                    </div>
                    {formData.buyerType !== "Individual Buyer" && (
                      <div className="form-group">
                        <label htmlFor="reg-businessName">Business or organisation name</label>
                        <input
                          id="reg-businessName"
                          type="text"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleInputChange}
                          className={errors.businessName ? "error" : ""}
                          autoComplete="organization"
                        />
                        {errors.businessName && <span className="error-text">{errors.businessName}</span>}
                      </div>
                    )}
                  </>
                )}

                <div className="form-group full-width">
                  <label htmlFor="reg-personalEmail">E-mail address</label>
                  <input
                    id="reg-personalEmail"
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
                  <label htmlFor="reg-password">Password</label>
                  <input
                    id="reg-password"
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
                  <label htmlFor="reg-confirmPassword">Confirm password</label>
                  <input
                    id="reg-confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={errors.confirmPassword ? 'error' : ''}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                </div>

                <div className="form-group full-width">
                  <div className="terms-container">
                    <label className="terms-label" htmlFor="reg-agreedToTerms">
                      <input
                        id="reg-agreedToTerms"
                        type="checkbox"
                        name="agreedToTerms"
                        checked={formData.agreedToTerms}
                        onChange={handleInputChange}
                        className={errors.agreedToTerms ? 'error' : ''}
                      />
                      <span>
                        I have read and agree to the{" "}
                        <Link to="/terms" target="_blank" rel="noopener">Terms of service</Link> and the{" "}
                        <Link to="/privacy" target="_blank" rel="noopener">Privacy policy</Link>.
                      </span>
                    </label>
                    {errors.agreedToTerms && <span className="error-text">{errors.agreedToTerms}</span>}
                    <p className="terms-summary">
                      In short: you must be 18 or older and give true information. Fraud, scams and false listings lead to
                      suspension and may be reported to the police. We never sell your data, and you can ask us to delete
                      your account at any time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={handleBack}>
                  Back to Home
                </button>
                <button className="btn-primary" onClick={handleNext} disabled={isSubmitting}>
                  {formData.userType === "consumer"
                    ? isSubmitting ? "Creating your account…" : "Create account"
                    : formData.userType === "farmer"
                    ? "Continue to producer questions"
                    : formData.userType === "institution"
                    ? "Continue to institution questions"
                    : "Continue"}
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
                  : ""}
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
                    <h4>Review by our team</h4>
                    <p>We check your documents against the details you gave us</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-icon">
                    <div className="icon-verified">VER</div>
                  </div>
                  <div className="timeline-content">
                    <h4>Approved</h4>
                    <p>Sign in and start {formData.userType === "institution" ? "publishing" : "selling"}</p>
                  </div>
                </div>
              </div>

              <div className="document-grid">
                {/* Personal ID - Required for all */}
                <div className="document-group">
                  <label htmlFor="reg-personalId">Personal ID</label>
                  <p className="document-hint">Government issued ID (Passport, Driver's License, etc.)</p>
                  <input
                    id="reg-personalId"
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
                      <label htmlFor="reg-proofOfRegistration">Proof of Registration</label>
                      <p className="document-hint">Business registration document</p>
                      <input
                        id="reg-proofOfRegistration"
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
                      <label htmlFor="reg-businessCertificate">Business Certificate</label>
                      <p className="document-hint">Official business certification</p>
                      <input
                        id="reg-businessCertificate"
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
                      <label htmlFor="reg-bankStatement">Last Month Bank Statement</label>
                      <p className="document-hint">Business bank statement</p>
                      <input
                        id="reg-bankStatement"
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
                    <label htmlFor="reg-educatorCertificate">Institution Certificate/Degree</label>
                    <p className="document-hint">Upload your academic institution proof</p>
                    <input
                      id="reg-educatorCertificate"
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
                <p>
                  <strong>What happens next:</strong> our team reviews your documents. You can sign in as soon as your account is
                  approved. Questions? E-mail <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. Your documents are used
                  only to verify your account; see the <Link to="/privacy">Privacy policy</Link>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
