const express = require('express');
const structureController = require('../controllers/structureController');
const { authenticateToken } = require('../middlewares/auth');
const { structureValidation, validateRatingImages } = require('../utils/validators');
const { handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create structure with image validation
router.post('/', 
  validateRatingImages,  // Add this first
  structureValidation, 
  handleValidationErrors, 
  structureController.createStructure
);

// Get all structures
router.get('/', structureController.getStructures);

// Get structure statistics
router.get('/stats', structureController.getStructureStats);

// Get structures by user ID
router.get('/user/:userId', structureController.getStructuresByUserId);

// Get structure by ID
router.get('/:id', structureController.getStructureById);

// Update structure with image validation
router.put('/:id', 
  validateRatingImages,  // Add this first
  structureValidation, 
  handleValidationErrors, 
  structureController.updateStructure
);

// Delete structure
router.delete('/:id', structureController.deleteStructure);

module.exports = router;