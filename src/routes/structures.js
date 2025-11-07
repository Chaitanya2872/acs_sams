const express = require('express');
const structureController = require('../controllers/structureController');
const { User } = require('../models/schemas');
const { sendSuccessResponse, sendErrorResponse, sendPaginatedResponse, sendUpdatedResponse } = require('../utils/responseHandler');
const { authenticateToken } = require('../middlewares/auth');
const { handleValidationErrors } = require('../middlewares/validation');
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
  multiComponentRatingValidation,  // ✅ FIXED: Added missing import
  parameterValidations
} = require('../utils/screenValidators');




const router = express.Router();

// All routes require authentication
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
router.get('/:id/floors', structureController.getFloors);
router.get('/:id/floors/:floorId', structureController.getFloorById);
router.put('/:id/floors/:floorId', 
  floorValidation, 
  handleValidationErrors, 
  structureController.updateFloor
);
router.delete('/:id/floors/:floorId', structureController.deleteFloor);

// =================== FLATS MANAGEMENT ===================
router.post('/:id/floors/:floorId/flats', 
  flatValidation, 
  handleValidationErrors, 
  structureController.addFlatsToFloor
);
router.get('/:id/floors/:floorId/flats', structureController.getFlatsInFloor);
router.get('/:id/floors/:floorId/flats/:flatId', structureController.getFlatById);
router.put('/:id/floors/:floorId/flats/:flatId', 
  flatValidation, 
  handleValidationErrors, 
  structureController.updateFlat
);
router.delete('/:id/floors/:floorId/flats/:flatId', structureController.deleteFlat);

// =================== FLAT-LEVEL RATINGS (ONLY) ===================

/**
 * @route   POST /api/structures/:id/floors/:floorId/flats/:flatId/ratings
 * @desc    Save combined flat ratings (structural + non-structural in one request)
 * @access  Private
 */
router.post('/:id/floors/:floorId/flats/:flatId/ratings', 
  flatCombinedRatingsValidation, 
  handleValidationErrors, 
  structureController.saveFlatCombinedRatings
);

/**
 * @route   GET /api/structures/:id/floors/:floorId/flats/:flatId/ratings
 * @desc    Get combined flat ratings with overall scores
 * @access  Private
 */
router.get('/:id/floors/:floorId/flats/:flatId/ratings', 
  structureController.getFlatCombinedRatings
);

/**
 * @route   PUT /api/structures/:id/floors/:floorId/flats/:flatId/ratings
 * @desc    Update combined flat ratings
 * @access  Private
 */
router.put('/:id/floors/:floorId/flats/:flatId/ratings', 
  flatCombinedRatingsValidation, 
  handleValidationErrors, 
  structureController.saveFlatCombinedRatings
);

router.post('/:id/floors/:floorId/ratings', 
  floorRatingsValidation, 
  handleValidationErrors, 
  structureController.saveFloorRatings
);

router.get('/:id/floors/:floorId/ratings', 
  structureController.getFloorRatings
);

// =================== LEGACY INDIVIDUAL RATINGS (for backward compatibility) ===================

/**
 * @route   POST /api/structures/:id/floors/:floorId/flats/:flatId/structural-rating
 * @desc    Save flat structural ratings only (legacy)
 * @access  Private
 */
router.post('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  structureController.saveFlatStructuralRating
);

/**
 * @route   GET /api/structures/:id/floors/:floorId/flats/:flatId/structural-rating
 * @desc    Get flat structural ratings (legacy)
 * @access  Private
 */
router.get('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  structureController.getFlatStructuralRating
);

/**
 * @route   PUT /api/structures/:id/floors/:floorId/flats/:flatId/structural-rating
 * @desc    Update flat structural ratings (legacy)
 * @access  Private
 */
router.put('/:id/floors/:floorId/flats/:flatId/structural-rating', 
  structureController.updateFlatStructuralRating
);

/**
 * @route   POST /api/structures/:id/floors/:floorId/flats/:flatId/non-structural-rating
 * @desc    Save flat non-structural ratings only (legacy)
 * @access  Private
 */
router.post('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  structureController.saveFlatNonStructuralRating
);

/**
 * @route   GET /api/structures/:id/floors/:floorId/flats/:flatId/non-structural-rating
 * @desc    Get flat non-structural ratings (legacy)
 * @access  Private
 */
router.get('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  structureController.getFlatNonStructuralRating
);

/**
 * @route   PUT /api/structures/:id/floors/:floorId/flats/:flatId/non-structural-rating
 * @desc    Update flat non-structural ratings (legacy)
 * @access  Private
 */
router.put('/:id/floors/:floorId/flats/:flatId/non-structural-rating', 
  structureController.updateFlatNonStructuralRating
);

// =================== BULK OPERATIONS ===================

/**
 * @route   POST /api/structures/:id/bulk-ratings
 * @desc    Save bulk ratings for multiple floors and flats
 * @access  Private
 */
router.post('/:id/bulk-ratings', 
  bulkRatingsValidation, 
  handleValidationErrors, 
  structureController.saveBulkRatings
);

/**
 * @route   GET /api/structures/:id/bulk-ratings
 * @desc    Get bulk ratings for all floors and flats
 * @access  Private
 */
router.get('/:id/bulk-ratings', 
  structureController.getBulkRatings
);

/**
 * @route   PUT /api/structures/:id/bulk-ratings
 * @desc    Update bulk ratings for multiple floors and flats
 * @access  Private
 */
router.put('/:id/bulk-ratings', 
  bulkRatingsValidation, 
  handleValidationErrors, 
  structureController.updateBulkRatings
);

/**
 * @route   POST /structures/:id/flats/:flatId/structural
 * @desc    Save structural components for a flat (multiple instances)
 * @access  Private
 * @body    { component_type: 'beams', components: [{ name, rating, photo, condition_comment, inspector_notes }] }
 * @note    Component _id is auto-generated and returned in response
 */
router.post(
  '/:id/flats/:flatId/structural',
  parameterValidations.structureId,
  parameterValidations.flatId,
  componentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatStructuralComponents
);

/**
 * @route   GET /structures/:id/flats/:flatId/structural/:type
 * @desc    Get all structural component instances of a specific type
 * @access  Private
 * @example GET /structures/123/flats/456/structural/beams
 */
router.get(
  '/:id/flats/:flatId/structural/:type',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFlatStructuralComponents
);

/**
 * @route   PATCH /structures/:id/flats/:flatId/structural/:componentId
 * @desc    Update a specific structural component instance
 * @access  Private
 * @body    { name?, rating?, photo?, condition_comment?, inspector_notes? }
 */
router.patch(
  '/:id/flats/:flatId/structural/:componentId',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentId,
  componentUpdateValidation,
  handleValidationErrors,
  structureController.updateFlatStructuralComponent
);

/**
 * @route   DELETE /structures/:id/flats/:flatId/structural/:componentId
 * @desc    Delete a specific structural component instance
 * @access  Private
 */
router.delete(
  '/:id/flats/:flatId/structural/:componentId',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentId,
  handleValidationErrors,
  structureController.deleteFlatStructuralComponent
);

/**
 * @route   POST /structures/:id/flats/:flatId/non-structural
 * @desc    Save non-structural components for a flat (multiple instances)
 * @access  Private
 * @note    Component _id is auto-generated and returned in response
 */
router.post(
  '/:id/flats/:flatId/non-structural',
  parameterValidations.structureId,
  parameterValidations.flatId,
  componentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatNonStructuralComponents
);

/**
 * @route   GET /structures/:id/flats/:flatId/non-structural/:type
 * @desc    Get all non-structural component instances of a specific type
 * @access  Private
 */
router.get(
  '/:id/flats/:flatId/non-structural/:type',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFlatNonStructuralComponents
);

/**
 * @route   PATCH /structures/:id/flats/:flatId/non-structural/:componentId
 * @desc    Update a specific non-structural component instance
 * @access  Private
 */
router.patch(
  '/:id/flats/:flatId/non-structural/:componentId',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentId,
  componentUpdateValidation,
  handleValidationErrors,
  structureController.updateFlatNonStructuralComponent
);

/**
 * @route   DELETE /structures/:id/flats/:flatId/non-structural/:componentId
 * @desc    Delete a specific non-structural component instance
 * @access  Private
 */
router.delete(
  '/:id/flats/:flatId/non-structural/:componentId',
  parameterValidations.structureId,
  parameterValidations.flatId,
  parameterValidations.componentId,
  handleValidationErrors,
  structureController.deleteFlatNonStructuralComponent
);

// =================== FLOOR-LEVEL COMPONENT RATINGS ===================

/**
 * @route   POST /structures/:id/floors/:floorId/structural
 * @desc    Save structural components for a floor
 * @access  Private
 * @note    Component _id is auto-generated and returned in response
 */
router.post(
  '/:id/floors/:floorId/structural',
  parameterValidations.structureId,
  parameterValidations.floorId,
  componentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorStructuralComponents
);

/**
 * @route   GET /structures/:id/floors/:floorId/structural/:type
 * @desc    Get all structural component instances of a specific type for floor
 * @access  Private
 */
router.get(
  '/:id/floors/:floorId/structural/:type',
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFloorStructuralComponents
);

/**
 * @route   POST /structures/:id/floors/:floorId/non-structural
 * @desc    Save non-structural components for a floor
 * @access  Private
 * @note    Component _id is auto-generated and returned in response
 */
router.post(
  '/:id/floors/:floorId/non-structural',
  parameterValidations.structureId,
  parameterValidations.floorId,
  componentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorNonStructuralComponents
);

/**
 * @route   GET /structures/:id/floors/:floorId/non-structural/:type
 * @desc    Get all non-structural component instances of a specific type for floor
 * @access  Private
 */
router.get(
  '/:id/floors/:floorId/non-structural/:type',
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFloorNonStructuralComponents
);

// PATCH and DELETE for floor components follow same pattern as flats...

// =================== FLAT-LEVEL COMPONENT RATINGS (BULK) ===================

/**
 * @route   POST /structures/:id/flats/:flatId/structural/bulk
 * @desc    Save multiple structural component types in one request
 * @access  Private
 * @note    Component _id is auto-generated for each component and returned in response
 * @body    { structures: [{ component_type, components: [...] }, ...] }
 * @example
 * {
 *   "structures": [
 *     {
 *       "component_type": "beams",
 *       "components": [
 *         {
 *           "name": "Main Beam - Living Room",
 *           "rating": 4,
 *           "photo": "data:image/jpeg;base64,...",
 *           "condition_comment": "Good condition with minor surface cracks",
 *           "inspector_notes": "Recommend monitoring"
 *         }
 *       ]
 *     },
 *     {
 *       "component_type": "columns",
 *       "components": [...]
 *     }
 *   ]
 * }
 */
router.post(
  '/:id/flats/:flatId/structural/bulk',
  parameterValidations.structureId,
  parameterValidations.flatId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatStructuralComponentsBulk
);

/**
 * @route   POST /structures/:id/flats/:flatId/non-structural/bulk
 * @desc    Save multiple non-structural component types in one request
 * @access  Private
 * @note    Component _id is auto-generated for each component and returned in response
 * @body    { structures: [{ component_type, components: [...] }, ...] }
 */
router.post(
  '/:id/flats/:flatId/non-structural/bulk',
  parameterValidations.structureId,
  parameterValidations.flatId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFlatNonStructuralComponentsBulk
);

// =================== FLOOR-LEVEL COMPONENT RATINGS (BULK) ===================

/**
 * @route   POST /structures/:id/floors/:floorId/structural/bulk
 * @desc    Save multiple structural component types for floor in one request
 * @access  Private
 * @note    Component _id is auto-generated for each component and returned in response
 */
router.post(
  '/:id/floors/:floorId/structural/bulk',
  parameterValidations.structureId,
  parameterValidations.floorId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorStructuralComponentsBulk
);

/**
 * @route   POST /structures/:id/floors/:floorId/non-structural/bulk
 * @desc    Save multiple non-structural component types for floor in one request
 * @access  Private
 * @note    Component _id is auto-generated for each component and returned in response
 */
router.post(
  '/:id/floors/:floorId/non-structural/bulk',
  parameterValidations.structureId,
  parameterValidations.floorId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveFloorNonStructuralComponentsBulk
);

// =================== BLOCK-LEVEL COMPONENT RATINGS (BULK) ===================

/**
 * @route   POST /structures/:id/floors/:floorId/blocks/:blockId/structural/bulk
 * @desc    Save multiple structural component types for industrial block
 * @access  Private
 * @note    Component _id is auto-generated for each component and returned in response
 */
router.post(
  '/:id/floors/:floorId/blocks/:blockId/structural/bulk',
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.blockId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveBlockStructuralComponentsBulk
);

/**
 * @route   POST /structures/:id/floors/:floorId/blocks/:blockId/non-structural/bulk
 * @desc    Save multiple non-structural component types for industrial block
 * @access  Private
 * @note    Component _id is auto-generated for each component and returned in response
 */
router.post(
  '/:id/floors/:floorId/blocks/:blockId/non-structural/bulk',
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.blockId,
  multiComponentRatingValidation,
  handleValidationErrors,
  structureController.saveBlockNonStructuralComponentsBulk
);

// =================== KEEP ALL EXISTING SINGLE COMPONENT TYPE ROUTES ===================
// These are the legacy routes that still work for single component type at a time

// ... (Keep all existing routes from the original file)



// =================== REPORTING & ANALYTICS ===================

/**
 * @route   GET /api/structures/:id/ratings-summary
 * @desc    Get comprehensive flat-level ratings summary
 * @access  Private
 */
router.get('/:id/ratings-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, structure } = await structureController.findUserStructure(req.user.userId, id);
    
    const summary = {
      structure_info: {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        structural_identity_number: structure.structural_identity?.structural_identity_number,
        total_floors: structure.geometric_details?.floors?.length || 0,
        total_flats: 0,
        status: structure.status
      },
      ratings_breakdown: {
        flat_level: []
      },
      health_distribution: {
        good: 0,
        fair: 0,
        poor: 0,
        critical: 0
      },
      priority_distribution: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      }
    };
    
    // Process each floor and flat (ONLY flat-level ratings)
    if (structure.geometric_details?.floors) {
      structure.geometric_details.floors.forEach(floor => {
        const floorSummary = {
          floor_id: floor.floor_id,
          floor_number: floor.floor_number,
          floor_label_name: floor.floor_label_name,
          total_flats: floor.flats ? floor.flats.length : 0,
          flats: []
        };
        
        summary.structure_info.total_flats += floorSummary.total_flats;
        
        if (floor.flats) {
          floor.flats.forEach(flat => {
            const flatSummary = {
              flat_id: flat.flat_id,
              flat_number: flat.flat_number,
              flat_type: flat.flat_type,
              structural_rating: flat.structural_rating || null,
              non_structural_rating: flat.non_structural_rating || null,
              flat_overall_rating: flat.flat_overall_rating || null
            };
            
            floorSummary.flats.push(flatSummary);
            
            // Count health and priority distributions
            if (flat.flat_overall_rating?.health_status) {
              const status = flat.flat_overall_rating.health_status.toLowerCase();
              summary.health_distribution[status]++;
            }
            
            if (flat.flat_overall_rating?.priority) {
              const priority = flat.flat_overall_rating.priority.toLowerCase();
              summary.priority_distribution[priority]++;
            }
          });
        }
        
        summary.ratings_breakdown.flat_level.push(floorSummary);
      });
    }
    
    sendSuccessResponse(res, 'Ratings summary retrieved successfully', summary);
    
  } catch (error) {
    console.error('❌ Get ratings summary error:', error);
    sendErrorResponse(res, 'Failed to get ratings summary', 500, error.message);
  }
});

// =================== STRUCTURE MANAGEMENT ===================

/**
 * @route   GET /api/structures
 * @desc    Get all structures with optional filtering and pagination
 * @access  Private
 */
router.get('/', structureController.getAllStructures);

/**
 * @route   GET /api/structures/:id
 * @desc    Get detailed structure information
 * @access  Private
 */
router.get('/:id', structureController.getStructureDetails);

/**
 * @route   GET /api/structures/:id/progress
 * @desc    Get structure completion progress
 * @access  Private
 */
router.get('/:id/progress', structureController.getStructureProgress);

/**
 * @route   POST /api/structures/:id/submit
 * @desc    Submit structure for review
 * @access  Private
 */
router.post('/:id/submit', structureController.submitStructure);

/**
 * @route   POST /api/structures/validate-number
 * @desc    Validate structure number availability
 * @access  Private
 */
router.post('/validate-number', 
  structureNumberValidation, 
  handleValidationErrors, 
  structureController.validateStructureNumber
);

/**
 * @route   GET /api/structures/stats/location
 * @desc    Get statistics grouped by location
 * @access  Private
 */
router.get('/stats/location', structureController.getLocationStructureStats);

/**
 * @route   DELETE /api/structures/:id
 * @desc    Delete a structure (soft delete)
 * @access  Private
 */
router.delete('/:id', structureController.deleteStructure);

// =================== REMARKS MANAGEMENT ===================

/**
 * @route   POST /api/structures/:id/remarks
 * @desc    Add a remark to structure
 * @access  Private (any authenticated user can add remarks)
 */
router.post('/:id/remarks', structureController.addRemark);

/**
 * @route   PUT /api/structures/:id/remarks/:remarkId
 * @desc    Update a remark
 * @access  Private (only the creator can update)
 */
router.put('/:id/remarks/:remarkId', structureController.updateRemark);

/**
 * @route   GET /api/structures/:id/remarks
 * @desc    Get all remarks for a structure
 * @access  Private
 */
router.get('/:id/remarks', structureController.getRemarks);

/**
 * @route   DELETE /api/structures/:id/remarks/:remarkId
 * @desc    Delete a remark
 * @access  Private (only creator or admin can delete)
 */
router.delete('/:id/remarks/:remarkId', structureController.deleteRemark);

// =================== IMAGE MANAGEMENT & STATS ===================

/**
 * @route   GET /api/structures/images/all
 * @desc    Get all images across all structures for the user
 * @access  Private
 */
router.get('/images/all', structureController.getAllImages);

/**
 * @route   GET /api/structures/:id/images
 * @desc    Get all images for a specific structure
 * @access  Private
 */
router.get('/:id/images', structureController.getStructureImages);

/**
 * @route   GET /api/structures/images/stats
 * @desc    Get image statistics for user
 * @access  Private
 */
router.get('/images/stats', structureController.getUserImageStats);

module.exports = router;