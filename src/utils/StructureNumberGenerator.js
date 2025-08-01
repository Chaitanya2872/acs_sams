const crypto = require('crypto');

/**
 * Structure Number Generator Utility
 * Handles generation and parsing of structural identity numbers
 * Format: AA##AAAA#######AA (17 characters)
 * Example: TS01VSKPAP00001 01
 */
class StructureNumberGenerator {
  constructor() {
    this.typeCodeMap = {
      'residential': '01',
      'commercial': '02', 
      'educational': '03',
      'hospital': '04',
      'industrial': '05'
    };
  }

  /**
   * Generate complete structure number
   * @param {Object} structureData - Structure location and type data
   * @param {string} sequence - 5-digit sequence number
   * @returns {Object} Generated numbers and components
   */
  generateStructureNumber(structureData, sequence) {
    const { state_code, district_code, city_name, location_code, type_of_structure } = structureData;
    
    // Format components
    const components = {
      state_code: state_code.toUpperCase().padEnd(2, 'X').substring(0, 2),
      district_code: district_code.padStart(2, '0'),
      city_code: this.formatCityCode(city_name),
      location_code: this.formatLocationCode(location_code),
      structure_sequence: sequence,
      type_code: this.typeCodeMap[type_of_structure] || '01'
    };
    
    // Generate structural identity number (17 characters)
    const structural_identity_number = 
      components.state_code + 
      components.district_code + 
      components.city_code + 
      components.location_code + 
      components.structure_sequence + 
      components.type_code;
    
    return {
      structural_identity_number,
      components,
      formatted_display: `${components.state_code}-${components.district_code}-${components.city_code}-${components.location_code}-${components.structure_sequence}-${components.type_code}`
    };
  }

  /**
   * Format city name to 4-character code
   * @param {string} cityName 
   * @returns {string} 4-character city code
   */
  formatCityCode(cityName) {
    if (!cityName) return 'XXXX';
    
    const cleaned = cityName.replace(/\s+/g, '').toUpperCase();
    return cleaned.padEnd(4, 'X').substring(0, 4);
  }

  /**
   * Format location code to 2-character code
   * @param {string} locationCode 
   * @returns {string} 2-character location code
   */
  formatLocationCode(locationCode) {
    if (!locationCode) return 'XX';
    
    const cleaned = locationCode.toUpperCase();
    return cleaned.padEnd(2, 'X').substring(0, 2);
  }

  /**
   * Format sequence number to 5 digits
   * @param {number} sequence 
   * @returns {string} 5-digit sequence
   */
  formatSequenceNumber(sequence) {
    return sequence.toString().padStart(5, '0');
  }

  /**
   * Generate timestamp-based sequence (fallback)
   * @returns {string} 5-digit sequence based on timestamp
   */
  generateTimestampSequence() {
    const timestamp = Date.now();
    const sequence = (timestamp % 99999) + 1;
    return this.formatSequenceNumber(sequence);
  }

  /**
   * Get location prefix for searching existing structures
   * @param {string} stateCode 
   * @param {string} districtCode 
   * @param {string} cityName 
   * @param {string} locationCode 
   * @returns {string} Location prefix
   */
  getLocationPrefix(stateCode, districtCode, cityName, locationCode) {
    const components = {
      state_code: stateCode.toUpperCase().padEnd(2, 'X').substring(0, 2),
      district_code: districtCode.padStart(2, '0'),
      city_code: this.formatCityCode(cityName),
      location_code: this.formatLocationCode(locationCode)
    };
    
    return components.state_code + components.district_code + components.city_code + components.location_code;
  }

  /**
   * Parse structural identity number into components
   * @param {string} structuralIdentityNumber 
   * @returns {Object} Parsed components
   */
  parseStructuralIdentityNumber(structuralIdentityNumber) {
    if (!structuralIdentityNumber || structuralIdentityNumber.length !== 17) {
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
   * Validate structural identity number format
   * @param {string} structuralIdentityNumber 
   * @returns {boolean} Is valid
   */
  validateStructuralIdentityNumber(structuralIdentityNumber) {
    if (!structuralIdentityNumber || structuralIdentityNumber.length !== 17) {
      return false;
    }
    
    // Check format: 2 letters + 2 digits + 4 letters + 2 letters + 5 digits + 2 digits
    const pattern = /^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z]{2}[0-9]{5}[0-9]{2}$/;
    return pattern.test(structuralIdentityNumber);
  }

  /**
   * Get next available sequence number for location
   * @param {string} locationPrefix 
   * @param {Array} existingStructures 
   * @returns {string} Next sequence number
   */
  getNextSequenceForPrefix(locationPrefix, existingStructures = []) {
    const existingSequences = existingStructures
      .filter(num => num.startsWith(locationPrefix))
      .map(num => parseInt(num.substring(10, 15)))
      .filter(seq => !isNaN(seq));
    
    const maxSequence = existingSequences.length > 0 ? Math.max(...existingSequences) : 0;
    return this.formatSequenceNumber(maxSequence + 1);
  }

  /**
   * Generate random UID for structure
   * @returns {string} 8-12 character UID
   */
  generateUID() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const uid = `${random}${timestamp}`.substring(0, 12);
    return uid;
  }
}

module.exports = StructureNumberGenerator;

module.exports = StructureNumberGenerator;