/**
 * Mobile-optimized response handlers for tablet application
 */

/**
 * Send mobile-optimized success response
 * - Smaller payloads
 * - Essential data only
 * - Consistent structure for mobile parsing
 */
const sendMobileResponse = (res, message = 'Success', data = null, statusCode = 200, meta = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    mobile: true // Flag for mobile responses
  };

  if (data !== null) {
    // Optimize data for mobile consumption
    response.data = optimizeForMobile(data);
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Optimize data structure for mobile/tablet consumption
 */
const optimizeForMobile = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => optimizeSingleItem(item));
  } else if (typeof data === 'object' && data !== null) {
    return optimizeSingleItem(data);
  }
  return data;
};

/**
 * Optimize single item for mobile
 */
const optimizeSingleItem = (item) => {
  if (!item || typeof item !== 'object') return item;

  // Structure-specific optimizations
  if (item.structureIdentityNumber) {
    return {
      id: item._id || item.id,
      identityNumber: item.structureIdentityNumber,
      type: item.structureType,
      status: item.status,
      priority: item.priorityLevel,
      location: {
        state: item.stateCode,
        district: item.districtCode,
        city: item.cityName,
        coordinates: item.coordinates
      },
      scores: {
        structural: item.overallStructuralScore,
        nonStructural: item.overallNonStructuralScore,
        total: item.totalScore
      },
      client: item.clientName,
      engineer: item.engineerDesignation,
      contact: item.contactDetails,
      email: item.emailId,
      dimensions: {
        floors: item.numberOfFloors,
        width: item.structureWidth,
        length: item.structureLength,
        height: item.totalHeight
      },
      ratings: {
        structural: item.overallStructuralRatings,
        nonStructural: item.overallNonStructuralRatings
      },
      metadata: {
        submittedBy: item.submittedBy,
        submittedAt: item.submittedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }
    };
  }

  // User-specific optimizations
  if (item.email && item.role) {
    return {
      id: item._id || item.id,
      name: item.name,
      email: item.email,
      role: item.role,
      designation: item.designation,
      contact: item.contactNumber,
      avatar: item.avatar,
      active: item.isActive,
      verified: item.isEmailVerified,
      lastLogin: item.lastLoginAt,
      metadata: {
        createdAt: item.createdAt,
        loginCount: item.loginCount
      }
    };
  }

  return item;
};

/**
 * Send mobile-optimized structure list for tablets
 */
const sendMobileStructureList = (res, structures, page, limit, total) => {
  const mobileStructures = structures.map(structure => ({
    id: structure._id,
    identityNumber: structure.structureIdentityNumber,
    type: structure.structureType,
    status: structure.status,
    priority: structure.priorityLevel,
    city: structure.cityName,
    state: structure.stateCode,
    totalScore: structure.totalScore,
    client: structure.clientName,
    submittedAt: structure.submittedAt,
    // Minimal data for list view
    thumbnail: {
      floors: structure.numberOfFloors,
      dimensions: `${structure.structureWidth}x${structure.structureLength}m`,
      height: `${structure.totalHeight}m`
    }
  }));

  const pagination = {
    current: page,
    total: Math.ceil(total / limit),
    hasNext: (page * limit) < total,
    hasPrev: page > 1,
    totalItems: total,
    itemsPerPage: limit
  };

  return res.json({
    success: true,
    message: 'Structures retrieved successfully',
    timestamp: new Date().toISOString(),
    mobile: true,
    data: mobileStructures,
    pagination
  });
};

/**
 * Send mobile-optimized dashboard data
 */
const sendMobileDashboard = (res, dashboardData) => {
  const mobileDashboard = {
    summary: {
      total: dashboardData.totalStructures,
      critical: dashboardData.priorityDistribution?.critical?.count || 0,
      pending: dashboardData.statusDistribution?.draft || 0,
      completed: dashboardData.statusDistribution?.completed || 0
    },
    charts: {
      status: dashboardData.statusDistribution,
      types: dashboardData.typeDistribution,
      priority: dashboardData.priorityDistribution
    },
    averages: {
      structural: Math.round((dashboardData.averageScores?.avgStructuralScore || 0) * 10) / 10,
      nonStructural: Math.round((dashboardData.averageScores?.avgNonStructuralScore || 0) * 10) / 10,
      total: Math.round((dashboardData.averageScores?.avgTotalScore || 0) * 10) / 10
    },
    recent: dashboardData.recentStructures?.slice(0, 5).map(s => ({
      id: s._id,
      identityNumber: s.structureIdentityNumber,
      type: s.structureType,
      status: s.status,
      score: s.totalScore,
      city: s.cityName
    })) || []
  };

  return res.json({
    success: true,
    message: 'Dashboard data retrieved successfully',
    timestamp: new Date().toISOString(),
    mobile: true,
    data: mobileDashboard
  });
};

/**
 * Mobile error response with user-friendly messages
 */
const sendMobileError = (res, message, statusCode = 500, code = null) => {
  // Convert technical errors to user-friendly mobile messages
  const mobileMessage = getMobileFriendlyMessage(message, statusCode);
  
  return res.status(statusCode).json({
    success: false,
    message: mobileMessage,
    timestamp: new Date().toISOString(),
    mobile: true,
    errorCode: code,
    // Add retry information for mobile
    retry: statusCode >= 500 || statusCode === 429
  });
};

/**
 * Convert technical errors to mobile-friendly messages
 */
const getMobileFriendlyMessage = (message, statusCode) => {
  if (statusCode === 401) return 'Please log in to continue';
  if (statusCode === 403) return 'You don\'t have permission for this action';
  if (statusCode === 404) return 'Item not found';
  if (statusCode === 429) return 'Too many requests. Please wait a moment';
  if (statusCode >= 500) return 'Something went wrong. Please try again';
  
  // Keep validation messages as they are helpful for forms
  if (message.toLowerCase().includes('validation')) return message;
  if (message.toLowerCase().includes('required')) return message;
  if (message.toLowerCase().includes('invalid')) return message;
  
  return message;
};

module.exports = {
  sendMobileResponse,
  sendMobileStructureList,
  sendMobileDashboard,
  sendMobileError,
  optimizeForMobile
};