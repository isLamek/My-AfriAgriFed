import React, { useState } from "react";
import "./FarmerQuestionnaire.css";
import { t, tv } from "./i18n";


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
        if (!formData.businessName.trim()) newErrors.businessName = t("farmerForm.businessNameIsRequired");
        if (formData.typeOfFarming.length === 0) newErrors.typeOfFarming = t("farmerForm.selectAtLeastOneFarmingType");
        if (!formData.scaleOfFarming) newErrors.scaleOfFarming = t("farmerForm.scaleOfFarmingIsRequired");
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = t("farmerForm.phoneNumberIsRequired");
        if (!formData.typeOfFarmingBusiness) newErrors.typeOfFarmingBusiness = t("farmerForm.businessTypeIsRequired");
        if (!formData.yearsInFarming) newErrors.yearsInFarming = t("farmerForm.yearsInFarmingIsRequired");
        break;
        
      case 2:
        if (!formData.country.trim()) newErrors.country = t("farmerForm.countryIsRequired");
        if (!formData.provinceStateRegion.trim()) newErrors.provinceStateRegion = t("farmerForm.provinceStateRegionIsRequired");
        if (!formData.totalLandSize) newErrors.totalLandSize = t("farmerForm.landSizeIsRequired");
        if (!formData.landOwnershipType) newErrors.landOwnershipType = t("farmerForm.landOwnershipTypeIsRequired");
        break;
        
      case 3:
        if (formData.sellProduce === "") newErrors.sellProduce = t("farmerForm.pleaseSelectAnOption");
        if (formData.sellProduce === "Yes" && !formData.percentageSold) newErrors.percentageSold = t("farmerForm.percentageSoldIsRequired");
        break;
        
      case 5:
        if (formData.farmingChallenges.length === 0) newErrors.farmingChallenges = t("farmerForm.selectAtLeastOneChallenge");
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
      <h2>{t("farmerForm.sectionPersonalBusinessInformation")}</h2>
      
      <div className="form-group">
        <label>{t("farmerForm.1BusinessName")}</label>
        <input
          type="text"
          name="businessName"
          value={formData.businessName}
          onChange={handleInputChange}
          placeholder={t("farmerForm.enterYourBusinessName")}
          className={errors.businessName ? 'error' : ''}
        />
        {errors.businessName && <span className="error-text">{errors.businessName}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.2TypeOfFarmingCheckAll")}</label>
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
              <span>{tv(type)}</span>
            </label>
          ))}
        </div>
        {errors.typeOfFarming && <span className="error-text">{errors.typeOfFarming}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.3SpecifyFarmingProduct")}</label>
        <input
          type="text"
          name="specifyFarmingProduct"
          value={formData.specifyFarmingProduct}
          onChange={handleInputChange}
          placeholder={t("farmerForm.egMaizeCattleTomatoesFish")}
        />
      </div>

      <div className="form-group">
        <label>{t("farmerForm.4ScaleOfFarming")}</label>
        <select
          name="scaleOfFarming"
          value={formData.scaleOfFarming}
          onChange={handleInputChange}
          className={errors.scaleOfFarming ? 'error' : ''}
        >
          <option value="">{t("farmerForm.selectScale")}</option>
          <option value="Small-scale">{t("farmerForm.smallScale")}</option>
          <option value="Medium-scale">{t("farmerForm.mediumScale")}</option>
          <option value="Large-scale">{t("farmerForm.largeScale")}</option>
          <option value="Commercial">{t("farmerForm.commercial")}</option>
        </select>
        {errors.scaleOfFarming && <span className="error-text">{errors.scaleOfFarming}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.5RegistrationNumber")}</label>
        <input
          type="text"
          name="registrationNumber"
          value={formData.registrationNumber}
          onChange={handleInputChange}
          placeholder={t("farmerForm.businessRegistrationNumber")}
        />
      </div>

      <div className="form-group">
        <label>{t("farmerForm.6PhoneNumber")}</label>
        <input
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          placeholder={t("farmerForm.264XxXxxXxxx")}
          className={errors.phoneNumber ? 'error' : ''}
        />
        {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.7EmailOptional")}</label>
        <input
          type="email"
          name="businessEmail"
          value={formData.businessEmail}
          onChange={handleInputChange}
          placeholder="business@example.com"
        />
      </div>

      <div className="form-group">
        <label>{t("farmerForm.8TypeOfFarmingBusiness")}</label>
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
              <span>{tv(type)}</span>
            </label>
          ))}
        </div>
        {errors.typeOfFarmingBusiness && <span className="error-text">{errors.typeOfFarmingBusiness}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.9YearsInFarming")}</label>
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
              <span>{tv(year)}</span>
            </label>
          ))}
        </div>
        {errors.yearsInFarming && <span className="error-text">{errors.yearsInFarming}</span>}
      </div>
    </div>
  );

  const renderSectionB = () => (
    <div className="section-container">
      <h2>{t("farmerForm.sectionFarmLocationSize")}</h2>
      
      <div className="form-group">
        <label>{t("farmerForm.10Country")}</label>
        <input
          type="text"
          name="country"
          value={formData.country}
          onChange={handleInputChange}
          placeholder={t("farmerForm.egNamibia")}
          className={errors.country ? 'error' : ''}
        />
        {errors.country && <span className="error-text">{errors.country}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.11ProvinceStateRegion")}</label>
        <input
          type="text"
          name="provinceStateRegion"
          value={formData.provinceStateRegion}
          onChange={handleInputChange}
          placeholder={t("farmerForm.egOshanaRegion")}
          className={errors.provinceStateRegion ? 'error' : ''}
        />
        {errors.provinceStateRegion && <span className="error-text">{errors.provinceStateRegion}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.12DistrictCounty")}</label>
        <input
          type="text"
          name="districtCounty"
          value={formData.districtCounty}
          onChange={handleInputChange}
          placeholder={t("farmerForm.egOshakatiWest")}
        />
      </div>

      <div className="form-group">
        <label>{t("farmerForm.13VillageCommunity")}</label>
        <input
          type="text"
          name="villageCommunity"
          value={formData.villageCommunity}
          onChange={handleInputChange}
          placeholder={t("farmerForm.egOneshila")}
        />
      </div>

      <div className="form-group">
        <label>{t("farmerForm.14TotalLandSizeUsedFor")}</label>
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
              <span>{tv(size)}</span>
            </label>
          ))}
        </div>
        {errors.totalLandSize && <span className="error-text">{errors.totalLandSize}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.15LandOwnershipType")}</label>
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
              <span>{tv(type)}</span>
            </label>
          ))}
        </div>
        {errors.landOwnershipType && <span className="error-text">{errors.landOwnershipType}</span>}
      </div>
    </div>
  );

  const renderSectionC = () => (
    <div className="section-container">
      <h2>{t("farmerForm.sectionSalesMarketing")}</h2>
      
      <div className="form-group">
        <label>{t("farmerForm.16DoYouSellYourProduce")}</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="sellProduce"
              value="Yes"
              checked={formData.sellProduce === "Yes"}
              onChange={handleInputChange}
            />
            <span>{t("common.yes")}</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="sellProduce"
              value="No"
              checked={formData.sellProduce === "No"}
              onChange={handleInputChange}
            />
            <span>{t("common.no")}</span>
          </label>
        </div>
        {errors.sellProduce && <span className="error-text">{errors.sellProduce}</span>}
      </div>

      {formData.sellProduce === "Yes" && (
        <>
          <div className="form-group">
            <label>{t("farmerForm.17WhatPercentageOfYourProduce")}</label>
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
                  <span>{tv(percent)}</span>
                </label>
              ))}
            </div>
            {errors.percentageSold && <span className="error-text">{errors.percentageSold}</span>}
          </div>

          <div className="form-group">
            <label>{t("farmerForm.18AverageSalesPerYearEstimate")}</label>
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
                  <span>{tv(range)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>{t("farmerForm.19WhereDoYouSellYour")}</label>
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
                  <span>{tv(channel)}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="form-group">
        <label>{t("farmerForm.20MainHarvestProductionTimesMonths")}</label>
        <input
          type="text"
          name="mainHarvestTimes"
          value={formData.mainHarvestTimes}
          onChange={handleInputChange}
          placeholder={t("farmerForm.egJuneAugustNovemberDecember")}
        />
      </div>

      <div className="form-group">
        <label>{t("farmerForm.21ModeOfTransportUsedFor")}</label>
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
              <span>{tv(mode)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionD = () => (
    <div className="section-container">
      <h2>{t("farmerForm.sectionInputsResources")}</h2>
      
      <div className="form-group">
        <label>{t("farmerForm.28WhereDoYouGetYour")}</label>
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
              <span>{tv(source)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>{t("farmerForm.29DoYouHaveAccessTo")}</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="irrigationAccess"
              value="Yes"
              checked={formData.irrigationAccess === "Yes"}
              onChange={handleInputChange}
            />
            <span>{t("common.yes")}</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="irrigationAccess"
              value="No"
              checked={formData.irrigationAccess === "No"}
              onChange={handleInputChange}
            />
            <span>{t("common.no")}</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderSectionE = () => (
    <div className="section-container">
      <h2>{t("farmerForm.sectionFarmingMethodsChallenges")}</h2>
      
      <div className="form-group">
        <label>{t("farmerForm.30WhatTypeOfFarmingMethods")}</label>
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
              <span>{tv(method)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>{t("farmerForm.31WhatAreYourBiggestFarming")}</label>
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
              <span>{tv(challenge)}</span>
            </label>
          ))}
        </div>
        {errors.farmingChallenges && <span className="error-text">{errors.farmingChallenges}</span>}
      </div>

      <div className="form-group">
        <label>{t("farmerForm.32WhichChallengeAffectsYourIncome")}</label>
        <textarea
          name="biggestIncomeChallenge"
          value={formData.biggestIncomeChallenge}
          onChange={handleInputChange}
          placeholder={t("farmerForm.describeTheBiggestChallengeAffectingYour")}
          rows="3"
        />
      </div>
    </div>
  );

  const renderSectionF = () => (
    <div className="section-container">
      <h2>{t("farmerForm.sectionTechnologySupport")}</h2>
      
      <div className="form-group">
        <label>{t("farmerForm.33DoYouUseSmartphoneOr")}</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="smartphoneUsage"
              value="Yes"
              checked={formData.smartphoneUsage === "Yes"}
              onChange={handleInputChange}
            />
            <span>{t("common.yes")}</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="smartphoneUsage"
              value="No"
              checked={formData.smartphoneUsage === "No"}
              onChange={handleInputChange}
            />
            <span>{t("common.no")}</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>{t("farmerForm.34AreYouMemberOfAny")}</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="associationMember"
              value="Yes"
              checked={formData.associationMember === "Yes"}
              onChange={handleInputChange}
            />
            <span>{t("common.yes")}</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="associationMember"
              value="No"
              checked={formData.associationMember === "No"}
              onChange={handleInputChange}
            />
            <span>{t("common.no")}</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>{t("farmerForm.35TypesOfSupportYouWould")}</label>
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
              <span>{tv(support)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
        
  );

  return (
    <div className="farmer-questionnaire">
      <div className="questionnaire-header">
        <h1>{t("farmerForm.farmerRegistrationQuestionnaire")}</h1>
        <p>{t("farmerForm.completeAllSectionsToRegisterAs")}</p>
      </div>

      <div className="progress-container">
        <div className="progress-steps">
          {sections.map((section, index) => (
            <div 
              key={index} 
              className={`step ${currentSection > index + 1 ? 'completed' : ''} ${currentSection === index + 1 ? 'active' : ''}`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-label">{tv(section)}</div>
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
          {currentSection === 1 ? t("common.cancel") : t("common.back")}
        </button>
        <button 
          className="btn-primary" 
          onClick={handleNext}
        >
          {currentSection === sections.length ? t("farmerForm.completeRegistration") : t("farmerForm.nextSection")}
        </button>
      </div>

      <div className="progress-indicator">
        <span>{t("questionnaire.sectionOf", { n: currentSection, total: sections.length })}</span>
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