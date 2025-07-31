const express = require('express');
const structureController = require('../controllers/structureController');
const { authenticateToken } = require('../middlewares/auth');
const { 
  locationValidation, 
  administrativeValidation, 
  geometricValidation, 
  ratingsValidation,
  overallStructuralValidation,
  overallNonStructuralValidation,
  structureNumberValidation
} = require('../utils/screenValidators');
const { handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============= 6-SCREEN STRUCTURE CREATION FLOW =============

// Initialize a new structure (creates draft)
router.post('/initialize', structureController.initializeStructure);

// Screen 1: Location (Structure Identification + GPS Location + Zip Code)
router.post('/:id/location', 
  locationValidation, 
  handleValidationErrors, 
  structureController.saveLocationScreen
);
router.get('/:id/location', structureController.getLocationScreen);
router.put('/:id/location', 
  locationValidation, 
  handleValidationErrors, 
  structureController.updateLocationScreen
);

// Screen 2: Administrative (Admin/Client Details)
router.post('/:id/administrative', 
  administrativeValidation, 
  handleValidationErrors, 
  structureController.saveAdministrativeScreen
);
router.get('/:id/administrative', structureController.getAdministrativeScreen);
router.put('/:id/administrative', 
  administrativeValidation, 
  handleValidationErrors, 
  structureController.updateAdministrativeScreen
);

// Screen 3: Geometric (Building Dimensions + Floors + Flats Setup)
router.post('/:id/geometric', 
  geometricValidation, 
  handleValidationErrors, 
  structureController.saveGeometricScreen
);
router.get('/:id/geometric', structureController.getGeometricScreen);
router.put('/:id/geometric', 
  geometricValidation, 
  handleValidationErrors, 
  structureController.updateGeometricScreen
);

// Screen 4: Flat-wise Ratings (Structural + Non-Structural for each flat)
router.post('/:id/ratings', 
  ratingsValidation, 
  handleValidationErrors, 
  structureController.saveRatingsScreen
);
router.get('/:id/ratings', structureController.getRatingsScreen);
router.put('/:id/ratings', 
  ratingsValidation, 
  handleValidationErrors, 
  structureController.updateRatingsScreen
);

// Screen 5: Overall Structural Rating (NEW)
router.post('/:id/overall-structural', 
  overallStructuralValidation, 
  handleValidationErrors, 
  structureController.saveOverallStructuralScreen
);
router.get('/:id/overall-structural', structureController.getOverallStructuralScreen);
router.put('/:id/overall-structural', 
  overallStructuralValidation, 
  handleValidationErrors, 
  structureController.updateOverallStructuralScreen
);

// Screen 6: Overall Non-Structural Rating (NEW)
router.post('/:id/overall-non-structural', 
  overallNonStructuralValidation, 
  handleValidationErrors, 
  structureController.saveOverallNonStructuralScreen
);
router.get('/:id/overall-non-structural', structureController.getOverallNonStructuralScreen);
router.put('/:id/overall-non-structural', 
  overallNonStructuralValidation, 
  handleValidationErrors, 
  structureController.updateOverallNonStructuralScreen
);

// ============= STRUCTURE NUMBER UTILITIES =============

// Validate structure number format
router.post('/validate-structure-number', 
  structureNumberValidation,
  handleValidationErrors,
  structureController.validateStructureNumber
);

// Get location-based structure statistics  
router.get('/location-stats', structureController.getLocationStructureStats);

// ============= STRUCTURE MANAGEMENT APIs =============

// Get structure progress/completion status
router.get('/:id/progress', structureController.getStructureProgress);

// Submit structure (finalize after all screens completed)
router.post('/:id/submit', structureController.submitStructure);

// Get final structure summary with all ratings
router.get('/:id/summary', structureController.getStructureSummary);

// ============= ERROR HANDLING =============

// Handle 404 for structure routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Structure API endpoint not found',
    statusCode: 404
  });
});

module.exports = router;