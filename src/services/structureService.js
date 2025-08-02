const { User } = require('../models/schemas');

/**
 * Enhanced Structure Service
 * Contains business logic for structure operations, analytics, and reporting
 */
class StructureService {
  
  // =================== STRUCTURE ANALYTICS ===================
  
  /**
   * Calculate comprehensive structure analytics
   * @param {Array} structures - Array of structure documents
   * @returns {Object} Analytics data
   */
  calculateStructureAnalytics(structures) {
    const analytics = {
      overview: {
        total_structures: structures.length,
        total_floors: 0,
        total_flats: 0,
        total_images: 0,
        completion_rate: 0
      },
      
      status_distribution: {},
      type_distribution: {},
      health_distribution: { good: 0, fair: 0, poor: 0, critical: 0, unrated: 0 },
      
      rating_analytics: {
        structural: {
          average: null,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          total_assessments: 0
        },
        non_structural: {
          average: null,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          total_assessments: 0
        }
      },
      
      maintenance_insights: {
        critical_issues: 0,
        high_priority_issues: 0,
        structures_needing_attention: 0,
        estimated_total_cost: 0
      },
      
      progress_tracking: {
        fully_completed: 0,
        ratings_completed: 0,
        partially_completed: 0,
        just_initialized: 0
      },
      
      geographic_distribution: {},
      monthly_trends: {}
    };
    
    const allStructuralRatings = [];
    const allNonStructuralRatings = [];
    
    structures.forEach(structure => {
      // Count floors and flats
      if (structure.geometric_details?.floors) {
        analytics.overview.total_floors += structure.geometric_details.floors.length;
        
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            analytics.overview.total_flats += floor.flats.length;
            
            floor.flats.forEach(flat => {
              // Count images
              if (flat.structural_rating) {
                Object.values(flat.structural_rating).forEach(rating => {
                  if (rating.photos) {
                    analytics.overview.total_images += rating.photos.length;
                  }
                });
              }
              
              if (flat.non_structural_rating) {
                Object.values(flat.non_structural_rating).forEach(rating => {
                  if (rating.photos) {
                    analytics.overview.total_images += rating.photos.length;
                  }
                });
              }
              
              // Process ratings
              if (flat.flat_overall_rating?.combined_score) {
                const score = flat.flat_overall_rating.combined_score;
                const health = this.getHealthStatus(score).toLowerCase();
                
                if (analytics.health_distribution[health] !== undefined) {
                  analytics.health_distribution[health]++;
                }
                
                // Count priority issues
                if (flat.flat_overall_rating.priority === 'Critical') {
                  analytics.maintenance_insights.critical_issues++;
                } else if (flat.flat_overall_rating.priority === 'High') {
                  analytics.maintenance_insights.high_priority_issues++;
                }
              } else {
                analytics.health_distribution.unrated++;
              }
              
              // Collect structural ratings
              if (flat.structural_rating) {
                ['beams', 'columns', 'slab', 'foundation'].forEach(component => {
                  if (flat.structural_rating[component]?.rating) {
                    const rating = flat.structural_rating[component].rating;
                    allStructuralRatings.push(rating);
                    analytics.rating_analytics.structural.distribution[rating]++;
                    analytics.rating_analytics.structural.total_assessments++;
                  }
                });
              }
              
              // Collect non-structural ratings
              if (flat.non_structural_rating) {
                const nonStructuralComponents = [
                  'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
                  'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
                  'sewage_system', 'panel_board', 'lifts'
                ];
                
                nonStructuralComponents.forEach(component => {
                  if (flat.non_structural_rating[component]?.rating) {
                    const rating = flat.non_structural_rating[component].rating;
                    allNonStructuralRatings.push(rating);
                    analytics.rating_analytics.non_structural.distribution[rating]++;
                    analytics.rating_analytics.non_structural.total_assessments++;
                  }
                });
              }
            });
          }
        });
      }
      
      // Status distribution
      const status = structure.status || 'draft';
      analytics.status_distribution[status] = (analytics.status_distribution[status] || 0) + 1;
      
      // Type distribution
      const type = structure.structural_identity?.type_of_structure || 'unknown';
      analytics.type_distribution[type] = (analytics.type_distribution[type] || 0) + 1;
      
      // Geographic distribution
      const location = `${structure.structural_identity?.city_name || 'Unknown'}, ${structure.structural_identity?.state_code || 'Unknown'}`;
      analytics.geographic_distribution[location] = (analytics.geographic_distribution[location] || 0) + 1;
      
      // Progress tracking
      const progress = this.calculateProgress(structure);
      if (progress.overall_percentage >= 100) {
        analytics.progress_tracking.fully_completed++;
      } else if (progress.flat_ratings_completed) {
        analytics.progress_tracking.ratings_completed++;
      } else if (progress.overall_percentage > 30) {
        analytics.progress_tracking.partially_completed++;
      } else {
        analytics.progress_tracking.just_initialized++;
      }
      
      // Monthly trends (last 12 months)
      const createdDate = new Date(structure.creation_info?.created_date);
      if (createdDate) {
        const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
        analytics.monthly_trends[monthKey] = (analytics.monthly_trends[monthKey] || 0) + 1;
      }
    });
    
    // Calculate averages
    if (allStructuralRatings.length > 0) {
      analytics.rating_analytics.structural.average = 
        Math.round((allStructuralRatings.reduce((sum, r) => sum + r, 0) / allStructuralRatings.length) * 10) / 10;
    }
    
    if (allNonStructuralRatings.length > 0) {
      analytics.rating_analytics.non_structural.average = 
        Math.round((allNonStructuralRatings.reduce((sum, r) => sum + r, 0) / allNonStructuralRatings.length) * 10) / 10;
    }
    
    // Calculate completion rate
    const ratedFlats = Object.values(analytics.health_distribution).reduce((sum, count) => sum + count, 0) - analytics.health_distribution.unrated;
    analytics.overview.completion_rate = analytics.overview.total_flats > 0 ? 
      Math.round((ratedFlats / analytics.overview.total_flats) * 100) : 0;
    
    // Count structures needing attention
    analytics.maintenance_insights.structures_needing_attention = structures.filter(structure => {
      if (!structure.geometric_details?.floors) return false;
      
      return structure.geometric_details.floors.some(floor => 
        floor.flats && floor.flats.some(flat => 
          flat.flat_overall_rating?.priority === 'Critical' || flat.flat_overall_rating?.priority === 'High'
        )
      );
    }).length;
    
    return analytics;
  }
  
  // =================== HEALTH & MAINTENANCE CALCULATIONS ===================
  
  /**
   * Calculate structure health metrics
   * @param {Object} structure - Structure document
   * @returns {Object} Health metrics
   */
  calculateStructureHealth(structure) {
    const health = {
      overall_score: null,
      structural_health: null,
      non_structural_health: null,
      health_status: 'Unknown',
      priority_level: 'Medium',
      critical_components: [],
      recommendations: [],
      last_assessment: null,
      next_inspection_due: null
    };
    
    if (!structure.geometric_details?.floors) {
      return health;
    }
    
    const structuralRatings = [];
    const nonStructuralRatings = [];
    const criticalIssues = [];
    let lastAssessment = null;
    
    structure.geometric_details.floors.forEach(floor => {
      if (floor.flats) {
        floor.flats.forEach(flat => {
          // Collect structural ratings
          if (flat.structural_rating) {
            ['beams', 'columns', 'slab', 'foundation'].forEach(component => {
              if (flat.structural_rating[component]?.rating) {
                structuralRatings.push(flat.structural_rating[component].rating);
                
                if (flat.structural_rating[component].rating <= 2) {
                  criticalIssues.push({
                    type: 'structural',
                    component,
                    rating: flat.structural_rating[component].rating,
                    location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                    condition: flat.structural_rating[component].condition_comment
                  });
                }
                
                // Track latest assessment
                if (flat.structural_rating[component].inspection_date && 
                    (!lastAssessment || flat.structural_rating[component].inspection_date > lastAssessment)) {
                  lastAssessment = flat.structural_rating[component].inspection_date;
                }
              }
            });
          }
          
          // Collect non-structural ratings
          if (flat.non_structural_rating) {
            const components = [
              'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
              'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
              'sewage_system', 'panel_board', 'lifts'
            ];
            
            components.forEach(component => {
              if (flat.non_structural_rating[component]?.rating) {
                nonStructuralRatings.push(flat.non_structural_rating[component].rating);
                
                if (flat.non_structural_rating[component].rating <= 2) {
                  criticalIssues.push({
                    type: 'non_structural',
                    component: component.replace('_', ' '),
                    rating: flat.non_structural_rating[component].rating,
                    location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                    condition: flat.non_structural_rating[component].condition_comment
                  });
                }
                
                // Track latest assessment
                if (flat.non_structural_rating[component].inspection_date && 
                    (!lastAssessment || flat.non_structural_rating[component].inspection_date > lastAssessment)) {
                  lastAssessment = flat.non_structural_rating[component].inspection_date;
                }
              }
            });
          }
        });
      }
    });
    
    // Calculate health scores
    if (structuralRatings.length > 0) {
      health.structural_health = Math.round(
        (structuralRatings.reduce((sum, r) => sum + r, 0) / structuralRatings.length) * 10
      ) / 10;
    }
    
    if (nonStructuralRatings.length > 0) {
      health.non_structural_health = Math.round(
        (nonStructuralRatings.reduce((sum, r) => sum + r, 0) / nonStructuralRatings.length) * 10
      ) / 10;
    }
    
    // Calculate overall score (70% structural, 30% non-structural)
    if (health.structural_health && health.non_structural_health) {
      health.overall_score = Math.round(
        ((health.structural_health * 0.7) + (health.non_structural_health * 0.3)) * 10
      ) / 10;
      
      health.health_status = this.getHealthStatus(health.overall_score);
      health.priority_level = this.getPriority(health.overall_score);
    }
    
    health.critical_components = criticalIssues.sort((a, b) => a.rating - b.rating);
    health.last_assessment = lastAssessment;
    
    // Calculate next inspection due date
    if (lastAssessment) {
      const nextInspection = new Date(lastAssessment);
      const monthsToAdd = health.overall_score >= 4 ? 12 : health.overall_score >= 3 ? 6 : 3;
      nextInspection.setMonth(nextInspection.getMonth() + monthsToAdd);
      health.next_inspection_due = nextInspection;
    }
    
    // Generate recommendations
    health.recommendations = this.generateHealthRecommendations(criticalIssues, health.overall_score);
    
    return health;
  }
  
  /**
   * Generate maintenance recommendations based on health analysis
   * @param {Array} criticalIssues - Array of critical issues
   * @param {number} overallScore - Overall health score
   * @returns {Array} Recommendations
   */
  generateHealthRecommendations(criticalIssues, overallScore) {
    const recommendations = [];
    
    // Critical issues recommendations
    criticalIssues.forEach(issue => {
      recommendations.push({
        priority: issue.rating === 1 ? 'Critical' : 'High',
        category: issue.type === 'structural' ? 'Structural Safety' : 'Maintenance',
        description: `Address ${issue.component} issues at ${issue.location}`,
        action: this.getRecommendedAction(issue.component, issue.rating),
        timeline: issue.rating === 1 ? 'Immediate' : 'Within 30 days',
        estimated_cost: this.getEstimatedCost(issue.component, issue.rating, issue.type)
      });
    });
    
    // General recommendations based on overall score
    if (overallScore && overallScore < 3) {
      recommendations.push({
        priority: 'High',
        category: 'General Maintenance',
        description: 'Structure requires comprehensive maintenance plan',
        action: 'Develop and implement systematic maintenance schedule',
        timeline: 'Within 60 days',
        estimated_cost: { estimated_amount: 100000, currency: 'INR' }
      });
    } else if (overallScore && overallScore < 4) {
      recommendations.push({
        priority: 'Medium',
        category: 'Preventive Maintenance',
        description: 'Implement preventive maintenance measures',
        action: 'Schedule regular inspections and minor repairs',
        timeline: 'Within 90 days',
        estimated_cost: { estimated_amount: 50000, currency: 'INR' }
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  // =================== IMAGE ANALYTICS ===================
  
  /**
   * Calculate image analytics for structures
   * @param {Array} structures - Array of structure documents
   * @returns {Object} Image analytics
   */
  calculateImageAnalytics(structures) {
    const analytics = {
      total_images: 0,
      images_by_type: { structural: 0, non_structural: 0 },
      images_by_component: {},
      images_by_rating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      documentation_completeness: {
        fully_documented: 0,
        partially_documented: 0,
        not_documented: 0
      },
      upload_trends: {},
      quality_metrics: {
        high_quality_images: 0,
        low_quality_images: 0,
        images_with_comments: 0
      }
    };
    
    structures.forEach(structure => {
      if (structure.geometric_details?.floors) {
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            floor.flats.forEach(flat => {
              let flatImages = 0;
              
              // Process structural images
              if (flat.structural_rating) {
                ['beams', 'columns', 'slab', 'foundation'].forEach(component => {
                  if (flat.structural_rating[component]?.photos) {
                    const photos = flat.structural_rating[component].photos;
                    flatImages += photos.length;
                    analytics.total_images += photos.length;
                    analytics.images_by_type.structural += photos.length;
                    
                    if (!analytics.images_by_component[component]) {
                      analytics.images_by_component[component] = 0;
                    }
                    analytics.images_by_component[component] += photos.length;
                    
                    // Count by rating
                    const rating = flat.structural_rating[component].rating;
                    if (rating >= 1 && rating <= 5) {
                      analytics.images_by_rating[rating] += photos.length;
                    }
                    
                    // Quality metrics
                    if (rating <= 2) {
                      analytics.quality_metrics.low_quality_images += photos.length;
                    } else if (rating >= 4) {
                      analytics.quality_metrics.high_quality_images += photos.length;
                    }
                    
                    if (flat.structural_rating[component].condition_comment) {
                      analytics.quality_metrics.images_with_comments += photos.length;
                    }
                    
                    // Upload trends
                    if (flat.structural_rating[component].inspection_date) {
                      const uploadDate = new Date(flat.structural_rating[component].inspection_date);
                      const monthKey = `${uploadDate.getFullYear()}-${String(uploadDate.getMonth() + 1).padStart(2, '0')}`;
                      analytics.upload_trends[monthKey] = (analytics.upload_trends[monthKey] || 0) + photos.length;
                    }
                  }
                });
              }
              
              // Process non-structural images
              if (flat.non_structural_rating) {
                const components = [
                  'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
                  'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
                  'sewage_system', 'panel_board', 'lifts'
                ];
                
                components.forEach(component => {
                  if (flat.non_structural_rating[component]?.photos) {
                    const photos = flat.non_structural_rating[component].photos;
                    flatImages += photos.length;
                    analytics.total_images += photos.length;
                    analytics.images_by_type.non_structural += photos.length;
                    
                    const componentKey = component.replace('_', ' ');
                    if (!analytics.images_by_component[componentKey]) {
                      analytics.images_by_component[componentKey] = 0;
                    }
                    analytics.images_by_component[componentKey] += photos.length;
                    
                    // Count by rating
                    const rating = flat.non_structural_rating[component].rating;
                    if (rating >= 1 && rating <= 5) {
                      analytics.images_by_rating[rating] += photos.length;
                    }
                    
                    // Quality metrics
                    if (rating <= 2) {
                      analytics.quality_metrics.low_quality_images += photos.length;
                    } else if (rating >= 4) {
                      analytics.quality_metrics.high_quality_images += photos.length;
                    }
                    
                    if (flat.non_structural_rating[component].condition_comment) {
                      analytics.quality_metrics.images_with_comments += photos.length;
                    }
                    
                    // Upload trends
                    if (flat.non_structural_rating[component].inspection_date) {
                      const uploadDate = new Date(flat.non_structural_rating[component].inspection_date);
                      const monthKey = `${uploadDate.getFullYear()}-${String(uploadDate.getMonth() + 1).padStart(2, '0')}`;
                      analytics.upload_trends[monthKey] = (analytics.upload_trends[monthKey] || 0) + photos.length;
                    }
                  }
                });
              }
              
              // Documentation completeness
              const expectedImages = 15; // 4 structural + 11 non-structural components
              if (flatImages >= expectedImages * 0.8) {
                analytics.documentation_completeness.fully_documented++;
              } else if (flatImages > 0) {
                analytics.documentation_completeness.partially_documented++;
              } else {
                analytics.documentation_completeness.not_documented++;
              }
            });
          }
        });
      }
    });
    
    return analytics;
  }
  
  // =================== UTILITY METHODS ===================
  
  /**
   * Get health status based on rating
   * @param {number} rating - Rating value
   * @returns {string} Health status
   */
  getHealthStatus(rating) {
    if (!rating || isNaN(rating)) return 'Unknown';
    if (rating >= 4) return 'Good';
    if (rating >= 3) return 'Fair';
    if (rating >= 2) return 'Poor';
    return 'Critical';
  }
  
  /**
   * Get priority level based on rating
   * @param {number} rating - Rating value
   * @returns {string} Priority level
   */
  getPriority(rating) {
    if (!rating || isNaN(rating)) return 'Medium';
    if (rating >= 4) return 'Low';
    if (rating >= 3) return 'Medium';
    if (rating >= 2) return 'High';
    return 'Critical';
  }
  
  /**
   * Calculate structure progress
   * @param {Object} structure - Structure document
   * @returns {Object} Progress data
   */
  calculateProgress(structure) {
    let progress = {
      location: false,
      administrative: false,
      geometric_details: false,
      floors_added: false,
      flats_added: false,
      flat_ratings_completed: false,
      overall_percentage: 0
    };

    // Check location
    if (structure.structural_identity?.structural_identity_number && structure.location?.coordinates?.latitude) {
      progress.location = true;
    }

    // Check administrative
    if (structure.administration?.client_name && structure.administration?.email_id) {
      progress.administrative = true;
    }

    // Check geometric details
    if (structure.geometric_details?.structure_width && structure.geometric_details?.structure_height) {
      progress.geometric_details = true;
    }

    // Check floors
    if (structure.geometric_details?.floors?.length > 0) {
      progress.floors_added = true;
      
      // Check flats
      const hasFlats = structure.geometric_details.floors.some(floor => floor.flats?.length > 0);
      if (hasFlats) {
        progress.flats_added = true;
        
        // Check if all flats have ratings
        let allFlatsRated = true;
        for (const floor of structure.geometric_details.floors) {
          if (floor.flats?.length > 0) {
            for (const flat of floor.flats) {
              if (!flat.flat_overall_rating?.combined_score) {
                allFlatsRated = false;
                break;
              }
            }
          }
          if (!allFlatsRated) break;
        }
        progress.flat_ratings_completed = allFlatsRated;
      }
    }

    // Calculate percentage
    const completedSteps = Object.values(progress).filter(val => val === true).length;
    progress.overall_percentage = Math.round((completedSteps / 6) * 100);

    return progress;
  }
  
  /**
   * Get estimated cost for maintenance
   * @param {string} component - Component name
   * @param {number} rating - Current rating
   * @param {string} type - Component type
   * @returns {Object} Cost estimate
   */
  getEstimatedCost(component, rating, type = 'structural') {
    // Base cost estimates in rupees
    const baseCosts = {
      structural: {
        beams: { 1: 50000, 2: 25000 },
        columns: { 1: 75000, 2: 35000 },
        slab: { 1: 60000, 2: 30000 },
        foundation: { 1: 100000, 2: 50000 }
      },
      non_structural: {
        'brick plaster': { 1: 15000, 2: 8000 },
        'doors windows': { 1: 25000, 2: 12000 },
        'flooring tiles': { 1: 20000, 2: 10000 },
        'electrical wiring': { 1: 30000, 2: 15000 },
        'sanitary fittings': { 1: 18000, 2: 9000 },
        railings: { 1: 12000, 2: 6000 },
        'water tanks': { 1: 40000, 2: 20000 },
        plumbing: { 1: 25000, 2: 12000 },
        'sewage system': { 1: 35000, 2: 18000 },
        'panel board': { 1: 15000, 2: 8000 },
        lifts: { 1: 200000, 2: 100000 }
      }
    };
    
    const componentKey = component.replace('_', ' ');
    const cost = baseCosts[type]?.[componentKey]?.[rating] || baseCosts[type]?.[component]?.[rating] || 10000;
    
    return {
      estimated_amount: cost,
      currency: 'INR',
      range: {
        min: Math.round(cost * 0.8),
        max: Math.round(cost * 1.2)
      }
    };
  }
  
  /**
   * Get recommended action for maintenance
   * @param {string} component - Component name
   * @param {number} rating - Current rating
   * @returns {string} Recommended action
   */
  getRecommendedAction(component, rating) {
    const actions = {
      // Structural components
      beams: {
        1: 'Immediate structural assessment and beam replacement/strengthening required',
        2: 'Detailed inspection and repair of cracks/deflection within 30 days'
      },
      columns: {
        1: 'Critical - Immediate structural engineer assessment required',
        2: 'Repair cracks and assess load-bearing capacity'
      },
      slab: {
        1: 'Major slab repair or replacement required immediately',
        2: 'Repair cracks and address deflection issues'
      },
      foundation: {
        1: 'Critical foundation repair required immediately',
        2: 'Foundation repair needed - address settlement issues'
      },
      
      // Non-structural components
      'brick plaster': {
        1: 'Complete replastering required',
        2: 'Repair cracks and repaint'
      },
      'doors windows': {
        1: 'Replace doors/windows completely',
        2: 'Repair hardware and improve sealing'
      },
      'electrical wiring': {
        1: 'Complete electrical system overhaul required',
        2: 'Upgrade wiring and replace faulty components'
      },
      plumbing: {
        1: 'Major plumbing renovation needed',
        2: 'Repair leaks and replace worn fixtures'
      }
    };
    
    const componentKey = component.replace('_', ' ');
    return actions[componentKey]?.[rating] || actions[component]?.[rating] || 
           `${componentKey || component} requires professional assessment`;
  }
  
  // =================== SEARCH & FILTERING ===================
  
  /**
   * Filter structures based on multiple criteria
   * @param {Array} structures - Array of structures
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered structures
   */
  filterStructures(structures, filters) {
    const {
      search,
      status,
      type,
      health,
      location,
      dateFrom,
      dateTo,
      minRating,
      maxRating,
      hasIssues
    } = filters;
    
    return structures.filter(structure => {
      // Text search
      if (search) {
        const searchLower = search.toLowerCase();
        const searchableText = [
          structure.structural_identity?.structural_identity_number,
          structure.structural_identity?.uid,
          structure.administration?.client_name,
          structure.administration?.custodian,
          structure.structural_identity?.city_name,
          structure.location?.address
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) return false;
      }
      
      // Status filter
      if (status && structure.status !== status) return false;
      
      // Type filter
      if (type && structure.structural_identity?.type_of_structure !== type) return false;
      
      // Location filter
      if (location) {
        const locationLower = location.toLowerCase();
        const structureLocation = [
          structure.structural_identity?.city_name,
          structure.structural_identity?.state_code
        ].join(' ').toLowerCase();
        
        if (!structureLocation.includes(locationLower)) return false;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        const createdDate = new Date(structure.creation_info?.created_date || 0);
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        
        if (createdDate < fromDate || createdDate > toDate) return false;
      }
      
      // Health and rating filters
      if (health || minRating || maxRating || hasIssues !== undefined) {
        const healthMetrics = this.calculateStructureHealth(structure);
        
        if (health && healthMetrics.health_status?.toLowerCase() !== health.toLowerCase()) return false;
        if (minRating && (!healthMetrics.overall_score || healthMetrics.overall_score < parseFloat(minRating))) return false;
        if (maxRating && (!healthMetrics.overall_score || healthMetrics.overall_score > parseFloat(maxRating))) return false;
        
        if (hasIssues !== undefined) {
          const hasIssuesFound = healthMetrics.critical_components.length > 0;
          if (hasIssues && !hasIssuesFound) return false;
          if (!hasIssues && hasIssuesFound) return false;
        }
      }
      
      return true;
    });
  }
}

module.exports = new StructureService();