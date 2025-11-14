const express = require('express');
const structureController = require('../controllers/structureController');
const { authenticateToken } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validation');
const { body, param } = require('express-validator');
const { 
  locationValidation, 
  administrativeValidation, 
  geometricDetailsValidation,
  floorValidation,
  flatValidation,
  flatCombinedRatingsValidation,
  structureNumberValidation,
  bulkRatingsValidation,
  blockValidation,
  blockRatingsValidation,
  floorRatingsValidation,
  componentRatingValidation,
  componentUpdateValidation,
  multiComponentRatingValidation,
  parameterValidations
} = require('../utils/screenValidators');

const router = express.Router();

// =================== ⚠️ CRITICAL: BULK ROUTES FIRST - MOST SPECIFIC PATHS ⚠️ ===================
console.log('🔧 Registering bulk routes...');

// FLAT-LEVEL BULK ROUTES (Most specific - must be first!)
router.post(
  '/:id/flats/:flatId/structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.flatId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatStructuralComponentsBulk
);

router.put(
  '/:id/flats/:flatId/structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.flatId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatStructuralComponentsBulk
);



router.post(
  '/:id/flats/:flatId/non-structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.flatId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatNonStructuralComponentsBulk
);

router.put(
  '/:id/flats/:flatId/non-structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.flatId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatNonStructuralComponentsBulk
);

// FLOOR-LEVEL BULK ROUTES
router.post(
  '/:id/floors/:floorId/structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.floorId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorStructuralComponentsBulk
);

router.put(
  '/:id/floors/:floorId/structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.floorId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorStructuralComponentsBulk
);

router.post(
  '/:id/floors/:floorId/non-structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.floorId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorNonStructuralComponentsBulk
);

// BLOCK-LEVEL BULK ROUTES
router.post(
  '/:id/floors/:floorId/blocks/:blockId/structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.blockId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveBlockStructuralComponentsBulk
);

router.put(
  '/:id/floors/:floorId/blocks/:blockId/structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.blockId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveBlockStructuralComponentsBulk
);

router.post(
  '/:id/floors/:floorId/blocks/:blockId/non-structural/bulk',
  authenticateToken,
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.blockId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveBlockNonStructuralComponentsBulk
);

console.log('✅ Bulk routes registered');

// =================== NOW APPLY AUTHENTICATION TO ALL OTHER ROUTES ===================
router.use(authenticateToken);

// =================== STRUCTURE INITIALIZATION ===================
router.post('/initialize', structureController.initializeStructure);

// =================== LOCATION DETAILS ===================
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

// =================== ADMINISTRATIVE DETAILS ===================
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

// =================== GEOMETRIC DETAILS ===================
router.post('/:id/geometric-details', 
  geometricDetailsValidation, 
  handleValidationErrors, 
  structureController.saveGeometricDetails
);
router.get('/:id/geometric-details', structureController.getGeometricDetails);
router.put('/:id/geometric-details', 
  geometricDetailsValidation, 
  handleValidationErrors, 
  structureController.updateGeometricDetails
);

// =================== FLOORS MANAGEMENT ===================
router.post('/:id/floors', 
  floorValidation, 
  handleValidationErrors, 
  structureController.addFloors
);
router.get('/:id/floors/:floorId', structureController.getFloorById);
router.put('/:id/floors/:floorId', 
  floorValidation, 
  handleValidationErrors, 
  structureController.updateFloor
);
router.delete('/:id/floors/:floorId', structureController.deleteFloor);
router.get('/:id/floors', structureController.getFloors);

// =================== FLATS MANAGEMENT ===================
router.post('/:id/floors/:floorId/flats', 
  flatValidation, 
  handleValidationErrors, 
  structureController.addFlatsToFloor
);
router.get('/:id/floors/:floorId/flats/:flatId', structureController.getFlatById);
router.put('/:id/floors/:floorId/flats/:flatId', 
  flatValidation, 
  handleValidationErrors, 
  structureController.updateFlat
);
router.delete('/:id/floors/:floorId/flats/:flatId', structureController.deleteFlat);
router.get('/:id/floors/:floorId/flats', structureController.getFlatsInFloor);

// =================== COMBINED FLAT RATINGS ===================
router.post('/:id/floors/:floorId/flats/:flatId/ratings', 
  flatCombinedRatingsValidation, 
  handleValidationErrors, 
  structureController.saveFlatCombinedRatings
);
router.get('/:id/floors/:floorId/flats/:flatId/ratings', 
  structureController.getFlatCombinedRatings
);
router.put('/:id/floors/:floorId/flats/:flatId/ratings', 
  flatCombinedRatingsValidation, 
  handleValidationErrors, 
  structureController.saveFlatCombinedRatings
);

// =================== FLOOR-LEVEL RATINGS ===================
router.post('/:id/floors/:floorId/ratings', 
  floorRatingsValidation, 
  handleValidationErrors, 
  structureController.saveFloorRatings
);
router.get('/:id/floors/:floorId/ratings', 
  structureController.getFloorRatings
);

// =================== LEGACY FLAT RATINGS ===================
router.post('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  structureController.saveFlatStructuralRating
);
router.get('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  structureController.getFlatStructuralRating
);
router.put('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  structureController.updateFlatStructuralRating
);
router.post('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  structureController.saveFlatNonStructuralRating
);
router.get('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  structureController.getFlatNonStructuralRating
);
router.put('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  structureController.updateFlatNonStructuralRating
);

// =================== FLAT-LEVEL SINGLE COMPONENT TYPE ===================
// ✅ NOW SAFE - Bulk routes are already registered above

// POST routes without :type parameter (base endpoints)
router.post(
  '/:id/flats/:flatId/structural',
  parameterValidations.structureId,
  parameterValidations.flatId,
  componentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatStructuralComponents
);

router.post(
  '/:id/flats/:flatId/non-structural',
  parameterValidations.structureId,
  parameterValidations.flatId,
  componentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatNonStructuralComponents
);

// GET routes with :type parameter (comes AFTER bulk and POST routes)
router.get(
  '/:id/flats/:flatId/structural/:type',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFlatStructuralComponents
);

router.get(
  '/:id/flats/:flatId/non-structural/:type',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFlatNonStructuralComponents
);

// PATCH routes with :componentId
router.patch(
  '/:id/flats/:flatId/structural/:componentId',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentId,
  componentUpdateValidation,
  handleValidationErrors,
  structureController.updateFlatStructuralComponent
);

router.patch(
  '/:id/flats/:flatId/non-structural/:componentId',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentId,
  componentUpdateValidation,
  handleValidationErrors,
  structureController.updateFlatNonStructuralComponent
);

// DELETE routes with :componentId
router.delete(
  '/:id/flats/:flatId/structural/:componentId',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentId,
  handleValidationErrors,
  structureController.deleteFlatStructuralComponent
);

router.delete(
  '/:id/flats/:flatId/non-structural/:componentId',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentId,
  handleValidationErrors,
  structureController.deleteFlatNonStructuralComponent
);

// =================== FLOOR-LEVEL SINGLE COMPONENT TYPE ===================
router.post(
  '/:id/floors/:floorId/structural',
  parameterValidations.structureId,
  parameterValidations.floorId,
  componentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorStructuralComponents
);

router.post(
  '/:id/floors/:floorId/non-structural',
  parameterValidations.structureId,
  parameterValidations.floorId,
  componentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorNonStructuralComponents
);

router.get(
  '/:id/floors/:floorId/structural/:type',
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFloorStructuralComponents
);

router.get(
  '/:id/floors/:floorId/non-structural/:type',
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFloorNonStructuralComponents
);

// =================== BULK OPERATIONS (LEGACY) ===================
router.post('/:id/bulk-ratings', 
  bulkRatingsValidation, 
  handleValidationErrors, 
  structureController.saveBulkRatings
);
router.get('/:id/bulk-ratings', 
  structureController.getBulkRatings
);
router.put('/:id/bulk-ratings', 
  bulkRatingsValidation, 
  handleValidationErrors, 
  structureController.updateBulkRatings
);

// =================== REPORTING & ANALYTICS ===================
router.get('/:id/progress', structureController.getStructureProgress);
router.post('/:id/submit', structureController.submitStructure);

// =================== REMARKS MANAGEMENT ===================
router.post('/:id/remarks', structureController.addRemark);
router.put('/:id/remarks/:remarkId', structureController.updateRemark);
router.get('/:id/remarks', structureController.getRemarks);
router.delete('/:id/remarks/:remarkId', structureController.deleteRemark);

// =================== IMAGE MANAGEMENT ===================
router.get('/images/all', structureController.getAllImages);
router.get('/images/stats', structureController.getUserImageStats);
router.get('/:id/images', structureController.getStructureImages);

// =================== GENERAL STRUCTURE ROUTES (AT END) ===================
router.get('/stats/location', structureController.getLocationStructureStats);
router.post('/validate-number', 
  structureNumberValidation, 
  handleValidationErrors, 
  structureController.validateStructureNumber
);
router.delete('/:id', structureController.deleteStructure);
router.get('/:id', structureController.getStructureDetails);
router.get('/', structureController.getAllStructures);

// Add these routes to your structures.js routes file

// =================== WORKFLOW STATUS ROUTES ===================
// Place these BEFORE the general structure routes

// FE: Submit for testing
router.post('/:id/submit-for-testing', 
  authenticateToken,
  parameterValidations.structureId,
  handleValidationErrors,
  structureController.submitForTesting
);

// TE: Start testing
router.post('/:id/start-testing',
  authenticateToken,
  parameterValidations.structureId,
  handleValidationErrors,
  structureController.startTesting
);

// TE: Complete testing (approve or reject)
router.post('/:id/complete-testing',
  authenticateToken,
  parameterValidations.structureId,
  [
    body('status')
      .optional()
      .isIn(['tested', 'rejected'])
      .withMessage('Status must be either "tested" or "rejected"'),
    body('test_notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Test notes cannot exceed 2000 characters'),
    body('rejection_reason')
      .if(body('status').equals('rejected'))
      .notEmpty()
      .withMessage('Rejection reason is required when rejecting')
      .isLength({ max: 2000 })
      .withMessage('Rejection reason cannot exceed 2000 characters')
  ],
  handleValidationErrors,
  structureController.completeTesting
);

// VE: Start validation
router.post('/:id/start-validation',
  authenticateToken,
  parameterValidations.structureId,
  handleValidationErrors,
  structureController.startValidation
);

// VE: Complete validation (approve or reject)
router.post('/:id/complete-validation',
  authenticateToken,
  parameterValidations.structureId,
  [
    body('status')
      .optional()
      .isIn(['validated', 'rejected'])
      .withMessage('Status must be either "validated" or "rejected"'),
    body('validation_notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Validation notes cannot exceed 2000 characters'),
    body('rejection_reason')
      .if(body('status').equals('rejected'))
      .notEmpty()
      .withMessage('Rejection reason is required when rejecting')
      .isLength({ max: 2000 })
      .withMessage('Rejection reason cannot exceed 2000 characters')
  ],
  handleValidationErrors,
  structureController.completeValidation
);

// AD: Approve structure (final approval or rejection)
router.post('/:id/approve',
  authenticateToken,
  parameterValidations.structureId,
  [
    body('status')
      .optional()
      .isIn(['approved', 'rejected'])
      .withMessage('Status must be either "approved" or "rejected"'),
    body('approval_notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Approval notes cannot exceed 2000 characters'),
    body('rejection_reason')
      .if(body('status').equals('rejected'))
      .notEmpty()
      .withMessage('Rejection reason is required when rejecting')
      .isLength({ max: 2000 })
      .withMessage('Rejection reason cannot exceed 2000 characters')
  ],
  handleValidationErrors,
  structureController.approveStructure
);

router.get('/:id/workflow',
  authenticateToken,
  parameterValidations.structureId,
  handleValidationErrors,
  structureController.getWorkflowHistory
);

console.log('✅ All structure routes registered');

module.exports = router;