import React, { useState } from "react";
import "./InstitutionQuestionnaire.css";

export default function InstitutionQuestionnaire({ 
  onComplete, 
  initialData = {}, 
  onBack 
}) {
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState({
    // Section A: Institutional Information
    institutionName: initialData.institutionName || "",
    institutionType: initialData.institutionType || "",
    registrationNumber: initialData.registrationNumber || "",
    yearEstablished: initialData.yearEstablished || "",
    primaryContactPerson: initialData.primaryContactPerson || "",
    contactPersonTitle: initialData.contactPersonTitle || "",
    emailAddress: initialData.emailAddress || "",
    phoneNumber: initialData.phoneNumber || "",
    website: initialData.website || "",

    // Section B: Location Information
    country: initialData.country || "",
    provinceRegion: initialData.provinceRegion || "",
    districtCounty: initialData.districtCounty || "",
    cityTown: initialData.cityTown || "",
    campusBranchName: initialData.campusBranchName || "",
    gpsCoordinates: initialData.gpsCoordinates || "",

    // Section C: Agricultural Qualifications & Programs
    agriculturalPrograms: initialData.agriculturalPrograms || [],
    shortCourses: initialData.shortCourses || "",
    registeredStudents: initialData.registeredStudents || {
      firstYear: "",
      continuing: "",
      graduate: ""
    },
    graduatingStudents: initialData.graduatingStudents || "",

    // Section D: Expertise & Human Resources
    experts: initialData.experts || {
      lecturers: "",
      researchers: "",
      extensionOfficers: "",
      technicalInstructors: ""
    },
    expertiseAreas: initialData.expertiseAreas || [],
    expertAvailability: initialData.expertAvailability || [],

    // Section E: Research Capacity & Needs
    conductsResearch: initialData.conductsResearch || "",
    researchAreas: initialData.researchAreas || "",
    researchProjectsPerYear: initialData.researchProjectsPerYear || "",
    desiredResearchData: initialData.desiredResearchData || [],
    fieldResearchAccess: initialData.fieldResearchAccess || "",
    researchSupportNeeds: initialData.researchSupportNeeds || [],

    // Section F: Training Programs & Outreach
    trainingPrograms: initialData.trainingPrograms || [],
    programsPerYear: initialData.programsPerYear || "",
    targetGroups: initialData.targetGroups || [],

    // Section G: Internships & Practical Training
    internshipsNeeded: initialData.internshipsNeeded || "",
    internshipDuration: initialData.internshipDuration || "",
    internshipAreas: initialData.internshipAreas || [],
    internshipSupport: initialData.internshipSupport || [],

    // Section H: Solutions & Contribution to Agriculture
    challengesCanSolve: initialData.challengesCanSolve || [],
    solutionTypes: initialData.solutionTypes || [],

    // Section I: Additional Information
    hasDemonstrationFarms: initialData.hasDemonstrationFarms || "",
    demonstrationFarmDetails: initialData.demonstrationFarmDetails || "",
    collaborations: initialData.collaborations || [],
    additionalServices: initialData.additionalServices || "",
  });

  const [errors, setErrors] = useState({});

  const sections = [
    "Institutional Information",
    "Location Information",
    "Programs & Qualifications",
    "Expertise & Resources",
    "Research Capacity",
    "Training & Outreach",
    "Internships & Training",
    "Solutions & Contribution",
    "Additional Information"
  ];

  const institutionTypes = [
    "University",
    "College", 
    "Agricultural Training Institute",
    "TVET/Polytechnic",
    "Research Institute",
    "Other"
  ];

  const agriculturalPrograms = [
    "Diploma in Agriculture",
    "Bachelor of Science in Agriculture",
    "Bachelor of Agricultural Economics",
    "Bachelor of Animal Science",
    "Bachelor of Crop Science",
    "Agribusiness Management",
    "Agricultural Extension",
    "Soil Science",
    "Horticulture",
    "Forestry & Environmental Science",
    "Agricultural Engineering",
    "Fisheries & Aquaculture",
    "Veterinary Science",
    "Other"
  ];

  const expertiseAreas = [
    "Crop production",
    "Animal production",
    "Agronomy",
    "Soil fertility and soil science",
    "Pest & disease management",
    "Climate-smart agriculture",
    "Irrigation & water management",
    "Mechanization & farm machinery",
    "Post-harvest handling",
    "Agribusiness & marketing",
    "Agricultural biotechnology",
    "Food science & processing",
    "Economics & policy",
    "Environmental conservation"
  ];

  const expertAvailabilityOptions = [
    "Farmer training",
    "Research collaboration",
    "Field demonstrations",
    "Problem diagnosis (soil, plant, livestock)",
    "Advisory services"
  ];

  const desiredResearchDataTypes = [
    "Farmer production data",
    "Soil and climate data",
    "Market data",
    "Agribusiness performance",
    "Pest and disease prevalence",
    "Consumer trends",
    "Other"
  ];

  const researchSupportOptions = [
    "Farm access",
    "Farmer interviews",
    "Sample collection",
    "On-farm trials"
  ];

  const trainingProgramTypes = [
    "Short farmer workshops",
    "Extension support programs",
    "Digital training (online)",
    "On-farm training demonstrations",
    "Internship and apprenticeship placements",
    "Agribusiness mentorship"
  ];

  const targetGroups = [
    "Farmers",
    "Youth",
    "Women groups",
    "Agribusiness SMEs",
    "Cooperatives"
  ];

  const internshipAreasList = [
    "Crop farming",
    "Livestock farming",
    "Agri-processing",
    "Research labs",
    "Seed companies",
    "Extension offices",
    "Other"
  ];

  const internshipSupportOptions = [
    "Stipend",
    "Accommodation",
    "Mentorship",
    "Field supervision",
    "Safety equipment"
  ];

  const agriculturalChallenges = [
    "Low yields",
    "Soil infertility",
    "Pests & diseases",
    "Climate change adaptation",
    "Post-harvest losses",
    "Limited farmer skills",
    "Agribusiness challenges",
    "Water scarcity",
    "Other"
  ];

  const solutionTypesList = [
    "Research-based recommendations",
    "Training programs",
    "Lab analysis (soil, feed, water, plant samples)",
    "Technology testing",
    "Innovation development",
    "Policy advice"
  ];

  const collaborationPartners = [
    "Government ministries",
    "NGOs",
    "Private sector",
    "Farmer organizations",
    "Donors and research networks"
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === "checkbox") {
      // Handle multiple selection checkboxes
      if (name.includes("agriculturalPrograms") || name.includes("expertiseAreas") ||
          name.includes("expertAvailability") || name.includes("desiredResearchData") ||
          name.includes("researchSupportNeeds") || name.includes("trainingPrograms") ||
          name.includes("targetGroups") || name.includes("internshipAreas") ||
          name.includes("internshipSupport") || name.includes("challengesCanSolve") ||
          name.includes("solutionTypes") || name.includes("collaborations")) {
        
        const fieldName = name.split("-")[0];
        setFormData(prev => {
          const currentArray = prev[fieldName] || [];
          if (checked) {
            return { ...prev, [fieldName]: [...currentArray, value] };
          } else {
            return { ...prev, [fieldName]: currentArray.filter(item => item !== value) };
          }
        });
      } else {
        // Single checkbox
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else if (type === "radio") {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else if (name.includes(".")) {
      // Handle nested object fields (e.g., registeredStudents.firstYear)
      const [parent, child] = name.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateCurrentSection = () => {
    const newErrors = {};
    
    switch(currentSection) {
      case 1:
        if (!formData.institutionName.trim()) newErrors.institutionName = "Institution name is required";
        if (!formData.institutionType) newErrors.institutionType = "Institution type is required";
        if (!formData.primaryContactPerson.trim()) newErrors.primaryContactPerson = "Primary contact person is required";
        if (!formData.contactPersonTitle.trim()) newErrors.contactPersonTitle = "Contact person title is required";
        if (!formData.emailAddress.trim()) {
          newErrors.emailAddress = "Email address is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.emailAddress)) {
          newErrors.emailAddress = "Email address is invalid";
        }
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
        break;
        
      case 2:
        if (!formData.country.trim()) newErrors.country = "Country is required";
        if (!formData.cityTown.trim()) newErrors.cityTown = "City/Town is required";
        break;
        
      case 3:
        if (formData.agriculturalPrograms.length === 0) {
          newErrors.agriculturalPrograms = "Please select at least one agricultural program";
        }
        break;
        
      case 4:
        if (formData.expertiseAreas.length === 0) {
          newErrors.expertiseAreas = "Please select at least one area of expertise";
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentSection()) return;
    
    if (currentSection < sections.length) {
      setCurrentSection(prev => prev + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (currentSection > 1) {
      setCurrentSection(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const renderSection = () => {
    switch(currentSection) {
      case 1:
        return renderSectionA();
      case 2:
        return renderSectionB();
      case 3:
        return renderSectionC();
      case 4:
        return renderSectionD();
      case 5:
        return renderSectionE();
      case 6:
        return renderSectionF();
      case 7:
        return renderSectionG();
      case 8:
        return renderSectionH();
      case 9:
        return renderSectionI();
      default:
        return renderSectionA();
    }
  };

  const renderSectionA = () => (
    <div className="section-container">
      <h2>Section A: Institutional Information</h2>
      
      <div className="form-group">
        <label>1. Name of Institution *</label>
        <input
          type="text"
          name="institutionName"
          value={formData.institutionName}
          onChange={handleInputChange}
          placeholder="Enter full institution name"
          className={errors.institutionName ? 'error' : ''}
        />
        {errors.institutionName && <span className="error-text">{errors.institutionName}</span>}
      </div>

      <div className="form-group">
        <label>2. Type of Institution *</label>
        <div className="radio-group">
          {institutionTypes.map(type => (
            <label key={type} className="radio-label">
              <input
                type="radio"
                name="institutionType"
                value={type}
                checked={formData.institutionType === type}
                onChange={handleInputChange}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
        {errors.institutionType && <span className="error-text">{errors.institutionType}</span>}
      </div>

      <div className="form-group">
        <label>3. Institution Registration/Accreditation Number</label>
        <input
          type="text"
          name="registrationNumber"
          value={formData.registrationNumber}
          onChange={handleInputChange}
          placeholder="Official registration/accreditation number"
        />
      </div>

      <div className="form-group">
        <label>4. Year Established</label>
        <input
          type="number"
          name="yearEstablished"
          value={formData.yearEstablished}
          onChange={handleInputChange}
          placeholder="YYYY"
          min="1800"
          max={new Date().getFullYear()}
        />
      </div>

      <div className="form-group">
        <label>5. Primary Contact Person *</label>
        <input
          type="text"
          name="primaryContactPerson"
          value={formData.primaryContactPerson}
          onChange={handleInputChange}
          placeholder="Full name of primary contact"
          className={errors.primaryContactPerson ? 'error' : ''}
        />
        {errors.primaryContactPerson && <span className="error-text">{errors.primaryContactPerson}</span>}
      </div>

      <div className="form-group">
        <label>6. Position/Title of Contact Person *</label>
        <input
          type="text"
          name="contactPersonTitle"
          value={formData.contactPersonTitle}
          onChange={handleInputChange}
          placeholder="e.g., Dean of Agriculture, Head of Department"
          className={errors.contactPersonTitle ? 'error' : ''}
        />
        {errors.contactPersonTitle && <span className="error-text">{errors.contactPersonTitle}</span>}
      </div>

      <div className="form-group">
        <label>7. Email Address *</label>
        <input
          type="email"
          name="emailAddress"
          value={formData.emailAddress}
          onChange={handleInputChange}
          placeholder="institution.contact@example.com"
          className={errors.emailAddress ? 'error' : ''}
        />
        {errors.emailAddress && <span className="error-text">{errors.emailAddress}</span>}
      </div>

      <div className="form-group">
        <label>8. Phone Number *</label>
        <input
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          placeholder="+264 XX XXX XXXX"
          className={errors.phoneNumber ? 'error' : ''}
        />
        {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
      </div>

      <div className="form-group">
        <label>9. Institution Website (optional)</label>
        <input
          type="url"
          name="website"
          value={formData.website}
          onChange={handleInputChange}
          placeholder="https://www.institution.edu"
        />
      </div>
    </div>
  );

  const renderSectionB = () => (
    <div className="section-container">
      <h2>Section B: Location Information</h2>
      
      <div className="form-group">
        <label>10. Country *</label>
        <input
          type="text"
          name="country"
          value={formData.country}
          onChange={handleInputChange}
          placeholder="e.g., Namibia"
          className={errors.country ? 'error' : ''}
        />
        {errors.country && <span className="error-text">{errors.country}</span>}
      </div>

      <div className="form-group">
        <label>11. Province/Region</label>
        <input
          type="text"
          name="provinceRegion"
          value={formData.provinceRegion}
          onChange={handleInputChange}
          placeholder="e.g., Khomas Region"
        />
      </div>

      <div className="form-group">
        <label>12. District/County</label>
        <input
          type="text"
          name="districtCounty"
          value={formData.districtCounty}
          onChange={handleInputChange}
          placeholder="e.g., Windhoek West"
        />
      </div>

      <div className="form-group">
        <label>13. City/Town *</label>
        <input
          type="text"
          name="cityTown"
          value={formData.cityTown}
          onChange={handleInputChange}
          placeholder="e.g., Windhoek"
          className={errors.cityTown ? 'error' : ''}
        />
        {errors.cityTown && <span className="error-text">{errors.cityTown}</span>}
      </div>

      <div className="form-group">
        <label>14. Campus/Branch Name (if multiple)</label>
        <input
          type="text"
          name="campusBranchName"
          value={formData.campusBranchName}
          onChange={handleInputChange}
          placeholder="Main campus or specific branch name"
        />
      </div>

      <div className="form-group">
        <label>15. GPS Coordinates (optional)</label>
        <input
          type="text"
          name="gpsCoordinates"
          value={formData.gpsCoordinates}
          onChange={handleInputChange}
          placeholder="e.g., -22.5700, 17.0836"
        />
        <p className="field-hint">Enter as latitude, longitude (decimal degrees)</p>
      </div>
    </div>
  );

  const renderSectionC = () => (
    <div className="section-container">
      <h2>Section C: Agricultural Qualifications & Programs</h2>
      
      <div className="form-group">
        <label>16. Agricultural programs offered * (Check all that apply)</label>
        <div className="checkbox-grid">
          {agriculturalPrograms.map(program => (
            <label key={program} className="checkbox-label">
              <input
                type="checkbox"
                name="agriculturalPrograms-option"
                value={program}
                checked={formData.agriculturalPrograms.includes(program)}
                onChange={handleInputChange}
              />
              <span>{program}</span>
            </label>
          ))}
        </div>
        {errors.agriculturalPrograms && <span className="error-text">{errors.agriculturalPrograms}</span>}
      </div>

      <div className="form-group">
        <label>17. Short Courses / Certifications Offered</label>
        <textarea
          name="shortCourses"
          value={formData.shortCourses}
          onChange={handleInputChange}
          placeholder="e.g., beekeeping, poultry management, irrigation, greenhouse operation"
          rows="3"
        />
        <p className="field-hint">List short courses separated by commas</p>
      </div>

      <div className="form-group">
        <label>18. Number of agricultural students registered per year</label>
        <div className="nested-fields">
          <div className="nested-field">
            <label>First-year students:</label>
            <input
              type="number"
              name="registeredStudents.firstYear"
              value={formData.registeredStudents.firstYear}
              onChange={handleInputChange}
              placeholder="Number"
              min="0"
            />
          </div>
          <div className="nested-field">
            <label>Continuing students:</label>
            <input
              type="number"
              name="registeredStudents.continuing"
              value={formData.registeredStudents.continuing}
              onChange={handleInputChange}
              placeholder="Number"
              min="0"
            />
          </div>
          <div className="nested-field">
            <label>Graduate students (Masters/PhD):</label>
            <input
              type="number"
              name="registeredStudents.graduate"
              value={formData.registeredStudents.graduate}
              onChange={handleInputChange}
              placeholder="Number"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>19. Number of students graduating per year (approx.)</label>
        <input
          type="number"
          name="graduatingStudents"
          value={formData.graduatingStudents}
          onChange={handleInputChange}
          placeholder="Approximate number"
          min="0"
        />
      </div>
    </div>
  );

  const renderSectionD = () => (
    <div className="section-container">
      <h2>Section D: Expertise & Human Resources</h2>
      
      <div className="form-group">
        <label>20. Agricultural experts available at the institution</label>
        <div className="nested-fields">
          <div className="nested-field">
            <label>Number of lecturers in agriculture:</label>
            <input
              type="number"
              name="experts.lecturers"
              value={formData.experts.lecturers}
              onChange={handleInputChange}
              placeholder="Number"
              min="0"
            />
          </div>
          <div className="nested-field">
            <label>Number of researchers:</label>
            <input
              type="number"
              name="experts.researchers"
              value={formData.experts.researchers}
              onChange={handleInputChange}
              placeholder="Number"
              min="0"
            />
          </div>
          <div className="nested-field">
            <label>Number of extension officers:</label>
            <input
              type="number"
              name="experts.extensionOfficers"
              value={formData.experts.extensionOfficers}
              onChange={handleInputChange}
              placeholder="Number"
              min="0"
            />
          </div>
          <div className="nested-field">
            <label>Number of technical instructors:</label>
            <input
              type="number"
              name="experts.technicalInstructors"
              value={formData.experts.technicalInstructors}
              onChange={handleInputChange}
              placeholder="Number"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>21. Areas of expertise available * (Check all that apply)</label>
        <div className="checkbox-grid">
          {expertiseAreas.map(area => (
            <label key={area} className="checkbox-label">
              <input
                type="checkbox"
                name="expertiseAreas-option"
                value={area}
                checked={formData.expertiseAreas.includes(area)}
                onChange={handleInputChange}
              />
              <span>{area}</span>
            </label>
          ))}
        </div>
        {errors.expertiseAreas && <span className="error-text">{errors.expertiseAreas}</span>}
      </div>

      <div className="form-group">
        <label>22. Would your experts be available for: (Check all that apply)</label>
        <div className="checkbox-grid">
          {expertAvailabilityOptions.map(option => (
            <label key={option} className="checkbox-label">
              <input
                type="checkbox"
                name="expertAvailability-option"
                value={option}
                checked={formData.expertAvailability.includes(option)}
                onChange={handleInputChange}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionE = () => (
    <div className="section-container">
      <h2>Section E: Research Capacity & Needs</h2>
      
      <div className="form-group">
        <label>23. Does the institution conduct agricultural research?</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="conductsResearch"
              value="Yes"
              checked={formData.conductsResearch === "Yes"}
              onChange={handleInputChange}
            />
            <span>Yes</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="conductsResearch"
              value="No"
              checked={formData.conductsResearch === "No"}
              onChange={handleInputChange}
            />
            <span>No</span>
          </label>
        </div>
      </div>

      {formData.conductsResearch === "Yes" && (
        <>
          <div className="form-group">
            <label>24. Main research areas</label>
            <textarea
              name="researchAreas"
              value={formData.researchAreas}
              onChange={handleInputChange}
              placeholder="e.g., crop improvement, drought-resistant varieties, livestock breeds, soil health, climate change"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>25. Average number of agricultural research projects per year</label>
            <input
              type="number"
              name="researchProjectsPerYear"
              value={formData.researchProjectsPerYear}
              onChange={handleInputChange}
              placeholder="Number of projects"
              min="0"
            />
          </div>
        </>
      )}

      <div className="form-group">
        <label>26. What type of research data would the institution like to obtain through the platform? (Check all that apply)</label>
        <div className="checkbox-grid">
          {desiredResearchDataTypes.map(dataType => (
            <label key={dataType} className="checkbox-label">
              <input
                type="checkbox"
                name="desiredResearchData-option"
                value={dataType}
                checked={formData.desiredResearchData.includes(dataType)}
                onChange={handleInputChange}
              />
              <span>{dataType}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>27. Does the institution require access to field research farms or farmer cooperatives?</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="fieldResearchAccess"
              value="Yes"
              checked={formData.fieldResearchAccess === "Yes"}
              onChange={handleInputChange}
            />
            <span>Yes</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="fieldResearchAccess"
              value="No"
              checked={formData.fieldResearchAccess === "No"}
              onChange={handleInputChange}
            />
            <span>No</span>
          </label>
        </div>
      </div>

      {formData.fieldResearchAccess === "Yes" && (
        <div className="form-group">
          <label>Preferred research support: (Check all that apply)</label>
          <div className="checkbox-grid">
            {researchSupportOptions.map(support => (
              <label key={support} className="checkbox-label">
                <input
                  type="checkbox"
                  name="researchSupportNeeds-option"
                  value={support}
                  checked={formData.researchSupportNeeds.includes(support)}
                  onChange={handleInputChange}
                />
                <span>{support}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSectionF = () => (
    <div className="section-container">
      <h2>Section F: Training Programs & Outreach</h2>
      
      <div className="form-group">
        <label>28. Types of training programs the institution can offer: (Check all that apply)</label>
        <div className="checkbox-grid">
          {trainingProgramTypes.map(program => (
            <label key={program} className="checkbox-label">
              <input
                type="checkbox"
                name="trainingPrograms-option"
                value={program}
                checked={formData.trainingPrograms.includes(program)}
                onChange={handleInputChange}
              />
              <span>{program}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>29. Number of training programs conducted yearly (approx.)</label>
        <input
          type="number"
          name="programsPerYear"
          value={formData.programsPerYear}
          onChange={handleInputChange}
          placeholder="Approximate number"
          min="0"
        />
      </div>

      <div className="form-group">
        <label>30. Target groups served: (Check all that apply)</label>
        <div className="checkbox-grid">
          {targetGroups.map(group => (
            <label key={group} className="checkbox-label">
              <input
                type="checkbox"
                name="targetGroups-option"
                value={group}
                checked={formData.targetGroups.includes(group)}
                onChange={handleInputChange}
              />
              <span>{group}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionG = () => (
    <div className="section-container">
      <h2>Section G: Internships & Practical Training</h2>
      
      <div className="form-group">
        <label>31. Number of agricultural students needing internships per year</label>
        <input
          type="number"
          name="internshipsNeeded"
          value={formData.internshipsNeeded}
          onChange={handleInputChange}
          placeholder="Number of students"
          min="0"
        />
      </div>

      <div className="form-group">
        <label>32. Preferred internship duration</label>
        <div className="radio-group">
          {['1-3 months', '3-6 months', '6-12 months'].map(duration => (
            <label key={duration} className="radio-label">
              <input
                type="radio"
                name="internshipDuration"
                value={duration}
                checked={formData.internshipDuration === duration}
                onChange={handleInputChange}
              />
              <span>{duration}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>33. Preferred internship placement areas: (Check all that apply)</label>
        <div className="checkbox-grid">
          {internshipAreasList.map(area => (
            <label key={area} className="checkbox-label">
              <input
                type="checkbox"
                name="internshipAreas-option"
                value={area}
                checked={formData.internshipAreas.includes(area)}
                onChange={handleInputChange}
              />
              <span>{area}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>34. Support expected from host farms or companies: (Check all that apply)</label>
        <div className="checkbox-grid">
          {internshipSupportOptions.map(support => (
            <label key={support} className="checkbox-label">
              <input
                type="checkbox"
                name="internshipSupport-option"
                value={support}
                checked={formData.internshipSupport.includes(support)}
                onChange={handleInputChange}
              />
              <span>{support}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionH = () => (
    <div className="section-container">
      <h2>Section H: Solutions & Contribution to Agriculture</h2>
      
      <div className="form-group">
        <label>35. Agricultural challenges the institution can help solve: (Check all that apply)</label>
        <div className="checkbox-grid">
          {agriculturalChallenges.map(challenge => (
            <label key={challenge} className="checkbox-label">
              <input
                type="checkbox"
                name="challengesCanSolve-option"
                value={challenge}
                checked={formData.challengesCanSolve.includes(challenge)}
                onChange={handleInputChange}
              />
              <span>{challenge}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>36. Types of solutions the institution can provide: (Check all that apply)</label>
        <div className="checkbox-grid">
          {solutionTypesList.map(solution => (
            <label key={solution} className="checkbox-label">
              <input
                type="checkbox"
                name="solutionTypes-option"
                value={solution}
                checked={formData.solutionTypes.includes(solution)}
                onChange={handleInputChange}
              />
              <span>{solution}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionI = () => (
    <div className="section-container">
      <h2>Section I: Additional Information</h2>
      
      <div className="form-group">
        <label>37. Does the institution have demonstration farms?</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="hasDemonstrationFarms"
              value="Yes"
              checked={formData.hasDemonstrationFarms === "Yes"}
              onChange={handleInputChange}
            />
            <span>Yes</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="hasDemonstrationFarms"
              value="No"
              checked={formData.hasDemonstrationFarms === "No"}
              onChange={handleInputChange}
            />
            <span>No</span>
          </label>
        </div>
      </div>

      {formData.hasDemonstrationFarms === "Yes" && (
        <div className="form-group">
          <label>Specify size and type of demonstration farms:</label>
          <textarea
            name="demonstrationFarmDetails"
            value={formData.demonstrationFarmDetails}
            onChange={handleInputChange}
            placeholder="e.g., 50 hectares crop farm, 20 hectares livestock farm"
            rows="3"
          />
        </div>
      )}

      <div className="form-group">
        <label>38. Does the institution collaborate with other agricultural stakeholders? (Check all that apply)</label>
        <div className="checkbox-grid">
          {collaborationPartners.map(partner => (
            <label key={partner} className="checkbox-label">
              <input
                type="checkbox"
                name="collaborations-option"
                value={partner}
                checked={formData.collaborations.includes(partner)}
                onChange={handleInputChange}
              />
              <span>{partner}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>39. Any additional services or capabilities to highlight?</label>
        <textarea
          name="additionalServices"
          value={formData.additionalServices}
          onChange={handleInputChange}
          placeholder="Describe any additional services, capabilities, or partnerships"
          rows="4"
        />
      </div>
    </div>
  );

  return (
    <div className="institution-questionnaire">
      <div className="questionnaire-header">
        <h1>Tertiary Institution Registration Questionnaire</h1>
        <p>Complete all sections to register your institution on AfriAgriFed</p>
      </div>

      <div className="progress-container">
        <div className="progress-steps">
          {sections.map((section, index) => (
            <div 
              key={index} 
              className={`step ${currentSection > index + 1 ? 'completed' : ''} ${currentSection === index + 1 ? 'active' : ''}`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-label">{section}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="questionnaire-content">
        {renderSection()}
      </div>

      <div className="questionnaire-actions">
        <button 
          className="btn-secondary" 
          onClick={handleBack}
        >
          {currentSection === 1 ? 'Cancel' : 'Back'}
        </button>
        <button 
          className="btn-primary" 
          onClick={handleNext}
        >
          {currentSection === sections.length ? 'Complete Registration' : 'Next Section'}
        </button>
      </div>

      <div className="progress-indicator">
        <span>Section {currentSection} of {sections.length}</span>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(currentSection / sections.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}