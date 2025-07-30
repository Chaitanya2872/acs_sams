const express = require('express');
const structureController = require('../controllers/structureController');
const { authenticateToken } = require('../middlewares/auth');
const { 
  locationValidation, 
  administrativeValidation, 
  geometricValidation, 
  ratingsValidation,
  structureNumberValidation
} = require('../utils/screenValidators');
const { handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============= 4-SCREEN STRUCTURE CREATION APIs =============

// Initialize a new structure (creates draft)
router.post('/initialize', structureController.initializeStructure);

// Screen 1: Location (Structure Identification + GPS Location)
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

// Screen 3: Geometric (Building Dimensions & Floor Details)
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

// Screen 4: Overall Ratings (Structural + Non-Structural)
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

// ============= STRUCTURE NUMBER UTILITIES =============

// Validate structure number format
router.post('/validate-structure-number', 
  structureNumberValidation,
  handleValidationErrors,
  structureController.validateStructureNumber
);

// Get location-based structure statistics  
router.get('/location-stats',
  structureController.getLocationStructureStats
);

// ============= STRUCTURE MANAGEMENT APIs =============

// Get structure progress/completion status
router.get('/:id/progress', structureController.getStructureProgress);

// Submit structure (finalize after all screens completed)
router.post('/:id/submit', structureController.submitStructure);

// Get all structures
router.get('/', structureController.getStructures);

// Get structure statistics
router.get('/stats', structureController.getStructureStats);

// Get structures by user ID
router.get('/user/:userId', structureController.getStructuresByUserId);

// Get structure by ID (full structure)
router.get('/:id', structureController.getStructureById);

// Get structure by UID
router.get('/uid/:uid', structureController.getStructureByUID);

// Delete structure
router.delete('/:id', structureController.deleteStructure);

// Get structures requiring inspection
router.get('/inspection/required', structureController.getStructuresRequiringInspection);

// Get maintenance recommendations
router.get('/:id/maintenance/recommendations', structureController.getMaintenanceRecommendations);

// Get structure floors
router.get('/:id/floors', structureController.getStructureFloors);

// Get floor flats
router.get('/:id/floors/:floorNumber/flats', structureController.getFloorFlats);

module.exports = router;