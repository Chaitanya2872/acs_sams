/**
 * Structure Number Generation Logic for SAMS
 * Based on SAMS Manual - Structural Identity Number Format (17 A/N)
 * Format: STATE(2A) + DISTRICT(2N) + CITY(4A) + LOCATION(2A) + STRUCTURE(5N) + TYPE(2N)
 */

class StructureNumberGenerator {
  constructor() {
    // Type of structure codes as per SAMS manual
    this.structureTypeCodes = {
      'residential': '01',
      'commercial': '02', 
      'educational': '03',
      'hospital': '04',
      'industrial': '05'
    };

    // Indian state codes as per RTO standards
    this.validStateCodes = [
      'AN', // Andaman & Nicobar Islands
      'AP', // Andhra Pradesh
      'AR', // Arunachal Pradesh
      'AS', // Assam
      'BR', // Bihar
      'CH', // Chandigarh
      'CG', // Chhattisgarh
      'DD', // Daman and Diu
      'DL', // Delhi
      'DN', // Dadra and Nagar Haveli
      'GA', // Goa
      'GJ', // Gujarat
      'HP', // Himachal Pradesh
      'HR', // Haryana
      'JH', // Jharkhand
      'JK', // Jammu & Kashmir
      'KA', // Karnataka
      'KL', // Kerala
      'LD', // Lakshadweep
      'MH', // Maharashtra
      'ML', // Meghalaya
      'MN', // Manipur
      'MP', // Madhya Pradesh
      'MZ', // Mizoram
      'NL', // Nagaland
      'OD', // Odisha
      'PB', // Punjab
      'PY', // Puducherry
      'RJ', // Rajasthan
      'SK', // Sikkim
      'TN', // Tamil Nadu
      'TS', // Telangana
      'TR', // Tripura
      'UK', // Uttarakhand
      'UP', // Uttar Pradesh
      'WB'  // West Bengal
    ];
  }

  /**
   * Generate Structural Identity Number (17 characters)
   * Format: STATE(2A) + DISTRICT(2N) + CITY(4A) + LOCATION(2A) + SEQUENCE(5N) + TYPE(2N)
   * 
   * @param {Object} locationData - Location details
   * @param {string} locationData.state_code - 2 character state code (e.g., "AP")
   * @param {string} locationData.district_code - 2 character district code (e.g., "03") 
   * @param {string} locationData.city_name - 4 character city code (e.g., "VSKP")
   * @param {string} locationData.location_code - 2 character location code (e.g., "DH")
   * @param {string} locationData.type_of_structure - Structure type enum
   * @param {string} [customSequence] - Optional custom sequence number
   * @returns {Object} Generated structure numbers and codes
   */
  generateStructureNumber(locationData, customSequence = null) {
    const { state_code, district_code, city_name, location_code, type_of_structure } = locationData;
    
    // Validate input data
    this.validateLocationData(locationData);
    
    // Format components to required lengths
    const stateCode = this.formatStateCode(state_code);
    const districtCode = this.formatDistrictCode(district_code);
    const cityCode = this.formatCityCode(city_name);
    const locationCode = this.formatLocationCode(location_code);
    const typeCode = this.structureTypeCodes[type_of_structure];
    
    // Use custom sequence or generate new one
    const structureSequence = customSequence || this.generateTimestampSequence();
    
    // Construct the 17-character Structural Identity Number
    const structuralIdentityNumber = `${stateCode}${districtCode}${cityCode}${locationCode}${structureSequence}${typeCode}`;
    
    // Generate unique UID (separate from structural identity number)
    const uid = this.generateUID();
    
    return {
      uid: uid,
      structural_identity_number: structuralIdentityNumber,
      components: {
        state_code: stateCode,
        district_code: districtCode, 
        city_code: cityCode,
        location_code: locationCode,
        structure_sequence: structureSequence,
        type_code: typeCode
      },
      formatted_display: `${stateCode}-${districtCode}-${cityCode}-${locationCode}-${structureSequence}-${typeCode}`,
      location_prefix: `${stateCode}${districtCode}${cityCode}${locationCode}`
    };
  }

  /**
   * Validate location data inputs
   */
  validateLocationData(data) {
    const { state_code, district_code, city_name, location_code, type_of_structure } = data;
    
    if (!state_code || state_code.length !== 2) {
      throw new Error('State code must be exactly 2 characters');
    }
    
    if (!this.validStateCodes.includes(state_code.toUpperCase())) {
      throw new Error(`Invalid state code: ${state_code}. Must be a valid Indian state code.`);
    }
    
    if (!district_code || !/^[0-9]{1,2}$/.test(district_code)) {
      throw new Error('District code must be 1-2 digits');
    }
    
    if (!city_name || city_name.length > 4 || !/^[A-Za-z]+$/.test(city_name)) {
      throw new Error('City name must be 1-4 alphabetic characters');
    }
    
    if (!location_code || location_code.length > 2 || !/^[A-Za-z]+$/.test(location_code)) {
      throw new Error('Location code must be 1-2 alphabetic characters');
    }
    
    if (!this.structureTypeCodes[type_of_structure]) {
      throw new Error(`Invalid structure type: ${type_of_structure}`);
    }
  }

  /**
   * Format state code to 2 uppercase alphabets
   */
  formatStateCode(stateCode) {
    return stateCode.toUpperCase().padEnd(2, 'X').substring(0, 2);
  }

  /**
   * Format district code to 2 digits
   */
  formatDistrictCode(districtCode) {
    return districtCode.padStart(2, '0').substring(0, 2);
  }

  /**
   * Format city code to 4 uppercase alphabets
   */
  formatCityCode(cityName) {
    const upper = cityName.toUpperCase();
    return upper.padEnd(4, 'X').substring(0, 4);
  }

  /**
   * Format location code to 2 uppercase alphabets
   */
  formatLocationCode(locationCode) {
    const upper = locationCode.toUpperCase();
    return upper.padEnd(2, 'X').substring(0, 2);
  }

  /**
   * Generate timestamp-based sequence number (5 digits)
   * This is used as fallback when database sequence is not available
   */
  generateTimestampSequence() {
    const timestamp = Date.now().toString();
    const lastFive = timestamp.slice(-5);
    return lastFive.padStart(5, '0');
  }

  /**
   * Generate database-based sequential number for the location (5 digits)
   * This should be called from the controller with proper database access
   */
  formatSequenceNumber(sequenceNumber) {
    return sequenceNumber.toString().padStart(5, '0');
  }

  /**
   * Generate unique UID (separate from structural identity number)
   */
  generateUID() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `STR_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Parse existing structural identity number back to components
   */
  parseStructuralIdentityNumber(structuralIdentityNumber) {
    if (!structuralIdentityNumber || structuralIdentityNumber.length !== 17) {
      throw new Error('Structural identity number must be exactly 17 characters');
    }

    if (!/^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z]{2}[0-9]{5}[0-9]{2}$/.test(structuralIdentityNumber)) {
      throw new Error('Invalid structural identity number format');
    }

    return {
      state_code: structuralIdentityNumber.substring(0, 2),
      district_code: structuralIdentityNumber.substring(2, 4),
      city_code: structuralIdentityNumber.substring(4, 8),
      location_code: structuralIdentityNumber.substring(8, 10),
      structure_sequence: structuralIdentityNumber.substring(10, 15),
      type_code: structuralIdentityNumber.substring(15, 17)
    };
  }

  /**
   * Get location prefix for database queries
   */
  getLocationPrefix(stateCode, districtCode, cityName, locationCode) {
    const formattedStateCode = this.formatStateCode(stateCode);
    const formattedDistrictCode = this.formatDistrictCode(districtCode);
    const formattedCityCode = this.formatCityCode(cityName);
    const formattedLocationCode = this.formatLocationCode(locationCode);
    
    return `${formattedStateCode}${formattedDistrictCode}${formattedCityCode}${formattedLocationCode}`;
  }

  /**
   * Validate structure type and return type code
   */
  getTypeCode(structureType) {
    const typeCode = this.structureTypeCodes[structureType];
    if (!typeCode) {
      throw new Error(`Invalid structure type: ${structureType}`);
    }
    return typeCode;
  }

  /**
   * Get structure type from type code
   */
  getStructureTypeFromCode(typeCode) {
    const typeMap = Object.fromEntries(
      Object.entries(this.structureTypeCodes).map(([key, value]) => [value, key])
    );
    return typeMap[typeCode] || 'unknown';
  }

  /**
   * Validate and format complete location data
   */
  formatAndValidateLocationData(locationData) {
    this.validateLocationData(locationData);
    
    return {
      state_code: this.formatStateCode(locationData.state_code),
      district_code: this.formatDistrictCode(locationData.district_code),
      city_code: this.formatCityCode(locationData.city_name),
      location_code: this.formatLocationCode(locationData.location_code),
      type_code: this.getTypeCode(locationData.type_of_structure),
      type_of_structure: locationData.type_of_structure
    };
  }
}

module.exports = StructureNumberGenerator;