const Structure = require('../models/Structure');

class StructureService {
  async calculateOverallRating(structuralRatings) {
    if (!structuralRatings || structuralRatings.length === 0) {
      return null;
    }
    
    const ratings = {
      beams: [],
      columns: [],
      slabs: [],
      foundation: []
    };
    
    structuralRatings.forEach(rating => {
      if (ratings[rating.elementType]) {
        ratings[rating.elementType].push(rating.rating);
      }
    });
    
    const overallRating = {};
    
    for (const [element, ratingArray] of Object.entries(ratings)) {
      if (ratingArray.length > 0) {
        overallRating[element] = Math.round(
          ratingArray.reduce((sum, rating) => sum + rating, 0) / ratingArray.length
        );
      }
    }
    
    return overallRating;
  }
  
  async generateInspectionSchedule(structure) {
    const currentDate = new Date();
    let nextInspectionDate = new Date(currentDate);
    
    // Calculate next inspection based on overall rating
    const overallRating = structure.overallStructuralRating;
    if (!overallRating) return null;
    
    const averageRating = Object.values(overallRating).reduce((sum, rating) => sum + rating, 0) / Object.keys(overallRating).length;
    
    // Schedule based on rating (lower rating = more frequent inspections)
    if (averageRating >= 4) {
      nextInspectionDate.setFullYear(currentDate.getFullYear() + 2); // 2 years
    } else if (averageRating >= 3) {
      nextInspectionDate.setFullYear(currentDate.getFullYear() + 1); // 1 year
    } else if (averageRating >= 2) {
      nextInspectionDate.setMonth(currentDate.getMonth() + 6); // 6 months
    } else {
      nextInspectionDate.setMonth(currentDate.getMonth() + 3); // 3 months
    }
    
    return nextInspectionDate;
  }
  
  async getStructuresRequiringInspection() {
    const currentDate = new Date();
    
    return await Structure.find({
      isActive: true,
      $or: [
        { nextInspectionDate: { $lte: currentDate } },
        { nextInspectionDate: null },
        { inspectionStatus: 'requires_reinspection' }
      ]
    }).populate('createdBy', 'name email');
  }
}

module.exports = new StructureService();