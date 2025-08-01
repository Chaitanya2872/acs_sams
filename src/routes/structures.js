const express = require('express');
const enhancedStructureController = require('../controllers/structureController');
const { authenticateToken } = require('../middlewares/auth');
const { 
  locationValidation, 
  administrativeValidation, 
  geometricDetailsValidation,
  floorValidation,
  flatValidation,
  flatCombinedRatingsValidation, // New validator
  structureNumberValidation,
  bulkRatingsValidation
} = require('../utils/screenValidators');
const { handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// =================== STRUCTURE INITIALIZATION ===================
router.post('/initialize', enhancedStructureController.initializeStructure);

// =================== LOCATION DETAILS ===================
router.post('/:id/location', 
  locationValidation, 
  handleValidationErrors, 
  enhancedStructureController.saveLocationScreen
);
router.get('/:id/location', enhancedStructureController.getLocationScreen);
router.put('/:id/location', 
  locationValidation, 
  handleValidationErrors, 
  enhancedStructureController.updateLocationScreen
);

// =================== ADMINISTRATIVE DETAILS ===================
router.post('/:id/administrative', 
  administrativeValidation, 
  handleValidationErrors, 
  enhancedStructureController.saveAdministrativeScreen
);
router.get('/:id/administrative', enhancedStructureController.getAdministrativeScreen);
router.put('/:id/administrative', 
  administrativeValidation, 
  handleValidationErrors, 
  enhancedStructureController.updateAdministrativeScreen
);

// =================== GEOMETRIC DETAILS ===================
router.post('/:id/geometric-details', 
  geometricDetailsValidation, 
  handleValidationErrors, 
  enhancedStructureController.saveGeometricDetails
);
router.get('/:id/geometric-details', enhancedStructureController.getGeometricDetails);
router.put('/:id/geometric-details', 
  geometricDetailsValidation, 
  handleValidationErrors, 
  enhancedStructureController.updateGeometricDetails
);

// =================== FLOORS MANAGEMENT ===================
router.post('/:id/floors', 
  floorValidation, 
  handleValidationErrors, 
  enhancedStructureController.addFloors
);
router.get('/:id/floors', enhancedStructureController.getFloors);
router.get('/:id/floors/:floorId', enhancedStructureController.getFloorById);
router.put('/:id/floors/:floorId', 
  floorValidation, 
  handleValidationErrors, 
  enhancedStructureController.updateFloor
);
router.delete('/:id/floors/:floorId', enhancedStructureController.deleteFloor);

// =================== FLATS MANAGEMENT ===================
router.post('/:id/floors/:floorId/flats', 
  flatValidation, 
  handleValidationErrors, 
  enhancedStructureController.addFlatsToFloor
);
router.get('/:id/floors/:floorId/flats', enhancedStructureController.getFlatsInFloor);
router.get('/:id/floors/:floorId/flats/:flatId', enhancedStructureController.getFlatById);
router.put('/:id/floors/:floorId/flats/:flatId', 
  flatValidation, 
  handleValidationErrors, 
  enhancedStructureController.updateFlat
);
router.delete('/:id/floors/:floorId/flats/:flatId', enhancedStructureController.deleteFlat);

// =================== FLAT-LEVEL RATINGS (ENHANCED) ===================
/**
 * @route   POST /api/structures/:id/floors/:floorId/flats/:flatId/ratings
 * @desc    Save combined flat ratings (structural + non-structural in one request)
 * @access  Private
 */
router.post('/:id/floors/:floorId/flats/:flatId/ratings', 
  flatCombinedRatingsValidation, 
  handleValidationErrors, 
  enhancedStructureController.saveFlatCombinedRatings
);

/**
 * @route   GET /api/structures/:id/floors/:floorId/flats/:flatId/ratings
 * @desc    Get combined flat ratings with overall scores
 * @access  Private
 */
router.get('/:id/floors/:floorId/flats/:flatId/ratings', 
  enhancedStructureController.getFlatCombinedRatings
);

/**
 * @route   PUT /api/structures/:id/floors/:floorId/flats/:flatId/ratings
 * @desc    Update combined flat ratings
 * @access  Private
 */
router.put('/:id/floors/:floorId/flats/:flatId/ratings', 
  flatCombinedRatingsValidation, 
  handleValidationErrors, 
  enhancedStructureController.saveFlatCombinedRatings
);

// =================== FLOOR-LEVEL RATINGS (NEW) ===================
/**
 * @route   GET /api/structures/:id/floors/:floorId/ratings
 * @desc    Get floor-level overall ratings (aggregated from all flats)
 * @access  Private
 */
router.get('/:id/floors/:floorId/ratings', 
  enhancedStructureController.getFloorLevelRatings
);

/**
 * @route   POST /api/structures/:id/floors/:floorId/recalculate-ratings
 * @desc    Recalculate floor-level ratings manually
 * @access  Private
 */
router.post('/:id/floors/:floorId/recalculate-ratings', 
  enhancedStructureController.recalculateFloorLevelRatings
);

// =================== STRUCTURE-LEVEL RATINGS (ENHANCED) ===================
/**
 * @route   GET /api/structures/:id/overall-ratings
 * @desc    Get structure-level overall ratings (aggregated from all floors)
 * @access  Private
 */
router.get('/:id/overall-ratings', 
  enhancedStructureController.getStructureLevelRatings
);

/**
 * @route   POST /api/structures/:id/recalculate-all-ratings
 * @desc    Recalculate all ratings (flat -> floor -> structure)
 * @access  Private
 */
router.post('/:id/recalculate-all-ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, structure } = await enhancedStructureController.findUserStructure(req.user.userId, id);
    
    // Recalculate floor-level ratings for all floors
    if (structure.geometric_details?.floors) {
      for (const floor of structure.geometric_details.floors) {
        await enhancedStructureController.updateFloorLevelRatings(floor);
      }
    }
    
    // Recalculate structure-level ratings
    await enhancedStructureController.updateStructureLevelRatings(structure);
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'All ratings recalculated successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      total_floors_processed: structure.geometric_details?.floors?.length || 0,
      final_health_assessment: structure.final_health_assessment
    });

  } catch (error) {
    console.error('❌ Recalculate all ratings error:', error);
    sendErrorResponse(res, 'Failed to recalculate all ratings', 500, error.message);
  }
});

// =================== BULK OPERATIONS (ENHANCED) ===================
/**
 * @route   POST /api/structures/:id/bulk-ratings
 * @desc    Save bulk ratings for multiple floors and flats with auto-calculation
 * @access  Private
 */
router.post('/:id/bulk-ratings', 
  bulkRatingsValidation, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      // Use the existing bulk ratings method but with enhanced calculations
      await enhancedStructureController.saveBulkRatings(req, res);
    } catch (error) {
      console.error('❌ Enhanced bulk ratings error:', error);
      sendErrorResponse(res, 'Failed to save bulk ratings', 500, error.message);
    }
  }
);

/**
 * @route   GET /api/structures/:id/bulk-ratings
 * @desc    Get bulk ratings with floor-level and structure-level summaries
 * @access  Private
 */
router.get('/:id/bulk-ratings', 
  enhancedStructureController.getBulkRatings
);

// =================== REPORTING & ANALYTICS ===================
/**
 * @route   GET /api/structures/:id/ratings-summary
 * @desc    Get comprehensive ratings summary (flat -> floor -> structure)
 * @access  Private
 */
router.get('/:id/ratings-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, structure } = await enhancedStructureController.findUserStructure(req.user.userId, id);
    
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
        flat_level: [],
        floor_level: [],
        structure_level: {
          overall_structural: structure.overall_structural_rating || null,
          overall_non_structural: structure.overall_non_structural_rating || null,
          final_health_assessment: structure.final_health_assessment || null
        }
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
    
    // Process each floor and flat
    if (structure.geometric_details?.floors) {
      structure.geometric_details.floors.forEach(floor => {
        const floorSummary = {
          floor_id: floor.floor_id,
          floor_number: floor.floor_number,
          floor_label_name: floor.floor_label_name,
          total_flats: floor.flats ? floor.flats.length : 0,
          floor_ratings: {
            structural: floor.floor_overall_structural_rating || null,
            non_structural: floor.floor_overall_non_structural_rating || null,
            combined_health: floor.floor_combined_health || null
          },
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
        
        summary.ratings_breakdown.floor_level.push(floorSummary);
      });
    }
    
    sendSuccessResponse(res, 'Comprehensive ratings summary retrieved successfully', summary);

  } catch (error) {
    console.error('❌ Ratings summary error:', error);
    sendErrorResponse(res, 'Failed to get ratings summary', 500, error.message);
  }
});

// =================== STRUCTURE MANAGEMENT ===================
router.get('/:id/progress', enhancedStructureController.getStructureProgress);
router.post('/:id/submit', enhancedStructureController.submitStructure);

// =================== UTILITIES ===================
router.post('/validate-structure-number', 
  structureNumberValidation,
  handleValidationErrors,
  enhancedStructureController.validateStructureNumber
);
router.get('/location-stats', enhancedStructureController.getLocationStructureStats);

// =================== ERROR HANDLING ===================
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Enhanced Structure API endpoint not found',
    statusCode: 404
  });
});

module.exports = router;