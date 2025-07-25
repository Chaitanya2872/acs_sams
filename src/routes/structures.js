const express = require('express');
const structureController = require('../controllers/structureController');
const { authenticateToken, authorize } = require('../middlewares/auth');
const { structureValidation } = require('../utils/validators');
const { handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create structure
router.post('/', 
  structureValidation, 
  handleValidationErrors, 
  structureController.createStructure
);

// Get all structures
router.get('/', structureController.getStructures);

// Get structure statistics
router.get('/stats', structureController.getStructureStats);

// Get structure by ID
router.get('/:id', structureController.getStructureById);

// Update structure
router.put('/:id', 
  structureValidation, 
  handleValidationErrors, 
  structureController.updateStructure
);

// Delete structure
router.delete('/:id', structureController.deleteStructure);

module.exports = router;