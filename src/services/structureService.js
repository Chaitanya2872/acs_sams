const { Structure, Inspection } = require('../models/schemas');

class StructureService {
  /**
   * Calculate overall structural rating for a structure
   * @param {Object} structure - Structure document
   * @returns {Object} Overall rating summary
   */
  async calculateOverallStructuralRating(structure) {
    if (!structure.geometric_details?.floors || structure.geometric_details.floors.length === 0) {
      return null;
    }

    const allRatings = {
      beams: [],
      columns: [],
      slab: [],
      foundation: []
    };

    // Collect all structural ratings from all flats
    structure.geometric_details.floors.forEach(floor => {
      if (floor.flats && floor.flats.length > 0) {
        floor.flats.forEach(flat => {
          if (flat.structural_rating) {
            if (flat.structural_rating.beams?.rating) {
              allRatings.beams.push(flat.structural_rating.beams.rating);
            }
            if (flat.structural_rating.columns?.rating) {
              allRatings.columns.push(flat.structural_rating.columns.rating);
            }
            if (flat.structural_rating.slab?.rating) {
              allRatings.slab.push(flat.structural_rating.slab.rating);
            }
            if (flat.structural_rating.foundation?.rating) {
              allRatings.foundation.push(flat.structural_rating.foundation.rating);
            }
          }
        });
      }
    });

    const overallRating = {};
    let totalRating = 0;
    let componentCount = 0;

    // Calculate average rating for each structural component
    for (const [component, ratings] of Object.entries(allRatings)) {
      if (ratings.length > 0) {
        const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        overallRating[component] = Math.round(average * 10) / 10; // Round to 1 decimal place
        totalRating += average;
        componentCount++;
      }
    }

    // Calculate overall average
    overallRating.overall = componentCount > 0 ? Math.round((totalRating / componentCount) * 10) / 10 : 0;

    // Determine health status
    const overallAvg = overallRating.overall;
    if (overallAvg >= 4) {
      overallRating.healthStatus = 'Good';
      overallRating.priority = 'Low';
    } else if (overallAvg >= 3) {
      overallRating.healthStatus = 'Fair';
      overallRating.priority = 'Medium';
    } else if (overallAvg >= 2) {
      overallRating.healthStatus = 'Poor';
      overallRating.priority = 'High';
    } else {
      overallRating.healthStatus = 'Critical';
      overallRating.priority = 'Critical';
    }

    return overallRating;
  }

  /**
   * Calculate overall non-structural rating for a structure
   * @param {Object} structure - Structure document
   * @returns {Object} Non-structural rating summary
   */
  async calculateOverallNonStructuralRating(structure) {
    if (!structure.geometric_details?.floors || structure.geometric_details.floors.length === 0) {
      return null;
    }

    const nonStructuralComponents = [
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'
    ];

    const allRatings = {};
    nonStructuralComponents.forEach(component => {
      allRatings[component] = [];
    });

    // Collect all non-structural ratings from all flats
    structure.geometric_details.floors.forEach(floor => {
      if (floor.flats && floor.flats.length > 0) {
        floor.flats.forEach(flat => {
          if (flat.non_structural_rating) {
            nonStructuralComponents.forEach(component => {
              if (flat.non_structural_rating[component]?.rating) {
                allRatings[component].push(flat.non_structural_rating[component].rating);
              }
            });
          }
        });
      }
    });

    const overallNonStructuralRating = {};
    let totalRating = 0;
    let componentCount = 0;

    // Calculate average rating for each non-structural component
    for (const [component, ratings] of Object.entries(allRatings)) {
      if (ratings.length > 0) {
        const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        overallNonStructuralRating[component] = Math.round(average * 10) / 10;
        totalRating += average;
        componentCount++;
      }
    }

    // Calculate overall average for non-structural components
    overallNonStructuralRating.overall = componentCount > 0 ? Math.round((totalRating / componentCount) * 10) / 10 : 0;

    return overallNonStructuralRating;
  }

  /**
   * Generate inspection schedule based on structure condition
   * @param {Object} structure - Structure document
   * @returns {Date} Next inspection date
   */
  async generateInspectionSchedule(structure) {
    const currentDate = new Date();
    let nextInspectionDate = new Date(currentDate);

    // Calculate overall rating to determine inspection frequency
    const overallRating = await this.calculateOverallStructuralRating(structure);
    
    if (!overallRating) {
      // If no ratings available, schedule in 6 months
      nextInspectionDate.setMonth(currentDate.getMonth() + 6);
      return nextInspectionDate;
    }

    const averageRating = overallRating.overall;

    // Schedule based on rating (lower rating = more frequent inspections)
    if (averageRating >= 4.5) {
      nextInspectionDate.setFullYear(currentDate.getFullYear() + 3); // 3 years for excellent condition
    } else if (averageRating >= 4) {
      nextInspectionDate.setFullYear(currentDate.getFullYear() + 2); // 2 years for good condition
    } else if (averageRating >= 3) {
      nextInspectionDate.setFullYear(currentDate.getFullYear() + 1); // 1 year for fair condition
    } else if (averageRating >= 2) {
      nextInspectionDate.setMonth(currentDate.getMonth() + 6); // 6 months for poor condition
    } else {
      nextInspectionDate.setMonth(currentDate.getMonth() + 3); // 3 months for critical condition
    }

    return nextInspectionDate;
  }

  /**
   * Get structures requiring inspection
   * @returns {Array} Structures needing inspection
   */
  async getStructuresRequiringInspection() {
    const currentDate = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(currentDate.getMonth() + 1);

    // Find structures that need inspection soon or are overdue
    const structures = await Structure.find({
      $or: [
        { status: 'requires_inspection' },
        { 
          'geometric_details.floors.flats.inspection_schedule.next_inspection_date': { 
            $lte: oneMonthFromNow 
          } 
        }
      ]
    })
    .populate('creation_info.created_by', 'username email role')
    .select('structural_identity administration geometric_details.floors.flats.inspection_schedule status');

    return structures.map(structure => {
      const overallRating = this.calculateOverallStructuralRating(structure);
      return {
        ...structure.toObject(),
        overallRating
      };
    });
  }

  /**
   * Get structures by priority level
   * @param {string} priority - Priority level (Critical, High, Medium, Low)
   * @returns {Array} Structures matching priority
   */
  async getStructuresByPriority(priority) {
    const structures = await Structure.find({})
      .populate('creation_info.created_by', 'username email role');

    const structuresWithRatings = [];

    for (const structure of structures) {
      const overallRating = await this.calculateOverallStructuralRating(structure);
      if (overallRating && overallRating.priority === priority) {
        structuresWithRatings.push({
          ...structure.toObject(),
          overallRating
        });
      }
    }

    return structuresWithRatings;
  }

  /**
   * Generate maintenance recommendations based on ratings
   * @param {Object} structure - Structure document
   * @returns {Array} Maintenance recommendations
   */
  async generateMaintenanceRecommendations(structure) {
    const recommendations = [];

    if (!structure.geometric_details?.floors) {
      return recommendations;
    }

    structure.geometric_details.floors.forEach((floor, floorIndex) => {
      if (floor.flats && floor.flats.length > 0) {
        floor.flats.forEach((flat, flatIndex) => {
          // Check structural components
          if (flat.structural_rating) {
            const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
            
            structuralComponents.forEach(component => {
              const rating = flat.structural_rating[component];
              if (rating && rating.rating <= 2) {
                recommendations.push({
                  type: 'Structural',
                  priority: rating.rating === 1 ? 'Critical' : 'High',
                  component: component.charAt(0).toUpperCase() + component.slice(1),
                  location: `Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1}`,
                  issue: rating.condition_comment || `${component} needs attention`,
                  recommendedAction: this.getStructuralRecommendation(component, rating.rating),
                  urgency: rating.rating === 1 ? 'Immediate' : 'Within 30 days'
                });
              }
            });
          }

          // Check non-structural components
          if (flat.non_structural_rating) {
            const nonStructuralComponents = [
              'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
              'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
              'sewage_system', 'panel_board', 'lifts'
            ];

            nonStructuralComponents.forEach(component => {
              const rating = flat.non_structural_rating[component];
              if (rating && rating.rating <= 2) {
                recommendations.push({
                  type: 'Non-Structural',
                  priority: rating.rating === 1 ? 'High' : 'Medium',
                  component: component.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  location: `Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1}`,
                  issue: rating.condition_comment || `${component.replace('_', ' ')} needs attention`,
                  recommendedAction: this.getNonStructuralRecommendation(component, rating.rating),
                  urgency: rating.rating === 1 ? 'Within 15 days' : 'Within 60 days'
                });
              }
            });
          }
        });
      }
    });

    // Sort by priority and urgency
    const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    recommendations.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.urgency.localeCompare(b.urgency);
    });

    return recommendations;
  }

  /**
   * Get structural component recommendation based on rating
   * @param {string} component - Component name
   * @param {number} rating - Rating value
   * @returns {string} Recommendation text
   */
  getStructuralRecommendation(component, rating) {
    const recommendations = {
      beams: {
        1: 'Immediate structural assessment required. Consider beam replacement or strengthening.',
        2: 'Detailed inspection and repair of cracks/deflection needed within 30 days.'
      },
      columns: {
        1: 'Critical - Immediate structural engineer assessment. Potential load-bearing compromise.',
        2: 'Repair cracks and assess load-bearing capacity. Monitor closely.'
      },
      slab: {
        1: 'Major slab repair or replacement required. Safety risk present.',
        2: 'Repair cracks and address deflection issues. Check for water damage.'
      },
      foundation: {
        1: 'Critical foundation issues. Immediate professional assessment required.',
        2: 'Foundation repair needed. Address settlement and drainage issues.'
      }
    };

    return recommendations[component]?.[rating] || `${component} requires professional assessment.`;
  }

  /**
   * Get non-structural component recommendation based on rating
   * @param {string} component - Component name
   * @param {number} rating - Rating value
   * @returns {string} Recommendation text
   */
  getNonStructuralRecommendation(component, rating) {
    const recommendations = {
      brick_plaster: {
        1: 'Complete replastering required. Address underlying moisture issues.',
        2: 'Repair cracks and repaint. Check for seepage.'
      },
      doors_windows: {
        1: 'Replace doors/windows. Check for security and weather sealing.',
        2: 'Repair hardware and improve sealing. Paint/stain as needed.'
      },
      electrical_wiring: {
        1: 'Complete electrical system overhaul required. Safety hazard present.',
        2: 'Upgrade wiring and replace faulty components. Check circuit capacity.'
      },
      plumbing: {
        1: 'Major plumbing renovation needed. Replace old pipes.',
        2: 'Repair leaks and replace worn fixtures. Check water pressure.'
      }
    };

    return recommendations[component]?.[rating] || `${component.replace('_', ' ')} needs maintenance attention.`;
  }

  /**
   * Calculate structure health metrics
   * @param {string} structureId - Structure ID
   * @returns {Object} Health metrics
   */
  async calculateStructureHealthMetrics(structureId) {
    const structure = await Structure.findById(structureId);
    if (!structure) {
      throw new Error('Structure not found');
    }

    const structuralRating = await this.calculateOverallStructuralRating(structure);
    const nonStructuralRating = await this.calculateOverallNonStructuralRating(structure);
    const recommendations = await this.generateMaintenanceRecommendations(structure);
    const nextInspectionDate = await this.generateInspectionSchedule(structure);

    // Count critical issues
    const criticalIssues = recommendations.filter(r => r.priority === 'Critical').length;
    const highPriorityIssues = recommendations.filter(r => r.priority === 'High').length;

    // Calculate overall health score
    const structuralScore = structuralRating?.overall || 0;
    const nonStructuralScore = nonStructuralRating?.overall || 0;
    const overallHealthScore = Math.round(((structuralScore * 0.7) + (nonStructuralScore * 0.3)) * 10) / 10;

    return {
      structuralRating,
      nonStructuralRating,
      overallHealthScore,
      healthStatus: structuralRating?.healthStatus || 'Unknown',
      priority: structuralRating?.priority || 'Medium',
      criticalIssues,
      highPriorityIssues,
      totalRecommendations: recommendations.length,
      recommendations: recommendations.slice(0, 10), // Top 10 recommendations
      nextInspectionDate,
      lastUpdated: new Date()
    };
  }
}

module.exports = new StructureService();