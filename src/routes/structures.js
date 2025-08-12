const express = require('express');
const structureController = require('../controllers/structureController');
// Add required imports at the top of the file
const { User } = require('../models/schemas');
const { sendSuccessResponse, sendErrorResponse, sendPaginatedResponse } = require('../utils/responseHandler');
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


// Add these routes to your existing structures.js router file

// =================== STRUCTURE LISTING & DETAILS (Add near the top after authentication) ===================

/**
 * @route   GET /api/structures
 * @desc    Get all structures for authenticated user with pagination and filtering
 * @access  Private
 * @query   page, limit, status, search, sortBy, sortOrder
 */
router.get('/', structureController.getAllStructures);

/**
 * @route   GET /api/structures/:id
 * @desc    Get complete structure details by ID
 * @access  Private
 * @query   include_images, include_ratings
 */
router.get('/:id', structureController.getStructureDetails);

// =================== IMAGE MANAGEMENT APIs ===================

/**
 * @route   GET /api/structures/images/all
 * @desc    Get all images for authenticated user across all structures
 * @access  Private
 * @query   page, limit, type, component
 */
router.get('/images/all', structureController.getAllImages);

/**
 * @route   GET /api/structures/images/user-stats
 * @desc    Get user-level image statistics and analytics
 * @access  Private
 */
router.get('/images/user-stats', structureController.getUserImageStats);

/**
 * @route   GET /api/structures/:id/images
 * @desc    Get all images for a specific structure
 * @access  Private
 * @query   type, component, floor, group_by
 */
router.get('/:id/images', structureController.getStructureImages);

// =================== ENHANCED ANALYTICS & REPORTING ===================

/**
 * @route   GET /api/structures/analytics/dashboard
 * @desc    Get comprehensive dashboard data for user
 * @access  Private
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const structures = user.structures || [];
    
    // Calculate comprehensive dashboard metrics
    const dashboard = {
      user_info: {
        user_id: req.user.userId,
        username: user.username,
        email: user.email,
        total_structures: structures.length
      },
      
      structure_overview: {
        total_structures: structures.length,
        by_status: {},
        by_type: {},
        by_health: { good: 0, fair: 0, poor: 0, critical: 0, unrated: 0 },
        completion_rates: {
          fully_completed: 0,
          ratings_completed: 0,
          partially_completed: 0,
          just_initialized: 0
        }
      },
      
      ratings_overview: {
        total_flats: 0,
        rated_flats: 0,
        pending_ratings: 0,
        structural_avg: null,
        non_structural_avg: null,
        critical_issues: 0,
        high_priority_issues: 0
      },
      
      recent_activity: {
        recent_structures: [],
        recent_ratings: [],
        recent_uploads: []
      },
      
      maintenance_alerts: {
        critical_items: [],
        upcoming_inspections: [],
        overdue_items: []
      },
      
      progress_tracking: {
        monthly_progress: {},
        completion_trend: []
      }
    };
    
    const allStructuralRatings = [];
    const allNonStructuralRatings = [];
    let totalImages = 0;
    
    // Process each structure
    structures.forEach(structure => {
      // Count by status
      const status = structure.status || 'draft';
      dashboard.structure_overview.by_status[status] = (dashboard.structure_overview.by_status[status] || 0) + 1;
      
      // Count by type
      const type = structure.structural_identity?.type_of_structure || 'unknown';
      dashboard.structure_overview.by_type[type] = (dashboard.structure_overview.by_type[type] || 0) + 1;
      
      // Calculate progress and completion rates
      const progress = structureController.calculateProgress(structure);
      if (progress.overall_percentage >= 100) {
        dashboard.structure_overview.completion_rates.fully_completed++;
      } else if (progress.flat_ratings_completed) {
        dashboard.structure_overview.completion_rates.ratings_completed++;
      } else if (progress.overall_percentage > 30) {
        dashboard.structure_overview.completion_rates.partially_completed++;
      } else {
        dashboard.structure_overview.completion_rates.just_initialized++;
      }
      
      // Add to recent structures (last 5)
      if (dashboard.recent_activity.recent_structures.length < 5) {
        dashboard.recent_activity.recent_structures.push({
          structure_id: structure._id,
          uid: structure.structural_identity?.uid,
          structure_number: structure.structural_identity?.structural_identity_number,
          client_name: structure.administration?.client_name,
          status: structure.status,
          progress: progress.overall_percentage,
          last_updated: structure.creation_info?.last_updated_date
        });
      }
      
      // Process floors and flats for ratings
      if (structure.geometric_details?.floors) {
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            floor.flats.forEach(flat => {
              dashboard.ratings_overview.total_flats++;
              
              // Count rated flats and collect ratings
              if (flat.flat_overall_rating?.combined_score) {
                dashboard.ratings_overview.rated_flats++;
                
                const health = flat.flat_overall_rating.health_status?.toLowerCase();
                if (dashboard.structure_overview.by_health[health] !== undefined) {
                  dashboard.structure_overview.by_health[health]++;
                }
                
                // Count priority issues
                if (flat.flat_overall_rating.priority === 'Critical') {
                  dashboard.ratings_overview.critical_issues++;
                } else if (flat.flat_overall_rating.priority === 'High') {
                  dashboard.ratings_overview.high_priority_issues++;
                }
              } else {
                dashboard.structure_overview.by_health.unrated++;
              }
              
              // Collect structural ratings
              if (flat.structural_rating?.overall_average) {
                allStructuralRatings.push(flat.structural_rating.overall_average);
              }
              
              // Collect non-structural ratings
              if (flat.non_structural_rating?.overall_average) {
                allNonStructuralRatings.push(flat.non_structural_rating.overall_average);
              }
              
              // Count images
              const images = structureController.extractFlatImages(flat);
              totalImages += images.length;
              
              // Add recent ratings activity
              if (flat.flat_overall_rating?.last_assessment_date && 
                  dashboard.recent_activity.recent_ratings.length < 10) {
                dashboard.recent_activity.recent_ratings.push({
                  structure_number: structure.structural_identity?.structural_identity_number,
                  location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                  combined_score: flat.flat_overall_rating.combined_score,
                  health_status: flat.flat_overall_rating.health_status,
                  assessment_date: flat.flat_overall_rating.last_assessment_date
                });
              }
            });
          }
        });
      }
    });
    
    // Calculate averages
    if (allStructuralRatings.length > 0) {
      dashboard.ratings_overview.structural_avg = Math.round(
        (allStructuralRatings.reduce((sum, rating) => sum + rating, 0) / allStructuralRatings.length) * 10
      ) / 10;
    }
    
    if (allNonStructuralRatings.length > 0) {
      dashboard.ratings_overview.non_structural_avg = Math.round(
        (allNonStructuralRatings.reduce((sum, rating) => sum + rating, 0) / allNonStructuralRatings.length) * 10
      ) / 10;
    }
    
    dashboard.ratings_overview.pending_ratings = dashboard.ratings_overview.total_flats - dashboard.ratings_overview.rated_flats;
    
    // Sort recent activities by date
    dashboard.recent_activity.recent_structures.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));
    dashboard.recent_activity.recent_ratings.sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
    
    // Add image statistics
    dashboard.image_overview = {
      total_images: totalImages,
      avg_images_per_structure: structures.length > 0 ? Math.round(totalImages / structures.length) : 0,
      documentation_completeness: dashboard.ratings_overview.total_flats > 0 ? 
        Math.round((totalImages / (dashboard.ratings_overview.total_flats * 15)) * 100) : 0 // Assume 15 components per flat
    };
    
    // Calculate monthly progress (last 6 months)
    const monthlyData = {};
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = monthDate.toISOString().substring(0, 7); // YYYY-MM format
      monthlyData[monthKey] = {
        structures_added: 0,
        ratings_completed: 0,
        images_uploaded: 0
      };
    }
    
    dashboard.progress_tracking.monthly_progress = monthlyData;
    
    const { sendSuccessResponse } = require('../utils/responseHandler');
    sendSuccessResponse(res, 'Dashboard data retrieved successfully', dashboard);

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    const { sendErrorResponse } = require('../utils/responseHandler');
    sendErrorResponse(res, 'Failed to retrieve dashboard data', 500, error.message);
  }
});

/**
 * @route   GET /api/structures/analytics/health-report
 * @desc    Get comprehensive health report across all structures
 * @access  Private
 */
router.get('/analytics/health-report', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const healthReport = {
      summary: {
        total_structures: user.structures?.length || 0,
        total_assessments: 0,
        overall_health_score: null,
        structures_needing_attention: 0
      },
      
      structural_health: {
        overall_average: null,
        component_averages: {
          beams: null,
          columns: null,
          slab: null,
          foundation: null
        },
        critical_components: [],
        improvement_trend: null
      },
      
      non_structural_health: {
        overall_average: null,
        component_averages: {},
        critical_components: [],
        most_problematic_areas: []
      },
      
      priority_matrix: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      
      maintenance_cost_estimate: {
        immediate_repairs: 0,
        planned_maintenance: 0,
        total_estimated_cost: 0,
        cost_breakdown: {}
      },
      
      inspection_schedule: {
        overdue: [],
        due_soon: [],
        scheduled: []
      }
    };
    
    if (!user.structures || user.structures.length === 0) {
      const { sendSuccessResponse } = require('../utils/responseHandler');
      return sendSuccessResponse(res, 'Health report generated (no structures found)', healthReport);
    }
    
    const allStructuralRatings = {
      beams: [],
      columns: [],
      slab: [],
      foundation: []
    };
    
    const allNonStructuralRatings = {
      brick_plaster: [],
      doors_windows: [],
      flooring_tiles: [],
      electrical_wiring: [],
      sanitary_fittings: [],
      railings: [],
      water_tanks: [],
      plumbing: [],
      sewage_system: [],
      panel_board: [],
      lifts: []
    };
    
    // Process all structures
    for (const structure of user.structures) {
      let structureAssessments = 0;
      let structureNeedsAttention = false;
      
      if (structure.geometric_details?.floors) {
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            floor.flats.forEach(flat => {
              if (flat.flat_overall_rating?.combined_score) {
                structureAssessments++;
                healthReport.summary.total_assessments++;
                
                if (flat.flat_overall_rating.combined_score < 3) {
                  structureNeedsAttention = true;
                }
                
                // Add to priority matrix
                const priority = flat.flat_overall_rating.priority?.toLowerCase() || 'medium';
                if (healthReport.priority_matrix[priority]) {
                  healthReport.priority_matrix[priority].push({
                    structure_number: structure.structural_identity?.structural_identity_number,
                    location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                    score: flat.flat_overall_rating.combined_score,
                    health_status: flat.flat_overall_rating.health_status
                  });
                }
              }
              
              // Collect structural ratings
              if (flat.structural_rating) {
                Object.keys(allStructuralRatings).forEach(component => {
                  if (flat.structural_rating[component]?.rating) {
                    allStructuralRatings[component].push(flat.structural_rating[component].rating);
                    
                    // Add critical components
                    if (flat.structural_rating[component].rating <= 2) {
                      healthReport.structural_health.critical_components.push({
                        structure_number: structure.structural_identity?.structural_identity_number,
                        component: component,
                        rating: flat.structural_rating[component].rating,
                        location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                        condition: flat.structural_rating[component].condition_comment
                      });
                    }
                  }
                });
              }
              
              // Collect non-structural ratings
              if (flat.non_structural_rating) {
                Object.keys(allNonStructuralRatings).forEach(component => {
                  if (flat.non_structural_rating[component]?.rating) {
                    allNonStructuralRatings[component].push(flat.non_structural_rating[component].rating);
                    
                    // Add critical components
                    if (flat.non_structural_rating[component].rating <= 2) {
                      healthReport.non_structural_health.critical_components.push({
                        structure_number: structure.structural_identity?.structural_identity_number,
                        component: component.replace('_', ' '),
                        rating: flat.non_structural_rating[component].rating,
                        location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                        condition: flat.non_structural_rating[component].condition_comment
                      });
                    }
                  }
                });
              }
            });
          }
        });
      }
      
      if (structureNeedsAttention) {
        healthReport.summary.structures_needing_attention++;
      }
    }
    
    // Calculate structural averages
    const structuralRatings = [];
    Object.keys(allStructuralRatings).forEach(component => {
      if (allStructuralRatings[component].length > 0) {
        const avg = allStructuralRatings[component].reduce((sum, rating) => sum + rating, 0) / allStructuralRatings[component].length;
        healthReport.structural_health.component_averages[component] = Math.round(avg * 10) / 10;
        structuralRatings.push(...allStructuralRatings[component]);
      }
    });
    
    if (structuralRatings.length > 0) {
      healthReport.structural_health.overall_average = Math.round(
        (structuralRatings.reduce((sum, rating) => sum + rating, 0) / structuralRatings.length) * 10
      ) / 10;
    }
    
    // Calculate non-structural averages
    const nonStructuralRatings = [];
    Object.keys(allNonStructuralRatings).forEach(component => {
      if (allNonStructuralRatings[component].length > 0) {
        const avg = allNonStructuralRatings[component].reduce((sum, rating) => sum + rating, 0) / allNonStructuralRatings[component].length;
        healthReport.non_structural_health.component_averages[component] = Math.round(avg * 10) / 10;
        nonStructuralRatings.push(...allNonStructuralRatings[component]);
      }
    });
    
    if (nonStructuralRatings.length > 0) {
      healthReport.non_structural_health.overall_average = Math.round(
        (nonStructuralRatings.reduce((sum, rating) => sum + rating, 0) / nonStructuralRatings.length) * 10
      ) / 10;
    }
    
    // Calculate overall health score
    if (healthReport.structural_health.overall_average && healthReport.non_structural_health.overall_average) {
      healthReport.summary.overall_health_score = Math.round(
        ((healthReport.structural_health.overall_average * 0.7) + (healthReport.non_structural_health.overall_average * 0.3)) * 10
      ) / 10;
    }
    
    // Sort priority matrices by score (worst first)
    Object.keys(healthReport.priority_matrix).forEach(priority => {
      healthReport.priority_matrix[priority].sort((a, b) => a.score - b.score);
    });
    
    // Sort critical components by rating (worst first)
    healthReport.structural_health.critical_components.sort((a, b) => a.rating - b.rating);
    healthReport.non_structural_health.critical_components.sort((a, b) => a.rating - b.rating);
    
    // Find most problematic non-structural areas
    const componentProblemCounts = {};
    healthReport.non_structural_health.critical_components.forEach(item => {
      componentProblemCounts[item.component] = (componentProblemCounts[item.component] || 0) + 1;
    });
    
    healthReport.non_structural_health.most_problematic_areas = Object.keys(componentProblemCounts)
      .sort((a, b) => componentProblemCounts[b] - componentProblemCounts[a])
      .slice(0, 5)
      .map(component => ({
        component: component,
        issue_count: componentProblemCounts[component],
        avg_rating: healthReport.non_structural_health.component_averages[component.replace(' ', '_')] || 0
      }));
    
    const { sendSuccessResponse } = require('../utils/responseHandler');
    sendSuccessResponse(res, 'Health report generated successfully', healthReport);

  } catch (error) {
    console.error('❌ Health report error:', error);
    const { sendErrorResponse } = require('../utils/responseHandler');
    sendErrorResponse(res, 'Failed to generate health report', 500, error.message);
  }
});

// =================== SEARCH & FILTERING APIs ===================

/**
 * @route   GET /api/structures/search
 * @desc    Advanced search across structures
 * @access  Private
 * @query   q, status, type, health, location, date_from, date_to
 */
router.get('/search', async (req, res) => {
  try {
    const {
      q,           // General search query
      status,      // Structure status filter
      type,        // Structure type filter  
      health,      // Health status filter
      location,    // Location filter
      date_from,   // Date range start
      date_to,     // Date range end
      min_rating,  // Minimum rating filter
      max_rating,  // Maximum rating filter
      has_issues   // Filter structures with issues
    } = req.query;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    let filteredStructures = user.structures || [];
    
    // Apply filters
    if (q) {
      const searchLower = q.toLowerCase();
      filteredStructures = filteredStructures.filter(structure => {
        return (
          structure.structural_identity?.structural_identity_number?.toLowerCase().includes(searchLower) ||
          structure.structural_identity?.uid?.toLowerCase().includes(searchLower) ||
          structure.administration?.client_name?.toLowerCase().includes(searchLower) ||
          structure.administration?.custodian?.toLowerCase().includes(searchLower) ||
          structure.structural_identity?.city_name?.toLowerCase().includes(searchLower) ||
          structure.location?.address?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    if (status) {
      filteredStructures = filteredStructures.filter(s => s.status === status);
    }
    
    if (type) {
      filteredStructures = filteredStructures.filter(s => s.structural_identity?.type_of_structure === type);
    }
    
    if (location) {
      const locationLower = location.toLowerCase();
      filteredStructures = filteredStructures.filter(s => 
        s.structural_identity?.city_name?.toLowerCase().includes(locationLower) ||
        s.structural_identity?.state_code?.toLowerCase().includes(locationLower)
      );
    }
    
    if (date_from || date_to) {
      const fromDate = date_from ? new Date(date_from) : new Date(0);
      const toDate = date_to ? new Date(date_to) : new Date();
      
      filteredStructures = filteredStructures.filter(s => {
        const createdDate = new Date(s.creation_info?.created_date || 0);
        return createdDate >= fromDate && createdDate <= toDate;
      });
    }
    
    // Apply rating and health filters
    if (health || min_rating || max_rating || has_issues) {
      filteredStructures = filteredStructures.filter(structure => {
        if (!structure.geometric_details?.floors) return false;
        
        let structureHealthScores = [];
        let hasIssuesFound = false;
        
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            floor.flats.forEach(flat => {
              if (flat.flat_overall_rating?.combined_score) {
                structureHealthScores.push(flat.flat_overall_rating.combined_score);
                
                if (flat.flat_overall_rating.priority === 'Critical' || 
                    flat.flat_overall_rating.priority === 'High') {
                  hasIssuesFound = true;
                }
              }
            });
          }
        });
        
        if (structureHealthScores.length === 0) return false;
        
        const avgScore = structureHealthScores.reduce((sum, score) => sum + score, 0) / structureHealthScores.length;
        const healthStatus = structureController.getHealthStatus(avgScore)?.toLowerCase();
        
        // Apply filters
        if (health && healthStatus !== health.toLowerCase()) return false;
        if (min_rating && avgScore < parseFloat(min_rating)) return false;
        if (max_rating && avgScore > parseFloat(max_rating)) return false;
        if (has_issues === 'true' && !hasIssuesFound) return false;
        if (has_issues === 'false' && hasIssuesFound) return false;
        
        return true;
      });
    }
    
    // Format results
    const searchResults = filteredStructures.map(structure => {
      const progress = structureController.calculateProgress(structure);
      
      // Calculate health metrics
      let avgRating = null;
      let healthStatus = null;
      let priorityIssues = 0;
      
      if (structure.geometric_details?.floors) {
        const allRatings = [];
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            floor.flats.forEach(flat => {
              if (flat.flat_overall_rating?.combined_score) {
                allRatings.push(flat.flat_overall_rating.combined_score);
                if (flat.flat_overall_rating.priority === 'Critical' || 
                    flat.flat_overall_rating.priority === 'High') {
                  priorityIssues++;
                }
              }
            });
          }
        });
        
        if (allRatings.length > 0) {
          avgRating = Math.round((allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length) * 10) / 10;
          healthStatus = structureController.getHealthStatus(avgRating);
        }
      }
      
      return {
        structure_id: structure._id,
        uid: structure.structural_identity?.uid,
        structural_identity_number: structure.structural_identity?.structural_identity_number,
        client_name: structure.administration?.client_name,
        custodian: structure.administration?.custodian,
        location: {
          city_name: structure.structural_identity?.city_name,
          state_code: structure.structural_identity?.state_code,
          address: structure.location?.address
        },
        type_of_structure: structure.structural_identity?.type_of_structure,
        status: structure.status,
        progress: progress.overall_percentage,
        health_metrics: {
          average_rating: avgRating,
          health_status: healthStatus,
          priority_issues: priorityIssues
        },
        created_date: structure.creation_info?.created_date,
        last_updated: structure.creation_info?.last_updated_date
      };
    });
    
    // Sort by relevance (structures with issues first, then by rating)
    searchResults.sort((a, b) => {
      if (a.health_metrics.priority_issues !== b.health_metrics.priority_issues) {
        return b.health_metrics.priority_issues - a.health_metrics.priority_issues;
      }
      if (a.health_metrics.average_rating && b.health_metrics.average_rating) {
        return a.health_metrics.average_rating - b.health_metrics.average_rating;
      }
      return new Date(b.last_updated) - new Date(a.last_updated);
    });
    
    const { sendSuccessResponse } = require('../utils/responseHandler');
    sendSuccessResponse(res, `Found ${searchResults.length} structures matching search criteria`, {
      search_query: q || '',
      filters_applied: {
        status: status || 'all',
        type: type || 'all',
        health: health || 'all',
        location: location || 'all',
        date_range: date_from || date_to ? `${date_from || 'start'} to ${date_to || 'end'}` : 'all',
        rating_range: min_rating || max_rating ? `${min_rating || 'min'} to ${max_rating || 'max'}` : 'all',
        has_issues: has_issues || 'all'
      },
      total_results: searchResults.length,
      results: searchResults
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    const { sendErrorResponse } = require('../utils/responseHandler');
    sendErrorResponse(res, 'Search failed', 500, error.message);
  }
});

// =================== ADDITIONAL UTILITY ROUTES ===================

/**
 * @route   GET /api/structures/export/csv
 * @desc    Export structures data as CSV
 * @access  Private
 */
router.get('/export/csv', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    // Generate CSV headers
    const headers = [
      'Structure ID',
      'UID', 
      'Structure Number',
      'Client Name',
      'Type',
      'Status',
      'City',
      'State',
      'Total Floors',
      'Total Flats',
      'Progress %',
      'Avg Structural Rating',
      'Avg Non-Structural Rating', 
      'Overall Health',
      'Critical Issues',
      'Created Date',
      'Last Updated'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    // Process each structure
    (user.structures || []).forEach(structure => {
      const progress = structureController.calculateProgress(structure);
      
      // Calculate ratings
      let structuralRatings = [];
      let nonStructuralRatings = [];
      let criticalIssues = 0;
      let totalFlats = 0;
      
      if (structure.geometric_details?.floors) {
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            totalFlats += floor.flats.length;
            floor.flats.forEach(flat => {
              if (flat.structural_rating?.overall_average) {
                structuralRatings.push(flat.structural_rating.overall_average);
              }
              if (flat.non_structural_rating?.overall_average) {
                nonStructuralRatings.push(flat.non_structural_rating.overall_average);
              }
              if (flat.flat_overall_rating?.priority === 'Critical') {
                criticalIssues++;
              }
            });
          }
        });
      }
      
      const avgStructural = structuralRatings.length > 0 ? 
        (structuralRatings.reduce((sum, r) => sum + r, 0) / structuralRatings.length).toFixed(2) : '';
      const avgNonStructural = nonStructuralRatings.length > 0 ? 
        (nonStructuralRatings.reduce((sum, r) => sum + r, 0) / nonStructuralRatings.length).toFixed(2) : '';
      
      const overallHealth = avgStructural && avgNonStructural ? 
        structureController.getHealthStatus((parseFloat(avgStructural) * 0.7) + (parseFloat(avgNonStructural) * 0.3)) : '';
      
      const row = [
        structure._id,
        structure.structural_identity?.uid || '',
        structure.structural_identity?.structural_identity_number || '',
        structure.administration?.client_name || '',
        structure.structural_identity?.type_of_structure || '',
        structure.status || '',
        structure.structural_identity?.city_name || '',
        structure.structural_identity?.state_code || '',
        structure.geometric_details?.number_of_floors || 0,
        totalFlats,
        progress.overall_percentage,
        avgStructural,
        avgNonStructural,
        overallHealth,
        criticalIssues,
        structure.creation_info?.created_date ? new Date(structure.creation_info.created_date).toISOString().split('T')[0] : '',
        structure.creation_info?.last_updated_date ? new Date(structure.creation_info.last_updated_date).toISOString().split('T')[0] : ''
      ];
      
      csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="structures_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('❌ CSV export error:', error);
    const { sendErrorResponse } = require('../utils/responseHandler');
    sendErrorResponse(res, 'Failed to export CSV', 500, error.message);
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

// =================== REMARKS MANAGEMENT ===================

/**
 * @route   POST /api/structures/:id/remarks
 * @desc    Add a remark to a structure (FE/VE roles only)
 * @access  Private (FE, VE)
 * @body    { text: string }
 */
router.post('/:id/remarks', structureController.addRemark);

/**
 * @route   GET /api/structures/:id/remarks
 * @desc    Get all remarks for a structure (FE/VE roles can view all)
 * @access  Private (FE, VE)
 */
router.get('/:id/remarks', structureController.getRemarks);

/**
 * @route   PUT /api/structures/:id/remarks/:remarkId
 * @desc    Update a specific remark (users can only update their own remarks)
 * @access  Private (FE, VE)
 * @body    { text: string }
 */
router.put('/:id/remarks/:remarkId', structureController.updateRemark);

/**
 * @route   DELETE /api/structures/:id/remarks/:remarkId
 * @desc    Delete a specific remark (users can only delete their own remarks)
 * @access  Private (FE, VE)
 */
router.delete('/:id/remarks/:remarkId', structureController.deleteRemark);

// =================== ERROR HANDLING ===================
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Structure API endpoint not found',
    statusCode: 404
  });
});

module.exports = router;