const { catchAsync } = require('../middlewares/errorHandler');
const { User, Structure, Inspection } = require('../models/schemas');
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
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
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
  const structureCount = await Structure.countDocuments({ 'creation_info.created_by': id });

  const userData = {
    ...user.toObject(),
    stats: {
      structuresCreated: structureCount
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
  const { username, email, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [
      { email: email.toLowerCase() },
      { username }
    ]
  });
  
  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      return sendErrorResponse(res, 'User already exists with this email', 400);
    }
    if (existingUser.username === username) {
      return sendErrorResponse(res, 'Username already taken', 400);
    }
  }

  // Generate random password
  const password = generateRandomPassword();

  // Create user
  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password,
    role: role || 'engineer',
    isActive: true,
    isEmailVerified: false
  });

  // Send welcome email with password
  try {
    await emailService.sendWelcomeEmail(user.email, username, role);
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
  const { username, role, isActive } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Update allowed fields
  const fieldsToUpdate = {};
  if (username) fieldsToUpdate.username = username;
  if (role) fieldsToUpdate.role = role;
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

  // Check if user has created structures
  const structureCount = await Structure.countDocuments({ 'creation_info.created_by': id });
  if (structureCount > 0) {
    return sendErrorResponse(res, 'Cannot delete user who has created structures', 400);
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
    await emailService.sendPasswordResetOTP(user.email, newPassword);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }

  sendSuccessResponse(res, 'Password reset successfully');
});

/**
 * Get all structures with admin privileges
 * @route GET /api/admin/structures
 * @access Private (Admin only)
 */
const getAllStructures = catchAsync(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    state_code,
    district_code,
    type_of_structure,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = {};
  
  if (state_code) filter['structural_identity.state_code'] = state_code;
  if (district_code) filter['structural_identity.district_code'] = district_code;
  if (type_of_structure) filter['structural_identity.type_of_structure'] = type_of_structure;
  if (status) filter.status = status;

  // Search functionality
  if (search) {
    filter.$or = [
      { 'structural_identity.uid': { $regex: search, $options: 'i' } },
      { 'administration.client_name': { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [structures, total] = await Promise.all([
    Structure.find(filter)
      .populate('creation_info.created_by', 'username email role')
      .populate('creation_info.last_updated_by', 'username email role')
      .sort(sort)
      .skip(skip)
      .limit(limitNum),
    Structure.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, structures, pageNum, limitNum, total, 'Structures retrieved successfully');
});

/**
 * Get structure details by ID (admin)
 * @route GET /api/admin/structures/:id
 * @access Private (Admin only)
 */
const getStructureById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const structure = await Structure.findById(id)
    .populate('creation_info.created_by', 'username email role')
    .populate('creation_info.last_updated_by', 'username email role');

  if (!structure) {
    return sendErrorResponse(res, 'Structure not found', 404);
  }

  sendSuccessResponse(res, 'Structure retrieved successfully', structure);
});

/**
 * Update structure status (admin)
 * @route PUT /api/admin/structures/:id/status
 * @access Private (Admin only)
 */
const updateStructureStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['draft', 'submitted', 'approved', 'requires_inspection', 'maintenance_needed'];
  
  if (!validStatuses.includes(status)) {
    return sendErrorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const structure = await Structure.findById(id);
  if (!structure) {
    return sendErrorResponse(res, 'Structure not found', 404);
  }

  // Update structure status
  structure.status = status;
  structure.creation_info.last_updated_by = req.user.userId;
  structure.creation_info.last_updated_date = new Date();
  
  if (notes) {
    structure.overall_condition_summary = notes;
  }

  await structure.save();

  await structure.populate('creation_info.created_by', 'username email role');
  await structure.populate('creation_info.last_updated_by', 'username email role');

  sendUpdatedResponse(res, structure, 'Structure status updated successfully');
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
    inspectionStats,
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
          viewerUsers: { $sum: { $cond: [{ $eq: ['$role', 'viewer'] }, 1, 0] } }
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
          approvedStructures: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          requiresInspection: { $sum: { $cond: [{ $eq: ['$status', 'requires_inspection'] }, 1, 0] } },
          maintenanceNeeded: { $sum: { $cond: [{ $eq: ['$status', 'maintenance_needed'] }, 1, 0] } },
          residentialCount: { 
            $sum: { 
              $cond: [{ $eq: ['$structural_identity.type_of_structure', 'residential'] }, 1, 0] 
            } 
          },
          commercialCount: { 
            $sum: { 
              $cond: [{ $eq: ['$structural_identity.type_of_structure', 'commercial'] }, 1, 0] 
            } 
          },
          educationalCount: { 
            $sum: { 
              $cond: [{ $eq: ['$structural_identity.type_of_structure', 'educational'] }, 1, 0] 
            } 
          },
          hospitalCount: { 
            $sum: { 
              $cond: [{ $eq: ['$structural_identity.type_of_structure', 'hospital'] }, 1, 0] 
            } 
          },
          industrialCount: { 
            $sum: { 
              $cond: [{ $eq: ['$structural_identity.type_of_structure', 'industrial'] }, 1, 0] 
            } 
          }
        }
      }
    ]),

    // Inspection statistics
    Inspection.aggregate([
      {
        $group: {
          _id: null,
          totalInspections: { $sum: 1 },
          pendingInspections: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          completedInspections: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          followupRequired: { $sum: { $cond: [{ $eq: ['$status', 'requires_followup'] }, 1, 0] } },
          routineInspections: { $sum: { $cond: [{ $eq: ['$inspection_type', 'routine'] }, 1, 0] } },
          detailedInspections: { $sum: { $cond: [{ $eq: ['$inspection_type', 'detailed'] }, 1, 0] } },
          emergencyInspections: { $sum: { $cond: [{ $eq: ['$inspection_type', 'emergency'] }, 1, 0] } }
        }
      }
    ]),

    // Recent activity (last 10 actions)
    Promise.all([
      User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email role createdAt'),
      Structure.find()
        .populate('creation_info.created_by', 'username email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('structural_identity status createdAt creation_info'),
      Inspection.find()
        .populate('inspector_id', 'username email')
        .populate('structure_id', 'structural_identity.uid')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('inspection_type status createdAt inspector_id structure_id')
    ])
  ]);

  const systemStats = {
    users: userStats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      adminUsers: 0,
      inspectorUsers: 0,
      engineerUsers: 0,
      viewerUsers: 0
    },
    structures: structureStats[0] || {
      totalStructures: 0,
      draftStructures: 0,
      submittedStructures: 0,
      approvedStructures: 0,
      requiresInspection: 0,
      maintenanceNeeded: 0,
      residentialCount: 0,
      commercialCount: 0,
      educationalCount: 0,
      hospitalCount: 0,
      industrialCount: 0
    },
    inspections: inspectionStats[0] || {
      totalInspections: 0,
      pendingInspections: 0,
      completedInspections: 0,
      followupRequired: 0,
      routineInspections: 0,
      detailedInspections: 0,
      emergencyInspections: 0
    },
    recentActivity: {
      newUsers: recentActivity[0],
      newStructures: recentActivity[1],
      recentInspections: recentActivity[2]
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

  const allowedFields = ['status', 'overall_condition_summary'];
  const filteredUpdateData = {};
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredUpdateData[field] = updateData[field];
    }
  }

  // Add update tracking
  filteredUpdateData['creation_info.last_updated_by'] = req.user.userId;
  filteredUpdateData['creation_info.last_updated_date'] = new Date();

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
 * Get structure ratings summary
 * @route GET /api/admin/structures/ratings-summary
 * @access Private (Admin only)
 */
const getStructureRatingsSummary = catchAsync(async (req, res) => {
  const ratingsSummary = await Structure.aggregate([
    {
      $unwind: '$geometric_details.floors'
    },
    {
      $unwind: '$geometric_details.floors.flats'
    },
    {
      $project: {
        uid: '$structural_identity.uid',
        client_name: '$administration.client_name',
        floor_number: '$geometric_details.floors.floor_number',
        flat_number: '$geometric_details.floors.flats.flat_number',
        structural_ratings: '$geometric_details.floors.flats.structural_rating',
        non_structural_ratings: '$geometric_details.floors.flats.non_structural_rating'
      }
    },
    {
      $group: {
        _id: '$uid',
        client_name: { $first: '$client_name' },
        total_flats: { $sum: 1 },
        avg_beam_rating: { $avg: '$structural_ratings.beams.rating' },
        avg_column_rating: { $avg: '$structural_ratings.columns.rating' },
        avg_slab_rating: { $avg: '$structural_ratings.slab.rating' },
        avg_foundation_rating: { $avg: '$structural_ratings.foundation.rating' },
        critical_flats: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $lte: ['$structural_ratings.beams.rating', 2] },
                  { $lte: ['$structural_ratings.columns.rating', 2] },
                  { $lte: ['$structural_ratings.slab.rating', 2] },
                  { $lte: ['$structural_ratings.foundation.rating', 2] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        client_name: 1,
        total_flats: 1,
        avg_structural_rating: {
          $round: [
            {
              $avg: [
                '$avg_beam_rating',
                '$avg_column_rating', 
                '$avg_slab_rating',
                '$avg_foundation_rating'
              ]
            },
            2
          ]
        },
        critical_flats: 1,
        health_status: {
          $cond: {
            if: { $gte: [{ $avg: ['$avg_beam_rating', '$avg_column_rating', '$avg_slab_rating', '$avg_foundation_rating'] }, 4] },
            then: 'Good',
            else: {
              $cond: {
                if: { $gte: [{ $avg: ['$avg_beam_rating', '$avg_column_rating', '$avg_slab_rating', '$avg_foundation_rating'] }, 3] },
                then: 'Fair',
                else: 'Poor'
              }
            }
          }
        }
      }
    },
    {
      $sort: { avg_structural_rating: 1 }
    }
  ]);

  sendSuccessResponse(res, 'Structure ratings summary retrieved successfully', ratingsSummary);
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
      userId: req.user.userId,
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
  getAllStructures,
  getStructureById,
  updateStructureStatus,
  getSystemStats,
  bulkUpdateStructures,
  getStructureRatingsSummary,
  getAuditLogs
};