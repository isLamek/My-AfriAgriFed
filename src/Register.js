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
import { ageOn } from "./registrationRules";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";
import toast from "react-hot-toast";
import { sendVerification } from "./emailVerification";
import { friendlyAuthError } from "./authErrors";


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
import { t, tRich, LanguageSwitcher } from "./i18n";



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
    toast(t("register.contactPageComingSoon"));
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
    
    if (!formData.userType) newErrors.userType = t("register.pleaseSelectYourAccountType");
    if (!formData.firstName.trim()) newErrors.firstName = t("register.firstNameIsRequired");
    if (!formData.lastName.trim()) newErrors.lastName = t("register.lastNameIsRequired");
    if (!formData.dob) newErrors.dob = t("register.dateOfBirthIsRequired");
    else if (ageOn(formData.dob) < 18) newErrors.dob = t("register.youMustBe18OrOlder");
    if (!formData.nationality.trim()) newErrors.nationality = t("register.nationalityIsRequired");
    if (!formData.gender) newErrors.gender = t("register.genderIsRequired");
    if (!formData.personalEmail.trim()) {
      newErrors.personalEmail = t("register.personalEmailIsRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.personalEmail)) {
      newErrors.personalEmail = t("register.personalEmailIsInvalid");
    }
    if (!formData.password) {
      newErrors.password = t("register.passwordIsRequired");
    } else if (formData.password.length < 6) {
      newErrors.password = t("register.passwordMustBeAtLeast6");
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t("register.passwordsDoNotMatch");
    }
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms = t("register.pleaseAgreeToTheTermsOf");
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

    // Ask them to verify the address (never blocks registration if it fails).
    sendVerification(user);

    // Posts/comments/listings elsewhere fall back to auth.currentUser's
    // displayName (and to the account email when it's unset) rather than
    // an extra Firestore read per author - set it here so it's never blank.
    await updateProfile(user, {
      displayName: `${formData.firstName} ${formData.lastName}`.trim(),
    }).catch(() => {});

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
        throw new Error(t("register.invalidFileType", { name: file.name }));
      }

      if (file.size > maxSize) {
        throw new Error(t("register.fileTooLarge", { name: file.name }));
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
    // Consumer accounts capture a business type in their questionnaire
    // (Retailer/Wholesaler/Processor/Restaurant/NGO vs. Individual Buyer) -
    // anything but "Individual Buyer" is an organization (supermarkets,
    // cooperatives, food processors, etc.), not an individual end-consumer,
    // even though they share the same account type and approval flow.
    const isOrganization =
      formData.userType === "consumer" &&
      !!questionnaireData.consumerType &&
      questionnaireData.consumerType !== "Individual Buyer";

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
    agreedToTermsAt: new Date().toISOString(),
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

    toast.success(t("register.registrationSuccessful"));
    handleHomeClick();

  } catch (error) {
    console.error("Registration failed:", error);

    // Optional rollback (recommended)
    if (user) {
      await user.delete().catch(() => {});
    }

    toast.error(friendlyAuthError(error, t("register.failed")));
  } finally {
    setIsSubmitting(false);
  }
};


  const renderProgressSteps = () => {
    const steps = [
      { number: 1, label: t("register.stepPersonal") },
      { number: 2, label: formData.userType === "farmer" ? t("register.stepFarm") : 
                        formData.userType === "institution" ? t("register.stepInstitution") : 
                        formData.userType === "consumer" ? t("register.stepConsumer") : t("register.stepAdditional") },
      { number: 3, label: t("register.stepDocuments") }
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
          <LanguageSwitcher tone="dark" />
          <button className="nav-btn" onClick={handleHomeClick}>
            {t("register.home")}
          </button>
          <button className="nav-btn" onClick={handleSignInClick}>
            {t("common.signIn")}
          </button>
          <button className="nav-btn primary" onClick={handleContactClick}>
            {t("register.contactUs")}
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

          <h1 className="register-title">{t("register.createYourAccount")}</h1>

          {/* Show progress steps only if not in questionnaire */}
          {currentStep !== "questionnaire" && renderProgressSteps()}

          {/* Phase 1: Personal Information */}
          {currentStep === 1 && (
            <div className="form-phase">
              <h2>{t("register.personalInformation")}</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>{t("register.firstName")}</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={errors.firstName ? 'error' : ''}
                    placeholder={t("register.enterYourFirstName")}
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label>{t("register.lastName")}</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={errors.lastName ? 'error' : ''}
                    placeholder={t("register.enterYourLastName")}
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>

                <div className="form-group">
                  <label>{t("register.dateOfBirth")}</label>
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
                  <label>{t("register.nationality")}</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className={errors.nationality ? 'error' : ''}
                    placeholder={t("register.yourNationality")}
                  />
                  {errors.nationality && <span className="error-text">{errors.nationality}</span>}
                </div>

                <div className="form-group">
                  <label>{t("register.gender")}</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={errors.gender ? 'error' : ''}
                  >
                    <option value="">{t("register.selectGender")}</option>
                    <option value="male">{t("register.male")}</option>
                    <option value="female">{t("register.female")}</option>
                    <option value="other">{t("register.other")}</option>
                  </select>
                  {errors.gender && <span className="error-text">{errors.gender}</span>}
                </div>
                <div className="form-group full-width">
                  <label>{t("register.accountType")}</label>
                  <select
                    name="userType"
                    value={formData.userType}
                    onChange={handleInputChange}
                    className={errors.userType ? 'error' : ''}
                  >
                    <option value="">{t("register.selectAccountType")}</option>
                    <option value="consumer">{t("register.consumerOrganizationSupermarketRetailerBuyer")}</option>
                    <option value="farmer">{t("register.farmer")}</option>
                    <option value="institution">{t("register.tertiaryInstitution")}</option>
                  </select>
                  {errors.userType && <span className="error-text">{errors.userType}</span>}
                </div>

                <div className="form-group full-width">
                  <label>{t("register.personalEmail")}</label>
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
                  <label>{t("register.password")}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={errors.password ? 'error' : ''}
                    placeholder={t("register.createPassword")}
                  />
                  {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label>{t("register.confirmPassword")}</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={errors.confirmPassword ? 'error' : ''}
                    placeholder={t("register.confirmYourPassword")}
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
                      <span>
                        {tRich("register.agreeTerms", {
                          terms: <Link to="/terms" target="_blank" rel="noopener">{t("register.termsOfService")}</Link>,
                          privacy: <Link to="/privacy" target="_blank" rel="noopener">{t("register.privacyPolicy")}</Link>,
                        })}
                      </span>
                    </label>
                    {errors.agreedToTerms && <span className="error-text">{errors.agreedToTerms}</span>}
                    
                    <div className="terms-content">
                      <p><strong>{t("register.afriagrifedTermsAndConditions")}</strong></p>
                      <p>{t("register.afriagrifedIsCommittedToFightingFood")}</p>
                      <ul>
                        <li>{t("register.useThePlatformForItsIntended")}</li>
                        <li>{t("register.performAllTransactionsOnThePlatform")}</li>
                      </ul>
                      <p><strong>{t("register.legalComplianceLabel")}</strong> {t("register.legalComplianceText")}</p>
                      <p><strong>{t("register.missionLabel")}</strong> {t("register.missionText")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={handleBack}>
                  {t("register.backToHome")}
                </button>
                <button className="btn-primary" onClick={handleNext}>
                  {formData.userType === "consumer" ? t("register.continueRegistration") : 
                              formData.userType === "farmer" ? t("register.continueFarmer") : 
                              formData.userType === "institution" ? t("register.continueInstitution") : 
                              t("register.continueNext")}
                </button>
              </div>
            </div>
          )}

          {/* Questionnaire Phase - Dynamic based on user type */}
          {currentStep === "questionnaire" && renderQuestionnaire()}

          {/* Phase 3: Document Upload */}
          {currentStep === 3 && (
            <div className="form-phase">
              <h2>{t("register.documentVerification")}</h2>
              
              <p className="phase-description">
                {formData.userType === "farmer" 
                  ? t("register.uploadTheRequiredDocumentsToComplete")
                  : formData.userType === "institution"
                  ? t("register.uploadTheRequiredDocumentsToComplete2")
                  : t("register.uploadDocumentsForVerificationOptionalFor")}
              </p>

              {/* Verification Timeline */}
              <div className="verification-timeline">
                <div className="timeline-item">
                  <div className="timeline-icon">
                    <div className="icon-document">{t("register.doc")}</div>
                  </div>
                  <div className="timeline-content">
                    <h4>{t("register.documentSubmission")}</h4>
                    <p>{t("register.uploadAllRequiredDocumentsBelow")}</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-icon">
                    <div className="icon-review">{t("register.rev")}</div>
                  </div>
                  <div className="timeline-content">
                    <h4>{t("register.underReview24Hours")}</h4>
                    <p>{t("register.ourTeamWillVerifyYourDocuments")}</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-icon">
                    <div className="icon-verified">{t("register.ver")}</div>
                  </div>
                  <div className="timeline-content">
                    <h4>{t("register.accountFullyVerified")}</h4>
                    <p>{t("register.completeAccessToAllPlatformFeatures")}</p>
                  </div>
                </div>
              </div>

              <div className="document-grid">
                {/* Personal ID - Required for all */}
                <div className="document-group">
                  <label>{t("register.personalId")} {formData.userType !== "consumer" ? "*" : ""}</label>
                  <p className="document-hint">{t("register.governmentIssuedIdPassportDriverLicense")}</p>
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
                      <label>{t("register.proofOfRegistration")}</label>
                      <p className="document-hint">{t("register.businessRegistrationDocument")}</p>
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
                      <label>{t("register.businessCertificate")}</label>
                      <p className="document-hint">{t("register.officialBusinessCertification")}</p>
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
                      <label>{t("register.lastMonthBankStatement")}</label>
                      <p className="document-hint">{t("register.businessBankStatement")}</p>
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
                    <label>{t("register.institutionCertificateDegree")}</label>
                    <p className="document-hint">{t("register.uploadYourAcademicInstitutionProof")}</p>
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
                    <label>{t("register.additionalVerificationOptional")}</label>
                    <p className="document-hint">{t("register.anyAdditionalDocumentsForVerification")}</p>
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
                  {t("common.back")}
                </button>
                <div className="completion-options">
                 {formData.userType === "consumer" ? (
  <button
    className="btn-primary"
    onClick={() => handleSubmit(true)}
    disabled={isSubmitting}
  >
    {isSubmitting ? t("register.registering") : t("register.completeRegistration")}
  </button>
) : (
  <button
    className="btn-primary"
    onClick={() => handleSubmit(false)}
    disabled={isSubmitting}
  >
    {isSubmitting ? t("register.submitting") : t("register.submitForVerification")}
  </button>
)}
                </div>
              </div>

              <div className="registration-note">
                <p><strong>{t("register.note")}</strong> 
                  {formData.userType === "farmer" 
                    ? t("register.yourDocumentsWillBeReviewedWithin")
                    : formData.userType === "institution"
                    ? t("register.yourInstitutionDocumentsWillBeVerified")
                    : t("register.documentVerificationIsOptionalForConsumers")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
