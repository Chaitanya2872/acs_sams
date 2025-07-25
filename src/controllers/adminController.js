const { catchAsync } = require('../middlewares/errorHandler');
const User = require('../models/User');
const Structure = require('../models/Structure');
const {
  StateCode,
  DistrictCode,
  StructureType,
  StructuralForm,
  MaterialConstruction,
  RatingDescription
} = require('../models/Codes');
const {
  sendSuccessResponse,
  sendErrorResponse,
  sendCreatedResponse,
  sendUpdatedResponse,
  sendPaginatedResponse
} = require('../utils/responseHandler');
const { MESSAGES, PAGINATION } = require('../utils/constants');
const { generatePaginationMeta, generateRandomPassword } = require('../utils/helpers');
const emailService = require('../services/emailService');

/**
 * Get all users with pagination and filtering
 * @route GET /api/admin/users
 * @access Private (Admin only)
 */
const getUsers = catchAsync(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    role,
    isActive,
    isEmailVerified,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = {};
  
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (isEmailVerified !== undefined) filter.isEmailVerified = isEmailVerified === 'true';

  // Search functionality
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-password')
      .lean(),
    User.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, users, pageNum, limitNum, total, MESSAGES.DATA_RETRIEVED);
});

/**
 * Get single user by ID
 * @route GET /api/admin/users/:id
 * @access Private (Admin only)
 */
const getUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Get user's structure count
  const structureCount = await Structure.countDocuments({ submittedBy: id });

  const userData = {
    ...user.toObject(),
    stats: {
      structuresSubmitted: structureCount
    }
  };

  sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, userData);
});

/**
 * Create new user
 * @route POST /api/admin/users
 * @access Private (Admin only)
 */
const createUser = catchAsync(async (req, res) => {
  const { name, email, role, designation, contactNumber } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendErrorResponse(res, 'User already exists with this email', 400);
  }

  // Generate random password
  const password = generateRandomPassword();

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    designation,
    contactNumber,
    authProvider: 'local',
    isActive: true
  });

  // Send welcome email with password
  try {
    await emailService.sendWelcomeEmail(user.email, password);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }

  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.password;

  sendCreatedResponse(res, userResponse, 'User created successfully');
});

/**
 * Update user
 * @route PUT /api/admin/users/:id
 * @access Private (Admin only)
 */
const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, role, designation, contactNumber, isActive } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Update allowed fields
  const fieldsToUpdate = {};
  if (name) fieldsToUpdate.name = name;
  if (role) fieldsToUpdate.role = role;
  if (designation) fieldsToUpdate.designation = designation;
  if (contactNumber) fieldsToUpdate.contactNumber = contactNumber;
  if (isActive !== undefined) fieldsToUpdate.isActive = isActive;

  const updatedUser = await User.findByIdAndUpdate(
    id,
    fieldsToUpdate,
    { new: true, runValidators: true }
  ).select('-password');

  sendUpdatedResponse(res, updatedUser, 'User updated successfully');
});

/**
 * Delete user (soft delete)
 * @route DELETE /api/admin/users/:id
 * @access Private (Admin only)
 */
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Check if user has submitted structures
  const structureCount = await Structure.countDocuments({ submittedBy: id });
  if (structureCount > 0) {
    return sendErrorResponse(res, 'Cannot delete user who has submitted structures', 400);
  }

  // Soft delete by deactivating
  user.isActive = false;
  user.email = `deleted_${Date.now()}_${user.email}`;
  await user.save();

  sendSuccessResponse(res, 'User deleted successfully');
});

/**
 * Reset user password
 * @route POST /api/admin/users/:id/reset-password
 * @access Private (Admin only)
 */
const resetUserPassword = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Generate new password
  const newPassword = generateRandomPassword();

  // Update password
  user.password = newPassword;
  await user.save();

  // Send email with new password
  try {
    await emailService.sendPasswordReset(user.email, newPassword);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }

  sendSuccessResponse(res, 'Password reset successfully');
});

/**
 * Get all state codes
 * @route GET /api/admin/codes/states
 * @access Private
 */
const getStateCodes = catchAsync(async (req, res) => {
  const stateCodes = await StateCode.find({ isActive: true }).sort({ name: 1 });
  sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, stateCodes);
});

/**
 * Get district codes by state
 * @route GET /api/admin/codes/districts/:stateCode
 * @access Private
 */
const getDistrictCodes = catchAsync(async (req, res) => {
  const { stateCode } = req.params;
  
  const districtCodes = await DistrictCode.find({ 
    stateCode: stateCode.toUpperCase(), 
    isActive: true 
  }).sort({ name: 1 });
  
  sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, districtCodes);
});

/**
 * Create district code
 * @route POST /api/admin/codes/districts
 * @access Private (Admin only)
 */
const createDistrictCode = catchAsync(async (req, res) => {
  const { stateCode, code, name } = req.body;

  // Check if district code already exists
  const existingDistrict = await DistrictCode.findOne({ 
    stateCode: stateCode.toUpperCase(), 
    code 
  });
  
  if (existingDistrict) {
    return sendErrorResponse(res, 'District code already exists for this state', 400);
  }

  const districtCode = await DistrictCode.create({
    stateCode: stateCode.toUpperCase(),
    code,
    name
  });

  sendCreatedResponse(res, districtCode, 'District code created successfully');
});

/**
 * Get all structure types
 * @route GET /api/admin/codes/structure-types
 * @access Private
 */
const getStructureTypes = catchAsync(async (req, res) => {
  const structureTypes = await StructureType.find({ isActive: true }).sort({ name: 1 });
  sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, structureTypes);
});

/**
 * Create structure type
 * @route POST /api/admin/codes/structure-types
 * @access Private (Admin only)
 */
const createStructureType = catchAsync(async (req, res) => {
  const { code, name, description, category } = req.body;

  const existingType = await StructureType.findOne({ code });
  if (existingType) {
    return sendErrorResponse(res, 'Structure type code already exists', 400);
  }

  const structureType = await StructureType.create({
    code,
    name,
    description,
    category
  });

  sendCreatedResponse(res, structureType, 'Structure type created successfully');
});

/**
 * Get all structural forms
 * @route GET /api/admin/codes/structural-forms
 * @access Private
 */
const getStructuralForms = catchAsync(async (req, res) => {
  const structuralForms = await StructuralForm.find({ isActive: true }).sort({ code: 1 });
  sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, structuralForms);
});

/**
 * Get all construction materials
 * @route GET /api/admin/codes/materials
 * @access Private
 */
const getConstructionMaterials = catchAsync(async (req, res) => {
  const materials = await MaterialConstruction.find({ isActive: true }).sort({ code: 1 });
  sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, materials);
});

/**
 * Get rating descriptions
 * @route GET /api/admin/codes/rating-descriptions
 * @access Private
 */
const getRatingDescriptions = catchAsync(async (req, res) => {
  const { elementType } = req.query;
  
  const filter = { isActive: true };
  if (elementType) {
    filter.elementType = elementType;
  }

  const ratingDescriptions = await RatingDescription.find(filter)
    .sort({ elementType: 1, rating: 1 });
  
  sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, ratingDescriptions);
});

/**
 * Create rating description
 * @route POST /api/admin/codes/rating-descriptions
 * @access Private (Admin only)
 */
const createRatingDescription = catchAsync(async (req, res) => {
  const { elementType, rating, condition, description, recommendedAction } = req.body;

  const existingRating = await RatingDescription.findOne({ elementType, rating });
  if (existingRating) {
    return sendErrorResponse(res, 'Rating description already exists for this element and rating', 400);
  }

  const ratingDescription = await RatingDescription.create({
    elementType,
    rating,
    condition,
    description,
    recommendedAction
  });

  sendCreatedResponse(res, ratingDescription, 'Rating description created successfully');
});

/**
 * Update rating description
 * @route PUT /api/admin/codes/rating-descriptions/:id
 * @access Private (Admin only)
 */
const updateRatingDescription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { condition, description, recommendedAction } = req.body;

  const ratingDescription = await RatingDescription.findByIdAndUpdate(
    id,
    { condition, description, recommendedAction },
    { new: true, runValidators: true }
  );

  if (!ratingDescription) {
    return sendErrorResponse(res, 'Rating description not found', 404);
  }

  sendUpdatedResponse(res, ratingDescription, 'Rating description updated successfully');
});

/**
 * Get system statistics
 * @route GET /api/admin/system-stats
 * @access Private (Admin only)
 */
const getSystemStats = catchAsync(async (req, res) => {
  const [
    userStats,
    structureStats,
    recentActivity
  ] = await Promise.all([
    // User statistics
    User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          verifiedUsers: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
          adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          inspectorUsers: { $sum: { $cond: [{ $eq: ['$role', 'inspector'] }, 1, 0] } },
          engineerUsers: { $sum: { $cond: [{ $eq: ['$role', 'engineer'] }, 1, 0] } },
          regularUsers: { $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] } }
        }
      }
    ]),

    // Structure statistics
    Structure.aggregate([
      {
        $group: {
          _id: null,
          totalStructures: { $sum: 1 },
          draftStructures: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          submittedStructures: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
          underInspectionStructures: { $sum: { $cond: [{ $eq: ['$status', 'under_inspection'] }, 1, 0] } },
          completedStructures: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          criticalStructures: { $sum: { $cond: [{ $eq: ['$priorityLevel', 'critical'] }, 1, 0] } },
          avgTotalScore: { $avg: '$totalScore' }
        }
      }
    ]),

    // Recent activity (last 10 actions)
    Promise.all([
      User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email role createdAt'),
      Structure.find()
        .populate('submittedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('structureIdentityNumber structureType status createdAt submittedBy')
    ])
  ]);

  const systemStats = {
    users: userStats[0] || {},
    structures: structureStats[0] || {},
    recentActivity: {
      newUsers: recentActivity[0],
      newStructures: recentActivity[1]
    }
  };

  sendSuccessResponse(res, 'System statistics retrieved successfully', systemStats);
});

/**
 * Bulk update structures
 * @route PUT /api/admin/structures/bulk-update
 * @access Private (Admin only)
 */
const bulkUpdateStructures = catchAsync(async (req, res) => {
  const { structureIds, updateData } = req.body;

  if (!Array.isArray(structureIds) || structureIds.length === 0) {
    return sendErrorResponse(res, 'Structure IDs are required', 400);
  }

  const allowedFields = ['status', 'priorityLevel', 'inspectorId', 'inspectionNotes'];
  const filteredUpdateData = {};
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredUpdateData[field] = updateData[field];
    }
  }

  filteredUpdateData.lastUpdatedBy = req.user.id;

  const result = await Structure.updateMany(
    { _id: { $in: structureIds } },
    filteredUpdateData
  );

  sendSuccessResponse(res, `${result.modifiedCount} structures updated successfully`, {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  });
});

/**
 * Get audit logs (placeholder for future implementation)
 * @route GET /api/admin/audit-logs
 * @access Private (Admin only)
 */
const getAuditLogs = catchAsync(async (req, res) => {
  // This would typically fetch from an audit log collection
  // For now, return a placeholder response
  
  const auditLogs = [
    {
      timestamp: new Date(),
      userId: req.user.id,
      action: 'LOGIN',
      resource: 'auth',
      details: 'User logged in successfully'
    }
  ];

  sendSuccessResponse(res, 'Audit logs retrieved successfully', auditLogs);
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getStateCodes,
  getDistrictCodes,
  createDistrictCode,
  getStructureTypes,
  createStructureType,
  getStructuralForms,
  getConstructionMaterials,
  getRatingDescriptions,
  createRatingDescription,
  updateRatingDescription,
  getSystemStats,
  bulkUpdateStructures,
  getAuditLogs
};