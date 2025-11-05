const { catchAsync } = require('../middlewares/errorHandler');
const { User } = require('../models/schemas');
const {
  sendSuccessResponse,
  sendErrorResponse,
  sendCreatedResponse,
  sendUpdatedResponse,
  sendPaginatedResponse
} = require('../utils/responseHandler');
const { MESSAGES, PAGINATION } = require('../utils/constants');
const { generateRandomPassword } = require('../utils/helpers');
const emailService = require('../services/emailService');

/**
 * Get all users with pagination and filtering
 * @route GET /api/admin/users
 * @access Private (Admin, AD, TE, VE)
 */
const getUsers = catchAsync(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE || 1,
    limit = PAGINATION.DEFAULT_LIMIT || 10,
    role,
    is_active,
    isEmailVerified,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT || 100);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = {};
  
  if (role) filter.role = role;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (isEmailVerified !== undefined) filter.isEmailVerified = isEmailVerified === 'true';

  // Search functionality
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'profile.first_name': { $regex: search, $options: 'i' } },
      { 'profile.last_name': { $regex: search, $options: 'i' } }
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
      .select('-password -structures') // Don't send structures in list
      .lean(),
    User.countDocuments(filter)
  ]);

  // Add structure count for each user
  const usersWithStats = users.map(user => ({
    ...user,
    structure_count: user.structures?.length || 0
  }));

  sendPaginatedResponse(res, usersWithStats, pageNum, limitNum, total, 'Users retrieved successfully');
});

/**
 * Get single user by ID
 * @route GET /api/admin/users/:id
 * @access Private (Admin, AD, TE, VE)
 */
const getUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Get structure count
  const structureCount = user.structures?.length || 0;

  const userData = {
    ...user.toObject(),
    structure_count: structureCount
  };

  sendSuccessResponse(res, 'User retrieved successfully', userData);
});

/**
 * Create new user
 * @route POST /api/admin/users
 * @access Private (Admin, AD, TE, VE)
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
  const password = generateRandomPassword ? generateRandomPassword() : Math.random().toString(36).slice(-8);

  // Create user
  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password,
    role: role || 'engineer',
    roles: [role || 'engineer'], // Support multiple roles
    is_active: true,
    isEmailVerified: false,
    structures: [],
    stats: {
      total_structures_created: 0,
      total_structures_submitted: 0,
      total_structures_approved: 0,
      last_activity_date: new Date(),
      total_login_count: 0
    }
  });

  // Send welcome email with password
  try {
    if (emailService && emailService.sendWelcomeEmail) {
      await emailService.sendWelcomeEmail(user.email, username, role);
    }
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
 * @access Private (Admin, AD, TE, VE)
 */
const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { username, role, is_active } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Update allowed fields
  const fieldsToUpdate = {};
  if (username) fieldsToUpdate.username = username;
  if (role) {
    fieldsToUpdate.role = role;
    fieldsToUpdate.roles = [role]; // Update roles array too
  }
  if (is_active !== undefined) fieldsToUpdate.is_active = is_active;

  const updatedUser = await User.findByIdAndUpdate(
    id,
    fieldsToUpdate,
    { new: true, runValidators: false } // Skip validators to avoid structure validation
  ).select('-password');

  sendUpdatedResponse(res, updatedUser, 'User updated successfully');
});

/**
 * Delete user (soft delete)
 * @route DELETE /api/admin/users/:id
 * @access Private (Admin, AD, TE, VE)
 */
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Check if user has created structures
  const structureCount = user.structures?.length || 0;
  if (structureCount > 0) {
    return sendErrorResponse(res, `Cannot delete user who has created ${structureCount} structures`, 400);
  }

  // Soft delete by deactivating
  user.is_active = false;
  user.email = `deleted_${Date.now()}_${user.email}`;
  await user.save();

  sendSuccessResponse(res, 'User deleted successfully');
});

/**
 * Reset user password
 * @route POST /api/admin/users/:id/reset-password
 * @access Private (Admin, AD, TE, VE)
 */
const resetUserPassword = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return sendErrorResponse(res, 'User not found', 404);
  }

  // Generate new password
  const newPassword = generateRandomPassword ? generateRandomPassword() : Math.random().toString(36).slice(-8);

  // Update password
  user.password = newPassword;
  await user.save();

  // Send email with new password
  try {
    if (emailService && emailService.sendPasswordResetOTP) {
      await emailService.sendPasswordResetOTP(user.email, newPassword);
    }
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }

  sendSuccessResponse(res, 'Password reset successfully. New password sent to user email.');
});

/**
 * Get all structures with admin privileges
 * @route GET /api/admin/structures
 * @access Private (Admin, AD, TE, VE)
 */
const getAllStructures = catchAsync(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE || 1,
    limit = PAGINATION.DEFAULT_LIMIT || 10,
    state_code,
    district_code,
    type_of_structure,
    status,
    search,
    sortBy = 'creation_info.created_date',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT || 100);

  console.log('📊 Admin fetching all structures from all users');

  // Get all users with structures
  const allUsers = await User.find({ 
    'structures.0': { $exists: true } 
  }).select('structures username email');

  console.log(`📊 Found ${allUsers.length} users with structures`);

  // Collect all structures with owner info
  let allStructures = [];
  
  allUsers.forEach(user => {
    if (user.structures && user.structures.length > 0) {
      user.structures.forEach(structure => {
        const structureObj = structure.toObject();
        structureObj._ownerId = user._id;
        structureObj._ownerUsername = user.username;
        structureObj._ownerEmail = user.email;
        allStructures.push(structureObj);
      });
    }
  });

  console.log(`📊 Total structures collected: ${allStructures.length}`);

  // Apply filters
  if (state_code) {
    allStructures = allStructures.filter(s => 
      s.structural_identity?.state_code === state_code
    );
  }
  
  if (district_code) {
    allStructures = allStructures.filter(s => 
      s.structural_identity?.district_code === district_code
    );
  }
  
  if (type_of_structure) {
    allStructures = allStructures.filter(s => 
      s.structural_identity?.type_of_structure === type_of_structure
    );
  }
  
  if (status) {
    allStructures = allStructures.filter(s => s.status === status);
  }

  // Search functionality
  if (search) {
    const searchLower = search.toLowerCase();
    allStructures = allStructures.filter(s => 
      s.structural_identity?.uid?.toLowerCase().includes(searchLower) ||
      s.structural_identity?.structural_identity_number?.toLowerCase().includes(searchLower) ||
      s.administration?.client_name?.toLowerCase().includes(searchLower) ||
      s.location?.address?.toLowerCase().includes(searchLower) ||
      s._ownerUsername?.toLowerCase().includes(searchLower) ||
      s._ownerEmail?.toLowerCase().includes(searchLower)
    );
  }

  // Sort structures
  allStructures.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'creation_info.created_date':
      case 'created_date':
        aValue = a.creation_info?.created_date || new Date(0);
        bValue = b.creation_info?.created_date || new Date(0);
        break;
      case 'creation_info.last_updated_date':
      case 'last_updated':
        aValue = a.creation_info?.last_updated_date || new Date(0);
        bValue = b.creation_info?.last_updated_date || new Date(0);
        break;
      case 'structure_number':
        aValue = a.structural_identity?.structural_identity_number || '';
        bValue = b.structural_identity?.structural_identity_number || '';
        break;
      case 'client_name':
        aValue = a.administration?.client_name || '';
        bValue = b.administration?.client_name || '';
        break;
      default:
        aValue = a.creation_info?.created_date || new Date(0);
        bValue = b.creation_info?.created_date || new Date(0);
    }
    
    if (sortOrder === 'desc') {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    } else {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }
  });

  // Pagination
  const total = allStructures.length;
  const skip = (pageNum - 1) * limitNum;
  const paginatedStructures = allStructures.slice(skip, skip + limitNum);

  // Format response
  const structuresData = paginatedStructures.map(structure => ({
    structure_id: structure._id,
    uid: structure.structural_identity?.uid,
    structural_identity_number: structure.structural_identity?.structural_identity_number,
    structure_name: structure.structural_identity?.structure_name,
    client_name: structure.administration?.client_name,
    location: {
      city_name: structure.structural_identity?.city_name,
      state_code: structure.structural_identity?.state_code,
      address: structure.location?.address
    },
    type_of_structure: structure.structural_identity?.type_of_structure,
    status: structure.status,
    created_date: structure.creation_info?.created_date,
    last_updated_date: structure.creation_info?.last_updated_date,
    owner: {
      user_id: structure._ownerId,
      username: structure._ownerUsername,
      email: structure._ownerEmail
    }
  }));

  sendPaginatedResponse(res, structuresData, pageNum, limitNum, total, 'Structures retrieved successfully');
});

/**
 * Get structure details by ID (admin)
 * @route GET /api/admin/structures/:id
 * @access Private (Admin, AD, TE, VE)
 */
const getStructureById = catchAsync(async (req, res) => {
  const { id } = req.params;

  console.log('📊 Admin fetching structure:', id);

  // Find structure across all users
  const users = await User.find({ 'structures._id': id });
  
  let foundStructure = null;
  let foundUser = null;
  
  for (const user of users) {
    const structure = user.structures.id(id);
    if (structure) {
      foundStructure = structure;
      foundUser = user;
      break;
    }
  }

  if (!foundStructure) {
    return sendErrorResponse(res, 'Structure not found', 404);
  }

  const structureData = {
    ...foundStructure.toObject(),
    owner: {
      user_id: foundUser._id,
      username: foundUser.username,
      email: foundUser.email
    }
  };

  sendSuccessResponse(res, 'Structure retrieved successfully', structureData);
});

/**
 * Update structure status (admin)
 * @route PUT /api/admin/structures/:id/status
 * @access Private (Admin, AD, TE, VE)
 */
const updateStructureStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = [
    'draft', 'location_completed', 'admin_completed', 'geometric_completed',
    'ratings_in_progress', 'ratings_completed', 'submitted', 'approved'
  ];
  
  if (!validStatuses.includes(status)) {
    return sendErrorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  // Find structure across all users
  const users = await User.find({ 'structures._id': id });
  
  let foundStructure = null;
  let foundUser = null;
  
  for (const user of users) {
    const structure = user.structures.id(id);
    if (structure) {
      foundStructure = structure;
      foundUser = user;
      break;
    }
  }

  if (!foundStructure) {
    return sendErrorResponse(res, 'Structure not found', 404);
  }

  // Update structure status
  foundStructure.status = status;
  foundStructure.creation_info.last_updated_date = new Date();
  
  if (notes) {
    foundStructure.general_notes = notes;
  }

  await foundUser.save();

  sendUpdatedResponse(res, foundStructure, 'Structure status updated successfully');
});

/**
 * Get system statistics
 * @route GET /api/admin/system-stats
 * @access Private (Admin, AD, TE, VE)
 */
const getSystemStats = catchAsync(async (req, res) => {
  const [users, allStructureUsers] = await Promise.all([
    User.find().select('role is_active isEmailVerified structures'),
    User.find({ 'structures.0': { $exists: true } }).select('structures')
  ]);

  // User statistics
  const userStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    verifiedUsers: users.filter(u => u.isEmailVerified).length,
    byRole: {}
  };

  users.forEach(user => {
    const role = user.role || 'unknown';
    userStats.byRole[role] = (userStats.byRole[role] || 0) + 1;
  });

  // Structure statistics
  let allStructures = [];
  allStructureUsers.forEach(user => {
    if (user.structures) {
      allStructures.push(...user.structures);
    }
  });

  const structureStats = {
    totalStructures: allStructures.length,
    byStatus: {},
    byType: {}
  };

  allStructures.forEach(structure => {
    const status = structure.status || 'unknown';
    const type = structure.structural_identity?.type_of_structure || 'unknown';
    
    structureStats.byStatus[status] = (structureStats.byStatus[status] || 0) + 1;
    structureStats.byType[type] = (structureStats.byType[type] || 0) + 1;
  });

  const systemStats = {
    users: userStats,
    structures: structureStats,
    timestamp: new Date()
  };

  sendSuccessResponse(res, 'System statistics retrieved successfully', systemStats);
});

/**
 * Bulk update structures
 * @route PUT /api/admin/structures/bulk-update
 * @access Private (Admin, AD, TE, VE)
 */
const bulkUpdateStructures = catchAsync(async (req, res) => {
  const { structureIds, updateData } = req.body;

  if (!Array.isArray(structureIds) || structureIds.length === 0) {
    return sendErrorResponse(res, 'Structure IDs are required', 400);
  }

  const allowedFields = ['status', 'general_notes'];
  const filteredUpdateData = {};
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredUpdateData[field] = updateData[field];
    }
  }

  let updatedCount = 0;

  // Update structures across all users
  for (const structureId of structureIds) {
    const users = await User.find({ 'structures._id': structureId });
    
    for (const user of users) {
      const structure = user.structures.id(structureId);
      if (structure) {
        Object.keys(filteredUpdateData).forEach(key => {
          structure[key] = filteredUpdateData[key];
        });
        structure.creation_info.last_updated_date = new Date();
        await user.save();
        updatedCount++;
      }
    }
  }

  sendSuccessResponse(res, `${updatedCount} structures updated successfully`, {
    updatedCount,
    requestedCount: structureIds.length
  });
});

/**
 * Get structure ratings summary
 * @route GET /api/admin/structures/ratings-summary
 * @access Private (Admin, AD, TE, VE)
 */
const getStructureRatingsSummary = catchAsync(async (req, res) => {
  const allUsers = await User.find({ 
    'structures.0': { $exists: true } 
  }).select('structures username');

  const ratingsSummary = [];

  allUsers.forEach(user => {
    if (user.structures) {
      user.structures.forEach(structure => {
        let totalFlats = 0;
        let ratedFlats = 0;
        let allRatings = [];

        if (structure.geometric_details?.floors) {
          structure.geometric_details.floors.forEach(floor => {
            if (floor.flats) {
              totalFlats += floor.flats.length;
              
              floor.flats.forEach(flat => {
                if (flat.flat_overall_rating?.combined_score) {
                  ratedFlats++;
                  allRatings.push(flat.flat_overall_rating.combined_score);
                }
              });
            }
          });
        }

        const avgRating = allRatings.length > 0 
          ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length 
          : null;

        ratingsSummary.push({
          structure_id: structure._id,
          uid: structure.structural_identity?.uid,
          structure_number: structure.structural_identity?.structural_identity_number,
          client_name: structure.administration?.client_name,
          owner_username: user.username,
          total_flats: totalFlats,
          rated_flats: ratedFlats,
          completion_percentage: totalFlats > 0 ? Math.round((ratedFlats / totalFlats) * 100) : 0,
          average_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
          health_status: avgRating 
            ? avgRating >= 4 ? 'Good' : avgRating >= 3 ? 'Fair' : avgRating >= 2 ? 'Poor' : 'Critical'
            : 'Unrated'
        });
      });
    }
  });

  // Sort by average rating (worst first)
  ratingsSummary.sort((a, b) => (a.average_rating || 0) - (b.average_rating || 0));

  sendSuccessResponse(res, 'Structure ratings summary retrieved successfully', ratingsSummary);
});

/**
 * Get audit logs (placeholder for future implementation)
 * @route GET /api/admin/audit-logs
 * @access Private (Admin, AD, TE, VE)
 */
const getAuditLogs = catchAsync(async (req, res) => {
  // Placeholder - implement audit logging in future
  const auditLogs = [
    {
      timestamp: new Date(),
      userId: req.user.userId,
      action: 'VIEW_AUDIT_LOGS',
      resource: 'admin',
      details: 'Admin viewed audit logs'
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