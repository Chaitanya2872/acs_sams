const winston = require('winston');
const path = require('path');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sams-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error' 
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log') 
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger.log(logLevel, 'Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

// Error logging middleware
const errorLogger = (error, req, res, next) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  });

  // Log to external monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry, DataDog, etc.
    // sentryLogger.captureException(error);
  }

  next(error);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
};

// =====================================================
// utils/helpers.js - Utility Functions
// =====================================================

const crypto = require('crypto');

// Generate unique structure ID
function generateStructureId(stateCode, districtCode, cityName, structureNumber) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${stateCode}${districtCode}${cityName}-${structureNumber}-${timestamp}${random}`.toUpperCase();
}

// Calculate structure risk score based on ratings
function calculateRiskScore(structure) {
  let totalScore = 0;
  let totalFlats = 0;

  structure.geometricDetails.floorDetails.forEach(floor => {
    floor.flats.forEach(flat => {
      totalFlats++;
      
      // Structural ratings (weighted higher)
      if (flat.structuralRating) {
        totalScore += (flat.structuralRating.beams?.rating || 5) * 0.3;
        totalScore += (flat.structuralRating.columns?.rating || 5) * 0.3;
        totalScore += (flat.structuralRating.slab?.rating || 5) * 0.2;
        totalScore += (flat.structuralRating.foundation?.rating || 5) * 0.2;
      }
    });
  });

  // Common areas rating
  const commonAreas = structure.geometricDetails.commonAreas;
  if (commonAreas) {
    totalScore += (commonAreas.waterTanks?.rating || 5) * 0.1;
    totalScore += (commonAreas.externalWaterSupplyAndPlumbing?.rating || 5) * 0.1;
    totalScore += (commonAreas.commonSewageSystem?.rating || 5) * 0.1;
    totalScore += (commonAreas.panelBoardAndTransformer?.rating || 5) * 0.1;
    totalScore += (commonAreas.lifts?.rating || 5) * 0.1;
  }

  const averageScore = totalFlats > 0 ? totalScore / totalFlats : 5;
  
  // Convert to risk level
  if (averageScore >= 4.5) return 'low';
  if (averageScore >= 3.5) return 'medium';
  if (averageScore >= 2.5) return 'high';
  return 'critical';
}

// Format Indian phone number
function formatPhoneNumber(phone) {
  if (!phone || phone.length !== 10) return phone;
  return `+91-${phone.substring(0, 5)}-${phone.substring(5)}`;
}

// Generate inspection report summary
function generateInspectionSummary(structure) {
  const summary = {
    structureName: structure.administrationDetails.popularNameOfStructure,
    totalFloors: structure.geometricDetails.numberOfFloors,
    totalFlats: 0,
    averageRatings: {
      structural: { beams: 0, columns: 0, slab: 0, foundation: 0 },
      nonStructural: { overall: 0 }
    },
    criticalIssues: [],
    recommendedActions: []
  };

  let structuralTotals = { beams: 0, columns: 0, slab: 0, foundation: 0 };
  let nonStructuralTotal = 0;

  structure.geometricDetails.floorDetails.forEach(floor => {
    floor.flats.forEach(flat => {
      summary.totalFlats++;

      // Collect structural ratings
      if (flat.structuralRating) {
        structuralTotals.beams += flat.structuralRating.beams?.rating || 0;
        structuralTotals.columns += flat.structuralRating.columns?.rating || 0;
        structuralTotals.slab += flat.structuralRating.slab?.rating || 0;
        structuralTotals.foundation += flat.structuralRating.foundation?.rating || 0;

        // Check for critical issues
        Object.entries(flat.structuralRating).forEach(([element, data]) => {
          if (data.rating <= 2) {
            summary.criticalIssues.push({
              location: `Floor ${floor.floorNumber}, Flat ${flat.flatNumber}`,
              element,
              rating: data.rating,
              condition: data.condition
            });
          }
        });
      }

      // Collect non-structural ratings
      if (flat.nonStructuralRating) {
        Object.values(flat.nonStructuralRating).forEach(item => {
          if (item.rating) nonStructuralTotal += item.rating;
        });
      }
    });
  });

  // Calculate averages
  if (summary.totalFlats > 0) {
    summary.averageRatings.structural.beams = (structuralTotals.beams / summary.totalFlats).toFixed(2);
    summary.averageRatings.structural.columns = (structuralTotals.columns / summary.totalFlats).toFixed(2);
    summary.averageRatings.structural.slab = (structuralTotals.slab / summary.totalFlats).toFixed(2);
    summary.averageRatings.structural.foundation = (structuralTotals.foundation / summary.totalFlats).toFixed(2);
    summary.averageRatings.nonStructural.overall = (nonStructuralTotal / (summary.totalFlats * 6)).toFixed(2);
  }

  // Generate recommendations based on issues
  if (summary.criticalIssues.length > 0) {
    summary.recommendedActions.push('Immediate inspection required for critical structural elements');
    summary.recommendedActions.push('Restrict access to areas with structural ratings below 2');
  }

  const overallAverage = (
    parseFloat(summary.averageRatings.structural.beams) +
    parseFloat(summary.averageRatings.structural.columns) +
    parseFloat(summary.averageRatings.structural.slab) +
    parseFloat(summary.averageRatings.structural.foundation)
  ) / 4;

  if (overallAverage < 3) {
    summary.recommendedActions.push('Schedule detailed structural assessment');
    summary.recommendedActions.push('Consider structural strengthening measures');
  } else if (overallAverage < 4) {
    summary.recommendedActions.push('Increase inspection frequency to quarterly');
    summary.recommendedActions.push('Plan preventive maintenance activities');
  }

  return summary;
}

// Validate coordinates
function validateCoordinates(longitude, latitude) {
  const lon = parseFloat(longitude);
  const lat = parseFloat(latitude);
  
  return {
    isValid: lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90,
    longitude: lon,
    latitude: lat
  };
}

// Generate maintenance cost estimate
function estimateMaintenanceCost(rating, area, category) {
  const baseCosts = {
    structural: { repair: 500, replacement: 1500 },
    electrical: { repair: 200, replacement: 800 },
    plumbing: { repair: 300, replacement: 900 },
    non_structural: { repair: 150, replacement: 400 }
  };

  const categoryData = baseCosts[category] || baseCosts.non_structural;
  const actionType = rating <= 2 ? 'replacement' : 'repair';
  const baseCost = categoryData[actionType];
  
  // Factor in area and complexity
  const areaFactor = Math.max(1, area / 100);
  const complexityFactor = rating <= 1 ? 1.5 : rating <= 2 ? 1.3 : 1.0;
  
  return Math.round(baseCost * areaFactor * complexityFactor);
}

module.exports = {
  generateStructureId,
  calculateRiskScore,
  formatPhoneNumber,
  generateInspectionSummary,
  validateCoordinates,
  estimateMaintenanceCost
};