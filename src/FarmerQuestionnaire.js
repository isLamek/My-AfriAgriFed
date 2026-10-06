import React, { useState } from "react";
import "./FarmerQuestionnaire.css";


export default function FarmerQuestionnaire({ 
  onComplete, 
  initialData = {}, 
  onBack 
}) {
  const [currentSection, setCurrentSection] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState(null);


  const [formData, setFormData] = useState({
    // Section A: Personal & Business Information
    businessName: initialData.businessName || "",
    typeOfFarming: initialData.typeOfFarming || [],
    specifyFarmingProduct: initialData.specifyFarmingProduct || "",
    scaleOfFarming: initialData.scaleOfFarming || "",
    registrationNumber: initialData.registrationNumber || "",
    phoneNumber: initialData.phoneNumber || "",
    businessEmail: initialData.businessEmail || "",
    typeOfFarmingBusiness: initialData.typeOfFarmingBusiness || "",
    yearsInFarming: initialData.yearsInFarming || "",

    // Section B: Farm Location & Size
    country: initialData.country || "",
    provinceStateRegion: initialData.provinceStateRegion || "",
    districtCounty: initialData.districtCounty || "",
    villageCommunity: initialData.villageCommunity || "",
    totalLandSize: initialData.totalLandSize || "",
    landOwnershipType: initialData.landOwnershipType || "",

    // Section C: Sales & Marketing
    sellProduce: initialData.sellProduce || "",
    percentageSold: initialData.percentageSold || "",
    averageSalesPerYear: initialData.averageSalesPerYear || "",
    salesChannels: initialData.salesChannels || [],
    mainHarvestTimes: initialData.mainHarvestTimes || "",
    transportMode: initialData.transportMode || "",

    // Section D: Inputs & Resources
    farmingInputsSource: initialData.farmingInputsSource || [],
    irrigationAccess: initialData.irrigationAccess || "",

    // Section E: Farming Methods & Challenges
    farmingMethods: initialData.farmingMethods || [],
    farmingChallenges: initialData.farmingChallenges || [],
    biggestIncomeChallenge: initialData.biggestIncomeChallenge || "",

    // Section F: Technology & Support
    smartphoneUsage: initialData.smartphoneUsage || "",
    associationMember: initialData.associationMember || "",
    supportNeeded: initialData.supportNeeded || [],
  });

  const [errors, setErrors] = useState({});

  const sections = [
    "Personal & Business Information",
    "Farm Location & Size",
    "Sales & Marketing",
    "Inputs & Resources",
    "Farming Methods & Challenges",
    "Technology & Support"
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === "checkbox") {
      if (name.includes("typeOfFarming") || name.includes("salesChannels") || 
          name.includes("farmingInputsSource") || name.includes("farmingMethods") ||
          name.includes("farmingChallenges") || name.includes("supportNeeded")) {
        
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
        setFormData(prev => ({ ...prev, [name]: checked }));
      }
    } else if (type === "radio") {
      setFormData(prev => ({ ...prev, [name]: value }));
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
        if (!formData.businessName.trim()) newErrors.businessName = "Business name is required";
        if (formData.typeOfFarming.length === 0) newErrors.typeOfFarming = "Select at least one farming type";
        if (!formData.scaleOfFarming) newErrors.scaleOfFarming = "Scale of farming is required";
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
        if (!formData.typeOfFarmingBusiness) newErrors.typeOfFarmingBusiness = "Business type is required";
        if (!formData.yearsInFarming) newErrors.yearsInFarming = "Years in farming is required";
        break;
        
      case 2:
        if (!formData.country.trim()) newErrors.country = "Country is required";
        if (!formData.provinceStateRegion.trim()) newErrors.provinceStateRegion = "Province/State/Region is required";
        if (!formData.totalLandSize) newErrors.totalLandSize = "Land size is required";
        if (!formData.landOwnershipType) newErrors.landOwnershipType = "Land ownership type is required";
        break;
        
      case 3:
        if (formData.sellProduce === "") newErrors.sellProduce = "Please select an option";
        if (formData.sellProduce === "Yes" && !formData.percentageSold) newErrors.percentageSold = "Percentage sold is required";
        break;
        
      case 5:
        if (formData.farmingChallenges.length === 0) newErrors.farmingChallenges = "Select at least one challenge";
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
      default:
        return renderSectionA();
    }
  };

  const renderSectionA = () => (
    <div className="section-container">
      <h2>Section A: Personal & Business Information</h2>
      
      <div className="form-group">
        <label>1. Business Name *</label>
        <input
          type="text"
          name="businessName"
          value={formData.businessName}
          onChange={handleInputChange}
          placeholder="Enter your business name"
          className={errors.businessName ? 'error' : ''}
        />
        {errors.businessName && <span className="error-text">{errors.businessName}</span>}
      </div>

      <div className="form-group">
        <label>2. Type of Farming * (Check all that apply)</label>
        <div className="checkbox-group">
          {['Livestock', 'Crop farming', 'Mixed farming', 'Aquaculture farming', 'Others'].map(type => (
            <label key={type} className="checkbox-label">
              <input
                type="checkbox"
                name="typeOfFarming-option"
                value={type}
                checked={formData.typeOfFarming.includes(type)}
                onChange={handleInputChange}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
        {errors.typeOfFarming && <span className="error-text">{errors.typeOfFarming}</span>}
      </div>

      <div className="form-group">
        <label>3. Specify farming product</label>
        <input
          type="text"
          name="specifyFarmingProduct"
          value={formData.specifyFarmingProduct}
          onChange={handleInputChange}
          placeholder="e.g., Maize, Cattle, Tomatoes, Fish"
        />
      </div>

      <div className="form-group">
        <label>4. Scale of farming *</label>
        <select
          name="scaleOfFarming"
          value={formData.scaleOfFarming}
          onChange={handleInputChange}
          className={errors.scaleOfFarming ? 'error' : ''}
        >
          <option value="">Select scale</option>
          <option value="Small-scale">Small-scale</option>
          <option value="Medium-scale">Medium-scale</option>
          <option value="Large-scale">Large-scale</option>
          <option value="Commercial">Commercial</option>
        </select>
        {errors.scaleOfFarming && <span className="error-text">{errors.scaleOfFarming}</span>}
      </div>

      <div className="form-group">
        <label>5. Registration Number</label>
        <input
          type="text"
          name="registrationNumber"
          value={formData.registrationNumber}
          onChange={handleInputChange}
          placeholder="Business registration number"
        />
      </div>

      <div className="form-group">
        <label>6. Phone Number *</label>
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
        <label>7. Email (optional)</label>
        <input
          type="email"
          name="businessEmail"
          value={formData.businessEmail}
          onChange={handleInputChange}
          placeholder="business@example.com"
        />
      </div>

      <div className="form-group">
        <label>8. Type of Farming Business *</label>
        <div className="radio-group">
          {['Sole proprietor', 'Family-run', 'Cooperative member', 'Company/Commercial farm'].map(type => (
            <label key={type} className="radio-label">
              <input
                type="radio"
                name="typeOfFarmingBusiness"
                value={type}
                checked={formData.typeOfFarmingBusiness === type}
                onChange={handleInputChange}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
        {errors.typeOfFarmingBusiness && <span className="error-text">{errors.typeOfFarmingBusiness}</span>}
      </div>

      <div className="form-group">
        <label>9. Years in Farming *</label>
        <div className="radio-group">
          {['<1 year', '1-3 years', '3-5 years', '5-10 years', '10+ years'].map(year => (
            <label key={year} className="radio-label">
              <input
                type="radio"
                name="yearsInFarming"
                value={year}
                checked={formData.yearsInFarming === year}
                onChange={handleInputChange}
              />
              <span>{year}</span>
            </label>
          ))}
        </div>
        {errors.yearsInFarming && <span className="error-text">{errors.yearsInFarming}</span>}
      </div>
    </div>
  );

  const renderSectionB = () => (
    <div className="section-container">
      <h2>Section B: Farm Location & Size</h2>
      
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
        <label>11. Province/State/Region *</label>
        <input
          type="text"
          name="provinceStateRegion"
          value={formData.provinceStateRegion}
          onChange={handleInputChange}
          placeholder="e.g., Oshana Region"
          className={errors.provinceStateRegion ? 'error' : ''}
        />
        {errors.provinceStateRegion && <span className="error-text">{errors.provinceStateRegion}</span>}
      </div>

      <div className="form-group">
        <label>12. District/County</label>
        <input
          type="text"
          name="districtCounty"
          value={formData.districtCounty}
          onChange={handleInputChange}
          placeholder="e.g., Oshakati West"
        />
      </div>

      <div className="form-group">
        <label>13. Village/Community</label>
        <input
          type="text"
          name="villageCommunity"
          value={formData.villageCommunity}
          onChange={handleInputChange}
          placeholder="e.g., Oneshila"
        />
      </div>

      <div className="form-group">
        <label>14. Total Land Size Used for Farming *</label>
        <div className="radio-group">
          {['<1 hectare', '1-5 hectares', '5-10 hectares', '>10 hectares'].map(size => (
            <label key={size} className="radio-label">
              <input
                type="radio"
                name="totalLandSize"
                value={size}
                checked={formData.totalLandSize === size}
                onChange={handleInputChange}
              />
              <span>{size}</span>
            </label>
          ))}
        </div>
        {errors.totalLandSize && <span className="error-text">{errors.totalLandSize}</span>}
      </div>

      <div className="form-group">
        <label>15. Land Ownership Type *</label>
        <div className="radio-group">
          {['Owned', 'Leased', 'Communal', 'Rented', 'Other'].map(type => (
            <label key={type} className="radio-label">
              <input
                type="radio"
                name="landOwnershipType"
                value={type}
                checked={formData.landOwnershipType === type}
                onChange={handleInputChange}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
        {errors.landOwnershipType && <span className="error-text">{errors.landOwnershipType}</span>}
      </div>
    </div>
  );

  const renderSectionC = () => (
    <div className="section-container">
      <h2>Section C: Sales & Marketing</h2>
      
      <div className="form-group">
        <label>16. Do you sell your produce? *</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="sellProduce"
              value="Yes"
              checked={formData.sellProduce === "Yes"}
              onChange={handleInputChange}
            />
            <span>Yes</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="sellProduce"
              value="No"
              checked={formData.sellProduce === "No"}
              onChange={handleInputChange}
            />
            <span>No</span>
          </label>
        </div>
        {errors.sellProduce && <span className="error-text">{errors.sellProduce}</span>}
      </div>

      {formData.sellProduce === "Yes" && (
        <>
          <div className="form-group">
            <label>17. What percentage of your produce is sold? *</label>
            <div className="radio-group">
              {['0-25%', '26-50%', '51-75%', '76-100%'].map(percent => (
                <label key={percent} className="radio-label">
                  <input
                    type="radio"
                    name="percentageSold"
                    value={percent}
                    checked={formData.percentageSold === percent}
                    onChange={handleInputChange}
                  />
                  <span>{percent}</span>
                </label>
              ))}
            </div>
            {errors.percentageSold && <span className="error-text">{errors.percentageSold}</span>}
          </div>

          <div className="form-group">
            <label>18. Average sales per year (estimate)</label>
            <div className="radio-group">
              {['< $500', '$500-$2,000', '$2,000-$5,000', '$5,000-$10,000', '>$10,000'].map(range => (
                <label key={range} className="radio-label">
                  <input
                    type="radio"
                    name="averageSalesPerYear"
                    value={range}
                    checked={formData.averageSalesPerYear === range}
                    onChange={handleInputChange}
                  />
                  <span>{range}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>19. Where do you sell your products? (Check all that apply)</label>
            <div className="checkbox-group">
              {['Local markets', 'Middlemen', 'Export buyers', 'Cooperatives', 'Direct to consumers', 'Processing companies'].map(channel => (
                <label key={channel} className="checkbox-label">
                  <input
                    type="checkbox"
                    name="salesChannels-option"
                    value={channel}
                    checked={formData.salesChannels.includes(channel)}
                    onChange={handleInputChange}
                  />
                  <span>{channel}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="form-group">
        <label>20. Main harvest/production times (months)</label>
        <input
          type="text"
          name="mainHarvestTimes"
          value={formData.mainHarvestTimes}
          onChange={handleInputChange}
          placeholder="e.g., June-August, November-December"
        />
      </div>

      <div className="form-group">
        <label>21. Mode of transport used for delivering produce</label>
        <div className="radio-group">
          {['Own vehicle', 'Hired transport', 'Public transport', 'On foot/animal-powered', 'Other'].map(mode => (
            <label key={mode} className="radio-label">
              <input
                type="radio"
                name="transportMode"
                value={mode}
                checked={formData.transportMode === mode}
                onChange={handleInputChange}
              />
              <span>{mode}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionD = () => (
    <div className="section-container">
      <h2>Section D: Inputs & Resources</h2>
      
      <div className="form-group">
        <label>28. Where do you get your farming inputs (seed, feed, fertilizer)? (Check all that apply)</label>
        <div className="checkbox-group">
          {['Local Agro-dealers', 'Government programs', 'Cooperatives', 'Own production (seed saving, etc.)', 'Other'].map(source => (
            <label key={source} className="checkbox-label">
              <input
                type="checkbox"
                name="farmingInputsSource-option"
                value={source}
                checked={formData.farmingInputsSource.includes(source)}
                onChange={handleInputChange}
              />
              <span>{source}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>29. Do you have access to irrigation?</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="irrigationAccess"
              value="Yes"
              checked={formData.irrigationAccess === "Yes"}
              onChange={handleInputChange}
            />
            <span>Yes</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="irrigationAccess"
              value="No"
              checked={formData.irrigationAccess === "No"}
              onChange={handleInputChange}
            />
            <span>No</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSectionE = () => (
    <div className="section-container">
      <h2>Section E: Farming Methods & Challenges</h2>
      
      <div className="form-group">
        <label>30. What type of farming methods do you use?</label>
        <div className="radio-group">
          {['Traditional', 'Organic', 'Conservation agriculture', 'Mechanized', 'Mixed methods'].map(method => (
            <label key={method} className="radio-label">
              <input
                type="radio"
                name="farmingMethods"
                value={method}
                checked={formData.farmingMethods.includes(method)}
                onChange={handleInputChange}
              />
              <span>{method}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>31. What are your biggest farming challenges? * (Check all that apply)</label>
        <div className="checkbox-grid">
          {[
            'Lack of financing', 'High cost of inputs', 'Poor market access', 
            'Limited storage facilities', 'Pests and diseases', 'Climate change/unpredictable weather',
            'Low yields', 'Poor roads/transports', 'Lack of machinery', 'Lack of training/knowledge',
            'Water scarcity', 'Other'
          ].map(challenge => (
            <label key={challenge} className="checkbox-label">
              <input
                type="checkbox"
                name="farmingChallenges-option"
                value={challenge}
                checked={formData.farmingChallenges.includes(challenge)}
                onChange={handleInputChange}
              />
              <span>{challenge}</span>
            </label>
          ))}
        </div>
        {errors.farmingChallenges && <span className="error-text">{errors.farmingChallenges}</span>}
      </div>

      <div className="form-group">
        <label>32. Which challenge affects your income the most?</label>
        <textarea
          name="biggestIncomeChallenge"
          value={formData.biggestIncomeChallenge}
          onChange={handleInputChange}
          placeholder="Describe the biggest challenge affecting your income..."
          rows="3"
        />
      </div>
    </div>
  );

  const renderSectionF = () => (
    <div className="section-container">
      <h2>Section F: Technology & Support</h2>
      
      <div className="form-group">
        <label>33. Do you use a smartphone or mobile device for farming activities?</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="smartphoneUsage"
              value="Yes"
              checked={formData.smartphoneUsage === "Yes"}
              onChange={handleInputChange}
            />
            <span>Yes</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="smartphoneUsage"
              value="No"
              checked={formData.smartphoneUsage === "No"}
              onChange={handleInputChange}
            />
            <span>No</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>34. Are you a member of any farmers' association or cooperative?</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="associationMember"
              value="Yes"
              checked={formData.associationMember === "Yes"}
              onChange={handleInputChange}
            />
            <span>Yes</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="associationMember"
              value="No"
              checked={formData.associationMember === "No"}
              onChange={handleInputChange}
            />
            <span>No</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>35. Types of support you would like to receive: (Check all that apply)</label>
        <div className="checkbox-grid">
          {[
            'Training', 'Access to loans', 'Subsidized inputs', 'Market linkages',
            'Insurance', 'Digital tools', 'Storage/processing facilities'
          ].map(support => (
            <label key={support} className="checkbox-label">
              <input
                type="checkbox"
                name="supportNeeded-option"
                value={support}
                checked={formData.supportNeeded.includes(support)}
                onChange={handleInputChange}
              />
              <span>{support}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
        
  );

  return (
    <div className="farmer-questionnaire">
      <div className="questionnaire-header">
        <h1>Farmer Registration Questionnaire</h1>
        <p>Complete all sections to register as a verified farmer</p>
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