import React, { useState } from "react";
import "./ConsumerQuestionnaire.css";

export default function ConsumerQuestionnaire({ 
  onComplete, 
  initialData = {}, 
  onBack 
}) {
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState({
    // Section A: Personal & Business Information
    fullName: initialData.fullName || "",
    businessName: initialData.businessName || "",
    consumerType: initialData.consumerType || "",
    registrationNumber: initialData.registrationNumber || "",
    phoneNumber: initialData.phoneNumber || "",
    emailAddress: initialData.emailAddress || "",
    postalAddress: initialData.postalAddress || "",

    // Section B: Location Information
    country: initialData.country || "",
    provinceRegionState: initialData.provinceRegionState || "",
    districtCounty: initialData.districtCounty || "",
    cityTown: initialData.cityTown || "",
    deliveryAddress: initialData.deliveryAddress || "",
    receiverName: initialData.receiverName || "",

    // Section C: Business Details (conditional)
    businessOperationType: initialData.businessOperationType || "",
    businessOperationOther: initialData.businessOperationOther || "",
    yearsInOperation: initialData.yearsInOperation || "",
    averageCustomersWeekly: initialData.averageCustomersWeekly || "",

    // Section D: Product Interests
    productsInterested: initialData.productsInterested || [],
    productPreferences: initialData.productPreferences || {},

    // Section E: Estimated Quantities Required
    quantityRequirements: initialData.quantityRequirements || {},

    // Section F: Supply Recurrence & Timing
    supplyFrequency: initialData.supplyFrequency || "",
    preferredDeliveryDays: initialData.preferredDeliveryDays || [],
    preferredDeliveryTime: initialData.preferredDeliveryTime || "",
    peakDemandPeriods: initialData.peakDemandPeriods || "",

    // Section G: Packaging & Handling
    packagingPreferences: initialData.packagingPreferences || "",
    storageRequirements: initialData.storageRequirements || [],

    // Section H: Challenges & Support Needed
    sourcingChallenges: initialData.sourcingChallenges || [],
    desiredSupport: initialData.desiredSupport || [],
  });

  const [errors, setErrors] = useState({});

  const sections = [
    "Personal & Business Information",
    "Location Information",
    "Business Details",
    "Product Interests",
    "Quantity Requirements",
    "Supply & Timing",
    "Packaging & Handling",
    "Challenges & Support"
  ];

  const consumerTypes = [
    "Retailer",
    "Wholesaler", 
    "Processor / Manufacturer",
    "Restaurant / Food Service",
    "NGO / Institution",
    "Individual Buyer"
  ];

  const businessOperations = [
    "Grocery store",
    "Agro-dealer", 
    "Market stall",
    "Restaurant/Catering",
    "Food processing",
    "Export buyer",
    "Other"
  ];

  const productOptions = [
    "Maize", "Tomatoes", "Potatoes", "Onions", "Carrots",
    "Cabbage", "Lettuce", "Spinach", "Beans", "Peas",
    "Rice", "Wheat", "Sorghum", "Millet", "Chickens",
    "Eggs", "Milk", "Beef", "Pork", "Fish",
    "Honey", "Fruits", "Herbs", "Spices", "Other"
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === "checkbox") {
      // Handle multiple selection checkboxes
      if (name.includes("preferredDeliveryDays") || name.includes("storageRequirements") ||
          name.includes("sourcingChallenges") || name.includes("desiredSupport")) {
        
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
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleProductInterestChange = (product, isChecked) => {
    setFormData(prev => {
      const currentProducts = prev.productsInterested || [];
      let updatedProducts;
      
      if (isChecked) {
        updatedProducts = [...currentProducts, product];
        // Initialize preferences for new product
        const updatedPreferences = { ...prev.productPreferences };
        updatedPreferences[product] = { variety: "", quality: "" };
        return { 
          ...prev, 
          productsInterested: updatedProducts,
          productPreferences: updatedPreferences
        };
      } else {
        updatedProducts = currentProducts.filter(p => p !== product);
        // Remove preferences for removed product
        const updatedPreferences = { ...prev.productPreferences };
        delete updatedPreferences[product];
        return { 
          ...prev, 
          productsInterested: updatedProducts,
          productPreferences: updatedPreferences
        };
      }
    });
  };

  const handleProductPreferenceChange = (product, field, value) => {
    setFormData(prev => {
      const updatedPreferences = { ...prev.productPreferences };
      if (!updatedPreferences[product]) {
        updatedPreferences[product] = {};
      }
      updatedPreferences[product][field] = value;
      return { ...prev, productPreferences: updatedPreferences };
    });
  };

  const handleQuantityChange = (product, timePeriod, value) => {
    setFormData(prev => {
      const updatedQuantities = { ...prev.quantityRequirements };
      if (!updatedQuantities[product]) {
        updatedQuantities[product] = {};
      }
      updatedQuantities[product][timePeriod] = value;
      return { ...prev, quantityRequirements: updatedQuantities };
    });
  };

  const validateCurrentSection = () => {
    const newErrors = {};
    
    switch(currentSection) {
      case 1:
        if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
        if (!formData.consumerType) newErrors.consumerType = "Consumer type is required";
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
        if (formData.emailAddress && !/\S+@\S+\.\S+/.test(formData.emailAddress)) {
          newErrors.emailAddress = "Email address is invalid";
        }
        break;
        
      case 2:
        if (!formData.country.trim()) newErrors.country = "Country is required";
        if (!formData.cityTown.trim()) newErrors.cityTown = "City/Town is required";
        if (!formData.deliveryAddress.trim()) newErrors.deliveryAddress = "Delivery address is required";
        break;
        
      case 3:
        if (formData.consumerType !== "Individual Buyer" && !formData.businessOperationType) {
          newErrors.businessOperationType = "Business operation type is required";
        }
        if (formData.businessOperationType === "Other" && !formData.businessOperationOther.trim()) {
          newErrors.businessOperationOther = "Please specify your business type";
        }
        break;
        
      case 4:
        if (formData.productsInterested.length === 0) {
          newErrors.productsInterested = "Please select at least one product";
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
      default:
        return renderSectionA();
    }
  };

  const renderSectionA = () => (
    <div className="section-container">
      <h2>Section A: Personal & Business Information</h2>
      
      <div className="form-group">
        <label>1. Full Name *</label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleInputChange}
          placeholder="Enter your full name"
          className={errors.fullName ? 'error' : ''}
        />
        {errors.fullName && <span className="error-text">{errors.fullName}</span>}
      </div>

      <div className="form-group">
        <label>2. Name of Business / Organization (if applicable)</label>
        <input
          type="text"
          name="businessName"
          value={formData.businessName}
          onChange={handleInputChange}
          placeholder="Your business or organization name"
        />
      </div>

      <div className="form-group">
        <label>3. Type of Consumer *</label>
        <div className="radio-group">
          {consumerTypes.map(type => (
            <label key={type} className="radio-label">
              <input
                type="radio"
                name="consumerType"
                value={type}
                checked={formData.consumerType === type}
                onChange={handleInputChange}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
        {errors.consumerType && <span className="error-text">{errors.consumerType}</span>}
      </div>

      <div className="form-group">
        <label>4. Business Registration Number (optional)</label>
        <input
          type="text"
          name="registrationNumber"
          value={formData.registrationNumber}
          onChange={handleInputChange}
          placeholder="Business registration number"
        />
      </div>

      <div className="form-group">
        <label>5. Phone Number *</label>
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
        <label>6. Email Address</label>
        <input
          type="email"
          name="emailAddress"
          value={formData.emailAddress}
          onChange={handleInputChange}
          placeholder="your.email@example.com"
          className={errors.emailAddress ? 'error' : ''}
        />
        {errors.emailAddress && <span className="error-text">{errors.emailAddress}</span>}
      </div>

      <div className="form-group">
        <label>7. Postal Address</label>
        <textarea
          name="postalAddress"
          value={formData.postalAddress}
          onChange={handleInputChange}
          placeholder="Your complete postal address"
          rows="3"
        />
      </div>
    </div>
  );

  const renderSectionB = () => (
    <div className="section-container">
      <h2>Section B: Location Information</h2>
      
      <div className="form-group">
        <label>8. Country *</label>
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
        <label>9. Province/Region/State</label>
        <input
          type="text"
          name="provinceRegionState"
          value={formData.provinceRegionState}
          onChange={handleInputChange}
          placeholder="e.g., Khomas Region"
        />
      </div>

      <div className="form-group">
        <label>10. District/County</label>
        <input
          type="text"
          name="districtCounty"
          value={formData.districtCounty}
          onChange={handleInputChange}
          placeholder="e.g., Windhoek West"
        />
      </div>

      <div className="form-group">
        <label>11. City/Town *</label>
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
        <label>12. Delivery Address / Collection Point *</label>
        <textarea
          name="deliveryAddress"
          value={formData.deliveryAddress}
          onChange={handleInputChange}
          placeholder="Full address for delivery or collection"
          rows="3"
          className={errors.deliveryAddress ? 'error' : ''}
        />
        {errors.deliveryAddress && <span className="error-text">{errors.deliveryAddress}</span>}
      </div>

      <div className="form-group">
        <label>13. Name of receiver</label>
        <input
          type="text"
          name="receiverName"
          value={formData.receiverName}
          onChange={handleInputChange}
          placeholder="Person who receives deliveries"
        />
      </div>
    </div>
  );

  const renderSectionC = () => {
    // Only show business details for business consumers
    if (formData.consumerType === "Individual Buyer") {
      return (
        <div className="section-container">
          <h2>Section C: Business Details</h2>
          <p className="section-info">This section is not required for individual buyers.</p>
          <button className="btn-skip" onClick={() => setCurrentSection(prev => prev + 1)}>
            Skip to Next Section
          </button>
        </div>
      );
    }

    return (
      <div className="section-container">
        <h2>Section C: Business Details</h2>
        
        <div className="form-group">
          <label>14. Type of Business Operation *</label>
          <div className="checkbox-group">
            {businessOperations.map(operation => (
              <label key={operation} className="checkbox-label">
                <input
                  type="radio"
                  name="businessOperationType"
                  value={operation}
                  checked={formData.businessOperationType === operation}
                  onChange={handleInputChange}
                />
                <span>{operation}</span>
              </label>
            ))}
          </div>
          {errors.businessOperationType && <span className="error-text">{errors.businessOperationType}</span>}
        </div>

        {formData.businessOperationType === "Other" && (
          <div className="form-group">
            <label>Please specify:</label>
            <input
              type="text"
              name="businessOperationOther"
              value={formData.businessOperationOther}
              onChange={handleInputChange}
              placeholder="Specify your business type"
              className={errors.businessOperationOther ? 'error' : ''}
            />
            {errors.businessOperationOther && <span className="error-text">{errors.businessOperationOther}</span>}
          </div>
        )}

        {formData.businessOperationType === "Food processing" && (
          <div className="form-group">
            <label>Specify product:</label>
            <input
              type="text"
              name="foodProcessingProduct"
              value={formData.foodProcessingProduct || ""}
              onChange={handleInputChange}
              placeholder="e.g., flour milling, dairy products, etc."
            />
          </div>
        )}

        <div className="form-group">
          <label>15. Years in Operation</label>
          <div className="radio-group">
            {['<1 year', '1-3 years', '3-5 years', '5+ years'].map(year => (
              <label key={year} className="radio-label">
                <input
                  type="radio"
                  name="yearsInOperation"
                  value={year}
                  checked={formData.yearsInOperation === year}
                  onChange={handleInputChange}
                />
                <span>{year}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>16. Average Number of Customers Served Weekly (optional)</label>
          <input
            type="number"
            name="averageCustomersWeekly"
            value={formData.averageCustomersWeekly}
            onChange={handleInputChange}
            placeholder="e.g., 500"
            min="0"
          />
        </div>
      </div>
    );
  };

  const renderSectionD = () => (
    <div className="section-container">
      <h2>Section D: Product Interests</h2>
      
      <div className="form-group">
        <label>17. Products you are interested in purchasing *</label>
        <p className="field-description">Select all products you are interested in buying:</p>
        <div className="checkbox-grid">
          {productOptions.map(product => (
            <label key={product} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.productsInterested.includes(product)}
                onChange={(e) => handleProductInterestChange(product, e.target.checked)}
              />
              <span>{product}</span>
            </label>
          ))}
        </div>
        {errors.productsInterested && <span className="error-text">{errors.productsInterested}</span>}
      </div>

      {formData.productsInterested.length > 0 && (
        <div className="form-group">
          <label>18. Product Preferences</label>
          <p className="field-description">Specify preferences for each selected product:</p>
          <div className="product-preferences">
            {formData.productsInterested.map(product => (
              <div key={product} className="product-preference-item">
                <h4>{product}</h4>
                <div className="preference-fields">
                  <div className="preference-field">
                    <label>Preferred variety/type:</label>
                    <input
                      type="text"
                      value={formData.productPreferences[product]?.variety || ""}
                      onChange={(e) => handleProductPreferenceChange(product, "variety", e.target.value)}
                      placeholder={`e.g., ${product === "Maize" ? "white maize" : product === "Chicken" ? "free-range" : "specific type"}`}
                    />
                  </div>
                  <div className="preference-field">
                    <label>Grade/Quality preference:</label>
                    <select
                      value={formData.productPreferences[product]?.quality || ""}
                      onChange={(e) => handleProductPreferenceChange(product, "quality", e.target.value)}
                    >
                      <option value="">Select quality</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                      <option value="Organic">Organic</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSectionE = () => (
    <div className="section-container">
      <h2>Section E: Estimated Quantities Required</h2>
      
      {formData.productsInterested.length > 0 ? (
        <div className="form-group">
          <label>19. Quantity Requirements</label>
          <p className="field-description">Specify estimated quantities for each product (optional):</p>
          <div className="quantity-requirements">
            {formData.productsInterested.map(product => (
              <div key={product} className="quantity-item">
                <h4>{product}</h4>
                <div className="quantity-fields">
                  <div className="quantity-field">
                    <label>Daily requirement (if applicable):</label>
                    <input
                      type="text"
                      value={formData.quantityRequirements[product]?.daily || ""}
                      onChange={(e) => handleQuantityChange(product, "daily", e.target.value)}
                      placeholder="e.g., 50kg"
                    />
                  </div>
                  <div className="quantity-field">
                    <label>Weekly requirement:</label>
                    <input
                      type="text"
                      value={formData.quantityRequirements[product]?.weekly || ""}
                      onChange={(e) => handleQuantityChange(product, "weekly", e.target.value)}
                      placeholder="e.g., 200kg"
                    />
                  </div>
                  <div className="quantity-field">
                    <label>Monthly requirement:</label>
                    <input
                      type="text"
                      value={formData.quantityRequirements[product]?.monthly || ""}
                      onChange={(e) => handleQuantityChange(product, "monthly", e.target.value)}
                      placeholder="e.g., 1000kg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="section-info">No products selected. Please go back to Section D to select products.</p>
      )}
    </div>
  );

  const renderSectionF = () => (
    <div className="section-container">
      <h2>Section F: Supply Recurrence & Timing</h2>
      
      <div className="form-group">
        <label>20. Expected order size per delivery</label>
        <div className="radio-group">
          {['Small (1-50kg/units)', 'Medium (51-500kg/units)', 'Large (501kg-5tons)', 'Very large (5+ tons)'].map(size => (
            <label key={size} className="radio-label">
              <input
                type="radio"
                name="orderSize"
                value={size}
                checked={formData.orderSize === size}
                onChange={handleInputChange}
              />
              <span>{size}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>21. How often do you require supply?</label>
        <div className="radio-group">
          {['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Seasonal', 'On-demand / irregular'].map(freq => (
            <label key={freq} className="radio-label">
              <input
                type="radio"
                name="supplyFrequency"
                value={freq}
                checked={formData.supplyFrequency === freq}
                onChange={handleInputChange}
              />
              <span>{freq}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>22. Preferred delivery/collection days (Check all that apply)</label>
        <div className="checkbox-group">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
            <label key={day} className="checkbox-label">
              <input
                type="checkbox"
                name="preferredDeliveryDays-option"
                value={day}
                checked={formData.preferredDeliveryDays.includes(day)}
                onChange={handleInputChange}
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>23. Preferred time for delivery/collection</label>
        <div className="radio-group">
          {['Morning', 'Afternoon', 'Evening'].map(time => (
            <label key={time} className="radio-label">
              <input
                type="radio"
                name="preferredDeliveryTime"
                value={time}
                checked={formData.preferredDeliveryTime === time}
                onChange={handleInputChange}
              />
              <span>{time}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>24. Peak demand periods (e.g., holidays, seasons)</label>
        <textarea
          name="peakDemandPeriods"
          value={formData.peakDemandPeriods}
          onChange={handleInputChange}
          placeholder="e.g., December holidays, Easter, summer months"
          rows="3"
        />
      </div>
    </div>
  );

  const renderSectionG = () => (
    <div className="section-container">
      <h2>Section G: Packaging & Handling</h2>
      
      <div className="form-group">
        <label>25. Packaging preferences</label>
        <div className="radio-group">
          {['Bulk sacks', 'Boxes', 'Crates', 'Packaged units', 'No preference'].map(pref => (
            <label key={pref} className="radio-label">
              <input
                type="radio"
                name="packagingPreferences"
                value={pref}
                checked={formData.packagingPreferences === pref}
                onChange={handleInputChange}
              />
              <span>{pref}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>26. Storage or handling requirements (Check all that apply)</label>
        <div className="checkbox-group">
          {['Cold chain required', 'Dry storage', 'Fragile produce handling', 'None'].map(req => (
            <label key={req} className="checkbox-label">
              <input
                type="checkbox"
                name="storageRequirements-option"
                value={req}
                checked={formData.storageRequirements.includes(req)}
                onChange={handleInputChange}
              />
              <span>{req}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSectionH = () => (
    <div className="section-container">
      <h2>Section H: Challenges & Support Needed</h2>
      
      <div className="form-group">
        <label>27. What are your biggest challenges when sourcing products? (Check all that apply)</label>
        <div className="checkbox-grid">
          {[
            'Inconsistent supply', 'Poor quality products', 'High prices', 
            'Lack of trusted farmers', 'Transport limitations', 
            'Limited product variety', 'Other'
          ].map(challenge => (
            <label key={challenge} className="checkbox-label">
              <input
                type="checkbox"
                name="sourcingChallenges-option"
                value={challenge}
                checked={formData.sourcingChallenges.includes(challenge)}
                onChange={handleInputChange}
              />
              <span>{challenge}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>28. What support or services would you like from the application? (Check all that apply)</label>
        <div className="checkbox-grid">
          {[
            'Guaranteed supply', 'Better pricing', 'Logistics support', 
            'Product quality verification', 'Real-time availability updates',
            'Payment processing', 'Contract farming options', 'Quality certification'
          ].map(support => (
            <label key={support} className="checkbox-label">
              <input
                type="checkbox"
                name="desiredSupport-option"
                value={support}
                checked={formData.desiredSupport.includes(support)}
                onChange={handleInputChange}
              />
              <span>{support}</span>
            </label>
          ))}
        </div>
      </div>

      {formData.desiredSupport.includes("Other") && (
        <div className="form-group">
          <label>Please specify other support needed:</label>
          <textarea
            name="otherSupport"
            value={formData.otherSupport || ""}
            onChange={handleInputChange}
            placeholder="Describe other support services you need"
            rows="3"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="consumer-questionnaire">
      <div className="questionnaire-header">
        <h1>Consumer Registration Questionnaire</h1>
        <p>Complete all sections to register as a verified consumer/buyer</p>
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