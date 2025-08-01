const express = require('express');
const structureController = require('../controllers/structureController');
const { authenticateToken } = require('../middlewares/auth');
const { 
  locationValidation, 
  administrativeValidation, 
  geometricDetailsValidation,
  floorValidation,
  flatValidation,
  flatCombinedRatingsValidation,
  structureNumberValidation,
  bulkRatingsValidation
} = require('../utils/screenValidators');
const { handleValidationErrors } = require('../middlewares/validation');

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
              const health = flat.flat_overall_rating.health_status.toLowerCase();
              if (summary.health_distribution[health] !== undefined) {
                summary.health_distribution[health]++;
              }
            }
            
            if (flat.flat_overall_rating?.priority) {
              const priority = flat.flat_overall_rating.priority.toLowerCase();
              if (summary.priority_distribution[priority] !== undefined) {
                summary.priority_distribution[priority]++;
              }
            }
          });
        }
        
        summary.ratings_breakdown.flat_level.push(floorSummary);
      });
    }
    
    const { sendSuccessResponse } = require('../utils/responseHandler');
    sendSuccessResponse(res, 'Flat-level ratings summary retrieved successfully', summary);

  } catch (error) {
    console.error('❌ Ratings summary error:', error);
    const { sendErrorResponse } = require('../utils/responseHandler');
    sendErrorResponse(res, 'Failed to get ratings summary', 500, error.message);
  }
});

// =================== STRUCTURE MANAGEMENT ===================
router.get('/:id/progress', structureController.getStructureProgress);
router.post('/:id/submit', structureController.submitStructure);

// =================== UTILITIES ===================
router.post('/validate-structure-number', 
  structureNumberValidation,
  handleValidationErrors,
  structureController.validateStructureNumber
);
router.get('/location-stats', structureController.getLocationStructureStats);

// =================== ERROR HANDLING ===================
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Structure API endpoint not found',
    statusCode: 404
  });
});

module.exports = router;