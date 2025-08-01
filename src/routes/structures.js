const express = require('express');
const structureController = require('../controllers/structureController');
const { authenticateToken } = require('../middlewares/auth');
// Import the new validation
const { 
  locationValidation, 
  administrativeValidation, 
  geometricDetailsValidation,
  floorValidation,
  flatValidation,
  flatStructuralRatingValidation,
  flatNonStructuralRatingValidation,
  overallStructuralRatingValidation,
  overallNonStructuralRatingValidation,
  structureNumberValidation,
  bulkRatingsValidation // Add this import
} = require('../utils/screenValidators');
const { handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// =================== STRUCTURE INITIALIZATION ===================
/**
 * @route   POST /api/structures/initialize
 * @desc    Initialize a new structure (creates draft)
 * @access  Private
 */
router.post('/initialize', structureController.initializeStructure);

// =================== LOCATION DETAILS ===================
/**
 * @route   POST /api/structures/:id/location
 * @desc    Save location details (Structure Identification + GPS + Zip Code)
 * @access  Private
 */
router.post('/:id/location', 
  locationValidation, 
  handleValidationErrors, 
  structureController.saveLocationScreen
);

/**
 * @route   GET /api/structures/:id/location
 * @desc    Get location details
 * @access  Private
 */
router.get('/:id/location', structureController.getLocationScreen);

/**
 * @route   PUT /api/structures/:id/location
 * @desc    Update location details
 * @access  Private
 */
router.put('/:id/location', 
  locationValidation, 
  handleValidationErrors, 
  structureController.updateLocationScreen
);



// =================== ADMINISTRATIVE DETAILS ===================
/**
 * @route   POST /api/structures/:id/administrative
 * @desc    Save administrative details
 * @access  Private
 */
router.post('/:id/administrative', 
  administrativeValidation, 
  handleValidationErrors, 
  structureController.saveAdministrativeScreen
);

/**
 * @route   GET /api/structures/:id/administrative
 * @desc    Get administrative details
 * @access  Private
 */
router.get('/:id/administrative', structureController.getAdministrativeScreen);

/**
 * @route   PUT /api/structures/:id/administrative
 * @desc    Update administrative details
 * @access  Private
 */
router.put('/:id/administrative', 
  administrativeValidation, 
  handleValidationErrors, 
  structureController.updateAdministrativeScreen
);

// =================== GEOMETRIC DETAILS (Building Dimensions Only) ===================
/**
 * @route   POST /api/structures/:id/geometric-details
 * @desc    Save geometric details (building dimensions only)
 * @access  Private
 */
router.post('/:id/geometric-details', 
  geometricDetailsValidation, 
  handleValidationErrors, 
  structureController.saveGeometricDetails
);

/**
 * @route   GET /api/structures/:id/geometric-details
 * @desc    Get geometric details
 * @access  Private
 */
router.get('/:id/geometric-details', structureController.getGeometricDetails);

/**
 * @route   PUT /api/structures/:id/geometric-details
 * @desc    Update geometric details
 * @access  Private
 */
router.put('/:id/geometric-details', 
  geometricDetailsValidation, 
  handleValidationErrors, 
  structureController.updateGeometricDetails
);

// =================== FLOORS MANAGEMENT ===================
/**
 * @route   POST /api/structures/:id/floors
 * @desc    Add floors to structure (generates floor IDs)
 * @access  Private
 */
router.post('/:id/floors', 
  floorValidation, 
  handleValidationErrors, 
  structureController.addFloors
);

/**
 * @route   GET /api/structures/:id/floors
 * @desc    Get all floors in structure
 * @access  Private
 */
router.get('/:id/floors', structureController.getFloors);

/**
 * @route   GET /api/structures/:id/floors/:floorId
 * @desc    Get specific floor details
 * @access  Private
 */
router.get('/:id/floors/:floorId', structureController.getFloorById);

/**
 * @route   PUT /api/structures/:id/floors/:floorId
 * @desc    Update floor details
 * @access  Private
 */
router.put('/:id/floors/:floorId', 
  floorValidation, 
  handleValidationErrors, 
  structureController.updateFloor
);

/**
 * @route   DELETE /api/structures/:id/floors/:floorId
 * @desc    Delete a floor
 * @access  Private
 */
router.delete('/:id/floors/:floorId', structureController.deleteFloor);

// =================== FLATS MANAGEMENT ===================
/**
 * @route   POST /api/structures/:id/floors/:floorId/flats
 * @desc    Add flats to floor (generates flat IDs)
 * @access  Private
 */
router.post('/:id/floors/:floorId/flats', 
  flatValidation, 
  handleValidationErrors, 
  structureController.addFlatsToFloor
);

/**
 * @route   GET /api/structures/:id/floors/:floorId/flats
 * @desc    Get all flats in floor
 * @access  Private
 */
router.get('/:id/floors/:floorId/flats', structureController.getFlatsInFloor);

/**
 * @route   GET /api/structures/:id/floors/:floorId/flats/:flatId
 * @desc    Get specific flat details
 * @access  Private
 */
router.get('/:id/floors/:floorId/flats/:flatId', structureController.getFlatById);

/**
 * @route   PUT /api/structures/:id/floors/:floorId/flats/:flatId
 * @desc    Update flat details
 * @access  Private
 */
router.put('/:id/floors/:floorId/flats/:flatId', 
  flatValidation, 
  handleValidationErrors, 
  structureController.updateFlat
);

/**
 * @route   DELETE /api/structures/:id/floors/:floorId/flats/:flatId
 * @desc    Delete a flat
 * @access  Private
 */
router.delete('/:id/floors/:floorId/flats/:flatId', structureController.deleteFlat);

// =================== FLAT STRUCTURAL RATINGS ===================
/**
 * @route   POST /api/structures/:id/floors/:floorId/flats/:flatId/structural-rating
 * @desc    Save flat structural ratings
 * @access  Private
 */
router.post('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  flatStructuralRatingValidation, 
  handleValidationErrors, 
  structureController.saveFlatStructuralRating
);

/**
 * @route   GET /api/structures/:id/floors/:floorId/flats/:flatId/structural-rating
 * @desc    Get flat structural ratings
 * @access  Private
 */
router.get('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  structureController.getFlatStructuralRating
);

/**
 * @route   PUT /api/structures/:id/floors/:floorId/flats/:flatId/structural-rating
 * @desc    Update flat structural ratings
 * @access  Private
 */
router.put('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  flatStructuralRatingValidation, 
  handleValidationErrors, 
  structureController.updateFlatStructuralRating
);

// =================== BULK RATINGS MANAGEMENT ===================
/**
 * @route   POST /api/structures/:id/ratings
 * @desc    Save bulk ratings for multiple floors and flats
 * @access  Private
 */
router.post('/:id/ratings', 
  bulkRatingsValidation, 
  handleValidationErrors, 
  structureController.saveBulkRatings
);

/**
 * @route   GET /api/structures/:id/ratings
 * @desc    Get bulk ratings for all floors and flats in structure
 * @access  Private
 */
router.get('/:id/ratings', structureController.getBulkRatings);

/**
 * @route   PUT /api/structures/:id/ratings
 * @desc    Update bulk ratings for multiple floors and flats
 * @access  Private
 */
router.put('/:id/ratings', 
  bulkRatingsValidation, 
  handleValidationErrors, 
  structureController.updateBulkRatings
);

// =================== FLAT NON-STRUCTURAL RATINGS ===================
/**
 * @route   POST /api/structures/:id/floors/:floorId/flats/:flatId/non-structural-rating
 * @desc    Save flat non-structural ratings
 * @access  Private
 */
router.post('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  flatNonStructuralRatingValidation, 
  handleValidationErrors, 
  structureController.saveFlatNonStructuralRating
);

/**
 * @route   GET /api/structures/:id/floors/:floorId/flats/:flatId/non-structural-rating
 * @desc    Get flat non-structural ratings
 * @access  Private
 */
router.get('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  structureController.getFlatNonStructuralRating
);

/**
 * @route   PUT /api/structures/:id/floors/:floorId/flats/:flatId/non-structural-rating
 * @desc    Update flat non-structural ratings
 * @access  Private
 */
router.put('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  flatNonStructuralRatingValidation, 
  handleValidationErrors, 
  structureController.updateFlatNonStructuralRating
);

// =================== OVERALL STRUCTURE RATINGS ===================
/**
 * @route   POST /api/structures/:id/structural-rating
 * @desc    Save overall structural ratings for entire structure
 * @access  Private
 */
router.post('/:id/structural-rating', 
  overallStructuralRatingValidation, 
  handleValidationErrors, 
  structureController.saveOverallStructuralRating
);

/**
 * @route   GET /api/structures/:id/structural-rating
 * @desc    Get overall structural ratings
 * @access  Private
 */
router.get('/:id/structural-rating', structureController.getOverallStructuralRating);

/**
 * @route   PUT /api/structures/:id/structural-rating
 * @desc    Update overall structural ratings
 * @access  Private
 */
router.put('/:id/structural-rating', 
  overallStructuralRatingValidation, 
  handleValidationErrors, 
  structureController.updateOverallStructuralRating
);

/**
 * @route   POST /api/structures/:id/non-structural-rating
 * @desc    Save overall non-structural ratings for entire structure
 * @access  Private
 */
router.post('/:id/non-structural-rating', 
  overallNonStructuralRatingValidation, 
  handleValidationErrors, 
  structureController.saveOverallNonStructuralRating
);

/**
 * @route   GET /api/structures/:id/non-structural-rating
 * @desc    Get overall non-structural ratings
 * @access  Private
 */
router.get('/:id/non-structural-rating', structureController.getOverallNonStructuralRating);

/**
 * @route   PUT /api/structures/:id/non-structural-rating
 * @desc    Update overall non-structural ratings
 * @access  Private
 */
router.put('/:id/non-structural-rating', 
  overallNonStructuralRatingValidation, 
  handleValidationErrors, 
  structureController.updateOverallNonStructuralRating
);

// =================== STRUCTURE MANAGEMENT ===================
/**
 * @route   GET /api/structures/:id/progress
 * @desc    Get structure completion progress
 * @access  Private
 */
router.get('/:id/progress', structureController.getStructureProgress);

/**
 * @route   POST /api/structures/:id/submit
 * @desc    Submit structure for approval
 * @access  Private
 */
router.post('/:id/submit', structureController.submitStructure);

// =================== UTILITIES ===================
/**
 * @route   POST /api/structures/validate-structure-number
 * @desc    Validate structure number format
 * @access  Private
 */
router.post('/validate-structure-number', 
  structureNumberValidation,
  handleValidationErrors,
  structureController.validateStructureNumber
);

/**
 * @route   GET /api/structures/location-stats
 * @desc    Get location-based structure statistics
 * @access  Private
 */
router.get('/location-stats', structureController.getLocationStructureStats);

// =================== ERROR HANDLING ===================
// Handle 404 for structure routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Structure API endpoint not found',
    statusCode: 404
  });
});

module.exports = router;