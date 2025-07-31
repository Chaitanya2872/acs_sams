const crypto = require('crypto');

/**
 * Structure Number Generator Utility
 * Handles generation and parsing of structural identity numbers
 * Format: AA##AAAA#######AA (17 characters)
 * Example: TS01VSKPAP00001 01
 */
class StructureNumberGenerator {
  constructor() {
    // Structure type mapping
    this.structureTypes = {
      'residential': '01',
      'commercial': '02',
      'educational': '03',
      'hospital': '04',
      'industrial': '05'
    };

    // Reverse mapping for parsing
    this.typeCodeToName = {
      '01': 'residential',
      '02': 'commercial',
      '03': 'educational',
      '04': 'hospital',
      '05': 'industrial'
    };

    // Valid state codes (Indian states)
    this.validStateCodes = [
      'AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CG', 'DD', 'DL', 'DN', 'GA', 'GJ', 
      'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 
      'NL', 'OD', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TS', 'TR', 'UK', 'UP', 'WB'
    ];
  }

  /**
   * Generate a unique UID for structure initialization
   * Format: UID-YYYYMMDD-###
   */
  generateUID() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `UID-${dateStr}-${randomSuffix}`;
  }

  /**
   * Generate complete structure number and components
   * @param {Object} locationData - Location details
   * @param {string} sequenceNumber - 5-digit sequence number
   * @returns {Object} Generated structure number with components
   */
  generateStructureNumber(locationData, sequenceNumber) {
    const {
      state_code,
      district_code,
      city_name,
      location_code,
      type_of_structure
    } = locationData;

    // Validate inputs
    this.validateLocationData(locationData);

    // Generate components
    const components = {
      state_code: this.formatStateCode(state_code),
      district_code: this.formatDistrictCode(district_code),
      city_code: this.formatCityCode(city_name),
      location_code: this.formatLocationCode(location_code),
      structure_sequence: this.formatSequenceNumber(sequenceNumber),
      type_code: this.getTypeCode(type_of_structure)
    };

    // Generate structural identity number
    const structural_identity_number = 
      components.state_code +
      components.district_code +
      components.city_code +
      components.location_code +
      components.structure_sequence +
      components.type_code;

    // Generate formatted display
    const formatted_display = 
      `${components.state_code}-${components.district_code}-${components.city_code}-${components.location_code}-${components.structure_sequence}-${components.type_code}`;

    return {
      structural_identity_number,
      formatted_display,
      components,
      metadata: {
        generated_at: new Date(),
        total_length: structural_identity_number.length,
        is_valid: this.validateStructureNumber(structural_identity_number)
      }
    };
  }

  /**
   * Parse existing structural identity number
   * @param {string} structureNumber - 17-character structure number
   * @returns {Object} Parsed components
   */
  parseStructuralIdentityNumber(structureNumber) {
    if (!structureNumber || structureNumber.length !== 17) {
      throw new Error('Invalid structure number length. Must be exactly 17 characters.');
    }

    // Validate format
    const formatRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z]{2}[0-9]{5}[0-9]{2}$/;
    if (!formatRegex.test(structureNumber)) {
      throw new Error('Invalid structure number format. Must match: AA##AAAA#######AA');
    }

    const components = {
      state_code: structureNumber.substring(0, 2),
      district_code: structureNumber.substring(2, 4),
      city_code: structureNumber.substring(4, 8),
      location_code: structureNumber.substring(8, 10),
      structure_sequence: structureNumber.substring(10, 15),
      type_code: structureNumber.substring(15, 17)
    };

    // Validate state code
    if (!this.validStateCodes.includes(components.state_code)) {
      throw new Error(`Invalid state code: ${components.state_code}`);
    }

    // Validate type code
    if (!this.typeCodeToName[components.type_code]) {
      throw new Error(`Invalid type code: ${components.type_code}`);
    }

    return {
      ...components,
      type_name: this.typeCodeToName[components.type_code],
      parsed_at: new Date(),
      is_valid: true
    };
  }

  /**
   * Get location prefix for sequence generation
   * @param {string} stateCode - State code
   * @param {string} districtCode - District code
   * @param {string} cityName - City name
   * @param {string} locationCode - Location code
   * @returns {string} Location prefix
   */
  getLocationPrefix(stateCode, districtCode, cityName, locationCode) {
    const formattedState = this.formatStateCode(stateCode);
    const formattedDistrict = this.formatDistrictCode(districtCode);
    const formattedCity = this.formatCityCode(cityName);
    const formattedLocation = this.formatLocationCode(locationCode);

    return formattedState + formattedDistrict + formattedCity + formattedLocation;
  }

  /**
   * Validate location data
   * @param {Object} locationData - Location data to validate
   */
  validateLocationData(locationData) {
    const { state_code, district_code, city_name, location_code, type_of_structure } = locationData;

    if (!state_code || state_code.length !== 2) {
      throw new Error('State code must be exactly 2 characters');
    }

    if (!this.validStateCodes.includes(state_code.toUpperCase())) {
      throw new Error(`Invalid state code: ${state_code}. Must be a valid Indian state code.`);
    }

    if (!district_code || !/^[0-9]{1,2}$/.test(district_code)) {
      throw new Error('District code must be 1-2 digits');
    }

    if (!city_name || !/^[A-Za-z]{1,4}$/.test(city_name)) {
      throw new Error('City name must be 1-4 alphabetic characters');
    }

    if (!location_code || !/^[A-Za-z]{1,2}$/.test(location_code)) {
      throw new Error('Location code must be 1-2 alphabetic characters');
    }

    if (!type_of_structure || !this.structureTypes[type_of_structure]) {
      throw new Error(`Invalid structure type: ${type_of_structure}. Must be one of: ${Object.keys(this.structureTypes).join(', ')}`);
    }
  }

  /**
   * Format state code to 2 uppercase characters
   */
  formatStateCode(stateCode) {
    return stateCode.toUpperCase().padEnd(2, 'X').substring(0, 2);
  }

  /**
   * Format district code to 2 digits with leading zeros
   */
  formatDistrictCode(districtCode) {
    return districtCode.toString().padStart(2, '0').substring(0, 2);
  }

  /**
   * Format city code to 4 uppercase characters, padding with X
   */
  formatCityCode(cityName) {
    return cityName.toUpperCase().padEnd(4, 'X').substring(0, 4);
  }

  /**
   * Format location code to 2 uppercase characters, padding with X
   */
  formatLocationCode(locationCode) {
    return locationCode.toUpperCase().padEnd(2, 'X').substring(0, 2);
  }

  /**
   * Format sequence number to 5 digits with leading zeros
   */
  formatSequenceNumber(sequenceNumber) {
    if (typeof sequenceNumber === 'string' && sequenceNumber.length === 5) {
      return sequenceNumber;
    }
    
    const num = parseInt(sequenceNumber) || 1;
    return num.toString().padStart(5, '0');
  }

  /**
   * Get type code from structure type
   */
  getTypeCode(structureType) {
    const typeCode = this.structureTypes[structureType];
    if (!typeCode) {
      throw new Error(`Invalid structure type: ${structureType}`);
    }
    return typeCode;
  }

  /**
   * Generate timestamp-based sequence for fallback
   */
  generateTimestampSequence() {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-5);
    return timestamp.padStart(5, '0');
  }

  /**
   * Validate complete structure number format
   * @param {string} structureNumber - Structure number to validate
   * @returns {boolean} Is valid
   */
  validateStructureNumber(structureNumber) {
    try {
      if (!structureNumber || structureNumber.length !== 17) {
        return false;
      }

      const formatRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z]{2}[0-9]{5}[0-9]{2}$/;
      if (!formatRegex.test(structureNumber)) {
        return false;
      }

      // Validate state code
      const stateCode = structureNumber.substring(0, 2);
      if (!this.validStateCodes.includes(stateCode)) {
        return false;
      }

      // Validate type code
      const typeCode = structureNumber.substring(15, 17);
      if (!this.typeCodeToName[typeCode]) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate structure number with zip code integration
   * Note: Zip code is stored separately in the database for validation and search purposes
   * @param {Object} locationData - Location data including zip code
   * @param {string} sequenceNumber - Sequence number
   * @returns {Object} Generated structure number with zip code metadata
   */
  generateStructureNumberWithZipCode(locationData, sequenceNumber) {
    const { zip_code, ...structureLocationData } = locationData;

    // Validate zip code
    if (!zip_code || !/^[0-9]{6}$/.test(zip_code)) {
      throw new Error('Zip code must be exactly 6 digits');
    }

    // Generate standard structure number
    const structureNumberData = this.generateStructureNumber(structureLocationData, sequenceNumber);

    // Add zip code metadata
    return {
      ...structureNumberData,
      zip_code_metadata: {
        zip_code: zip_code,
        state_code: structureLocationData.state_code,
        integrated_at: new Date(),
        validation_status: 'verified'
      }
    };
  }

  /**
   * Generate QR code data for structure
   * @param {string} structureNumber - Structure identity number
   * @param {string} uid - Structure UID
   * @param {string} zipCode - Zip code
   * @returns {Object} QR code data
   */
  generateQRCodeData(structureNumber, uid, zipCode) {
    const qrData = {
      structure_id: structureNumber,
      uid: uid,
      zip_code: zipCode,
      generated_at: new Date().toISOString(),
      version: '1.0'
    };

    return {
      qr_data: qrData,
      qr_string: JSON.stringify(qrData),
      display_text: `${structureNumber} | ${uid} | PIN: ${zipCode}`
    };
  }

  /**
   * Bulk validate structure numbers
   * @param {Array} structureNumbers - Array of structure numbers to validate
   * @returns {Array} Validation results
   */
  bulkValidateStructureNumbers(structureNumbers) {
    if (!Array.isArray(structureNumbers)) {
      throw new Error('Input must be an array of structure numbers');
    }

    return structureNumbers.map(structureNumber => {
      try {
        const parsed = this.parseStructuralIdentityNumber(structureNumber);
        return {
          structure_number: structureNumber,
          is_valid: true,
          parsed_components: parsed,
          error: null
        };
      } catch (error) {
        return {
          structure_number: structureNumber,
          is_valid: false,
          parsed_components: null,
          error: error.message
        };
      }
    });
  }

  /**
   * Get statistics for a location prefix
   * @param {string} locationPrefix - Location prefix to analyze
   * @returns {Object} Location statistics
   */
  getLocationPrefixInfo(locationPrefix) {
    if (!locationPrefix || locationPrefix.length < 4) {
      throw new Error('Location prefix must be at least 4 characters');
    }

    try {
      const stateCode = locationPrefix.substring(0, 2);
      const districtCode = locationPrefix.substring(2, 4);
      const cityCode = locationPrefix.length >= 8 ? locationPrefix.substring(4, 8) : 'XXXX';
      const locationCode = locationPrefix.length >= 10 ? locationPrefix.substring(8, 10) : 'XX';

      return {
        location_prefix: locationPrefix,
        components: {
          state_code: stateCode,
          district_code: districtCode,
          city_code: cityCode,
          location_code: locationCode
        },
        is_complete: locationPrefix.length === 10,
        level: this.getLocationLevel(locationPrefix.length),
        description: this.getLocationDescription(stateCode, districtCode, cityCode, locationCode)
      };
    } catch (error) {
      throw new Error(`Invalid location prefix: ${error.message}`);
    }
  }

  /**
   * Get location level based on prefix length
   */
  getLocationLevel(prefixLength) {
    switch (prefixLength) {
      case 2: return 'state';
      case 4: return 'district';
      case 8: return 'city';
      case 10: return 'location';
      default: return 'partial';
    }
  }

  /**
   * Get location description
   */
  getLocationDescription(stateCode, districtCode, cityCode, locationCode) {
    let description = `State: ${stateCode}`;
    
    if (districtCode !== 'XX') {
      description += `, District: ${districtCode}`;
    }
    
    if (cityCode !== 'XXXX') {
      description += `, City: ${cityCode}`;
    }
    
    if (locationCode !== 'XX') {
      description += `, Location: ${locationCode}`;
    }
    
    return description;
  }
}

module.exports = StructureNumberGenerator;