const { STATE_CODES, STRUCTURAL_FORM_CODES, MATERIAL_CODES, STRUCTURE_TYPE_CODES, AGE_CODES } = require('./constants');

// Generate structure unique ID
const generateStructureUID = (structuralIdentityNumber) => {
    const { stateCode, districtCode, cityName, locationCode, structureNumber, typeOfStructure } = structuralIdentityNumber;
    return `${stateCode}${districtCode}${cityName}${locationCode}${structureNumber}${typeOfStructure}`;
};

// Validate coordinates
const isValidCoordinate = (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Calculate structure age group based on construction year
const calculateAgeGroup = (constructionYear) => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - constructionYear;
    
    if (age >= 50 && age <= 60) return '1';
    if (age >= 40 && age <= 49) return '2';
    if (age >= 30 && age <= 39) return '3';
    if (age >= 15 && age <= 29) return '4';
    if (age >= 1 && age <= 14) return '5';
    
    return '5'; // Default to newest category
};

// Check if structure requires immediate attention
const requiresImmediateAttention = (structuralRating, nonStructuralRating) => {
    const { beamsRating, columnsRating, slabRating, foundationRating } = structuralRating;
    
    // Any structural component with rating 1 or 2 requires immediate attention
    if (beamsRating <= 2 || columnsRating <= 2 || slabRating <= 2 || foundationRating <= 2) {
        return true;
    }
    
    // Check non-structural components for critical issues
    const criticalNonStructural = Object.values(nonStructuralRating).some(item => item.rating <= 1);
    
    return criticalNonStructural;
};

// Calculate priority score for maintenance
const calculatePriorityScore = (structure) => {
    const { structuralRating, nonStructuralRating, structuralClassification } = structure;
    
    let score = 0;
    
    // Structural ratings (higher weight)
    score += (6 - structuralRating.beamsRating) * 4;
    score += (6 - structuralRating.columnsRating) * 4;
    score += (6 - structuralRating.slabRating) * 4;
    score += (6 - structuralRating.foundationRating) * 4;
    
    // Non-structural ratings (lower weight)
    Object.values(nonStructuralRating).forEach(item => {
        score += (6 - item.rating) * 1;
    });
    
    // Age factor
    const ageWeight = {
        '1': 5, // 50-60 years
        '2': 4, // 40-49 years
        '3': 3, // 30-39 years
        '4': 2, // 15-29 years
        '5': 1  // 1-14 years
    };
    score += ageWeight[structuralClassification.ageOfStructure] || 1;
    
    return score;
};

// Format response data
const formatStructureResponse = (structure) => {
    return {
        id: structure._id,
        uid: generateStructureUID(structure.structuralIdentityNumber),
        popularName: structure.administrationDetails.popularNameOfStructure,
        location: structure.structuralIdentityNumber.cityName,
        status: structure.status,
        overallCondition: getOverallCondition(structure),
        createdAt: structure.createdAt,
        updatedAt: structure.updatedAt
    };
};

// Get overall condition based on ratings
const getOverallCondition = (structure) => {
    const { structuralRating } = structure;
    const avgStructuralRating = (
        structuralRating.beamsRating + 
        structuralRating.columnsRating + 
        structuralRating.slabRating + 
        structuralRating.foundationRating
    ) / 4;
    
    if (avgStructuralRating >= 4.5) return 'excellent';
    if (avgStructuralRating >= 3.5) return 'good';
    if (avgStructuralRating >= 2.5) return 'fair';
    if (avgStructuralRating >= 1.5) return 'poor';
    return 'critical';
};

// Pagination helper
const getPagination = (page, size) => {
    const limit = size ? +size : 10;
    const offset = page ? page * limit : 0;
    
    return { limit, offset };
};

module.exports = {
    generateStructureUID,
    isValidCoordinate,
    calculateAgeGroup,
    requiresImmediateAttention,
    calculatePriorityScore,
    formatStructureResponse,
    getOverallCondition,
    getPagination
};