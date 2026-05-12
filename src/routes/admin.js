const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models/schemas');
const { protect, isAdmin, authorizeModuleAction } = require('../middlewares/auth');
const structureController = require('../controllers/structureController');
const { handleValidationErrors } = require('../middlewares/validation');
const { parameterValidations } = require('../utils/screenValidators');
const { normalizePermissions } = require('../utils/accessControl');

const router = express.Router();
const USER_ROLES = ['AD', 'TE', 'VE', 'FE'];

const generateTemporaryPassword = () =>
  crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'TempPass123';

const sanitizeUser = (user) => {
  if (!user) return null;
  const plainUser = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete plainUser.password;

  return {
    ...plainUser,
    permissions: normalizePermissions(plainUser.permissions, plainUser.role),
    structure_count: Array.isArray(plainUser.structures) ? plainUser.structures.length : 0
  };
};

const getHealthStatusFromAverage = (average) => {
  if (average === null || average === undefined) return null;
  if (average >= 4) return 'Good';
  if (average >= 3) return 'Fair';
  if (average >= 2) return 'Poor';
  return 'Critical';
};

const buildRatingsSummary = (structure) => {
  const floors = Array.isArray(structure.geometric_details?.floors)
    ? structure.geometric_details.floors
    : [];
  const totalFlats = floors.reduce((sum, floor) => sum + (floor.flats?.length || 0), 0);
  let ratedFlats = 0;
  const structuralRatings = [];
  const nonStructuralRatings = [];

  floors.forEach((floor) => {
    (floor.flats || []).forEach((flat) => {
      if (flat.flat_overall_rating?.combined_score) {
        ratedFlats += 1;
      }
      if (flat.structural_rating?.overall_average) {
        structuralRatings.push(flat.structural_rating.overall_average);
      }
      if (flat.non_structural_rating?.overall_average) {
        nonStructuralRatings.push(flat.non_structural_rating.overall_average);
      }
    });
  });

  const avgStructuralRating = structuralRatings.length
    ? Number((structuralRatings.reduce((sum, value) => sum + value, 0) / structuralRatings.length).toFixed(2))
    : null;
  const avgNonStructuralRating = nonStructuralRatings.length
    ? Number((nonStructuralRatings.reduce((sum, value) => sum + value, 0) / nonStructuralRatings.length).toFixed(2))
    : null;

  return {
    total_flats: totalFlats,
    rated_flats: ratedFlats,
    completion_percentage: totalFlats > 0 ? Math.round((ratedFlats / totalFlats) * 100) : 0,
    avg_structural_rating: avgStructuralRating,
    avg_non_structural_rating: avgNonStructuralRating,
    overall_health: getHealthStatusFromAverage(avgStructuralRating)
  };
};

const buildAdminRatingsPayload = (structure) => {
  const floors = Array.isArray(structure.geometric_details?.floors)
    ? structure.geometric_details.floors
    : [];

  return {
    structure_id: structure._id,
    uid: structure.structural_identity?.uid,
    structural_identity_number: structure.structural_identity?.structural_identity_number,
    ratings_summary: buildRatingsSummary(structure),
    total_floors: floors.length,
    floors: floors.map((floor) => ({
      floor_id: floor.floor_id,
      mongodb_id: floor._id,
      floor_number: floor.floor_number,
      floor_label_name: floor.floor_label_name,
      total_flats: Array.isArray(floor.flats) ? floor.flats.length : 0,
      rated_flats: Array.isArray(floor.flats)
        ? floor.flats.filter((flat) => typeof flat.flat_overall_rating?.combined_score === 'number').length
        : 0,
      structural_rating: floor.structural_rating || {},
      non_structural_rating: floor.non_structural_rating || {},
      floor_overall_rating: floor.floor_overall_rating || null
    }))
  };
};

const buildAdminFlatsPayload = (structure) => {
  const floors = Array.isArray(structure.geometric_details?.floors)
    ? structure.geometric_details.floors
    : [];

  const flats = floors.flatMap((floor) =>
    (Array.isArray(floor.flats) ? floor.flats : []).map((flat) => ({
      floor_id: floor.floor_id,
      floor_number: floor.floor_number,
      floor_label_name: floor.floor_label_name,
      flat_id: flat.flat_id,
      mongodb_id: flat._id,
      flat_number: flat.flat_number,
      flat_type: flat.flat_type,
      area_sq_mts: flat.area_sq_mts,
      direction_facing: flat.direction_facing,
      occupancy_status: flat.occupancy_status,
      flat_notes: flat.flat_notes,
      structural_rating: flat.structural_rating || {},
      non_structural_rating: flat.non_structural_rating || {},
      flat_overall_rating: flat.flat_overall_rating || null
    }))
  );

  return {
    structure_id: structure._id,
    uid: structure.structural_identity?.uid,
    structural_identity_number: structure.structural_identity?.structural_identity_number,
    total_flats: flats.length,
    flats
  };
};

// All routes require authentication and admin privileges
router.use(protect);
router.use(isAdmin);

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', authorizeModuleAction('users', 'read'), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .limit(100)
      .lean();

    const sanitizedUsers = users.map((user) => sanitizeUser(user));

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: sanitizedUsers,
      total: sanitizedUsers.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users'
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user by ID
 */
router.get('/users/:id', authorizeModuleAction('users', 'read'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user'
    });
  }
});

/**
 * GET /api/admin/structures
 * Get all structures from all users
 */
router.get('/structures', authorizeModuleAction('structures', 'read'), async (req, res) => {
  try {
    console.log('📊 Admin fetching all structures');
    const {
      page = '1',
      limit = '12',
      status,
      type_of_structure,
      search,
      date_from,
      date_to
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    
    const allUsers = await User.find({ 
      'structures.0': { $exists: true } 
    }).select('structures username email').limit(100);

    console.log(`📊 Found ${allUsers.length} users with structures`);

    const allStructures = [];
    
    allUsers.forEach(user => {
      if (user.structures && user.structures.length > 0) {
        user.structures.forEach(structure => {
          allStructures.push({
            structure_id: structure._id,
            uid: structure.structural_identity?.uid,
            structure_number: structure.structural_identity?.structural_identity_number,
            structural_identity_number: structure.structural_identity?.structural_identity_number,
            structure_name: structure.structural_identity?.structure_name,
            client_name: structure.administrative?.client_name || structure.administration?.client_name,
            status: structure.status,
            type: structure.structural_identity?.type_of_structure,
            type_of_structure: structure.structural_identity?.type_of_structure,
            location: {
              city: structure.structural_identity?.city_name,
              state: structure.structural_identity?.state_code,
              city_name: structure.structural_identity?.city_name,
              state_code: structure.structural_identity?.state_code,
              address: structure.location?.address
            },
            owner: {
              user_id: user._id,
              username: user.username,
              email: user.email
            },
            created_date: structure.creation_info?.created_date,
            last_updated: structure.creation_info?.last_updated_date,
            last_updated_date: structure.creation_info?.last_updated_date,
            ratings_summary: buildRatingsSummary(structure)
          });
        });
      }
    });

    let filteredStructures = allStructures;

    if (status && status !== 'all') {
      filteredStructures = filteredStructures.filter((structure) => structure.status === status);
    }

    if (type_of_structure && type_of_structure !== 'all') {
      filteredStructures = filteredStructures.filter(
        (structure) => structure.type_of_structure === type_of_structure
      );
    }

    if (search) {
      const normalizedSearch = String(search).trim().toLowerCase();
      if (normalizedSearch) {
        filteredStructures = filteredStructures.filter((structure) =>
          [
            structure.structure_number,
            structure.structural_identity_number,
            structure.uid,
            structure.structure_name,
            structure.client_name,
            structure.type,
            structure.type_of_structure,
            structure.owner?.username,
            structure.owner?.email,
            structure.location?.city,
            structure.location?.state,
            structure.location?.address
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        );
      }
    }

    if (date_from || date_to) {
      const fromDate = date_from ? new Date(date_from) : null;
      const toDate = date_to ? new Date(date_to) : null;

      if (toDate && !Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
      }

      filteredStructures = filteredStructures.filter((structure) => {
        const createdDate = structure.created_date ? new Date(structure.created_date) : null;
        if (!createdDate || Number.isNaN(createdDate.getTime())) return false;
        if (fromDate && !Number.isNaN(fromDate.getTime()) && createdDate < fromDate) return false;
        if (toDate && !Number.isNaN(toDate.getTime()) && createdDate > toDate) return false;
        return true;
      });
    }

    filteredStructures.sort((a, b) => {
      const aDate = a.created_date ? new Date(a.created_date).getTime() : 0;
      const bDate = b.created_date ? new Date(b.created_date).getTime() : 0;
      return bDate - aDate;
    });

    const total = filteredStructures.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNumber));
    const startIndex = (pageNumber - 1) * limitNumber;
    const paginatedStructures = filteredStructures.slice(startIndex, startIndex + limitNumber);

    console.log(`📊 Total structures: ${allStructures.length}`);
    console.log(`📊 Filtered structures: ${filteredStructures.length}`);

    res.json({
      success: true,
      message: 'Structures retrieved successfully',
      data: paginatedStructures,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages
    });
  } catch (error) {
    console.error('Get structures error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve structures'
    });
  }
});

/**
 * POST /api/admin/users
 * Create a user with role and module permissions
 */
router.post('/users', authorizeModuleAction('users', 'write'), async (req, res) => {
  try {
    const {
      username,
      email,
      role = 'FE',
      roles,
      profile,
      is_active = true,
      isEmailVerified = true,
      permissions
    } = req.body || {};

    if (!username || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username and email are required'
      });
    }

    const normalizedRole = String(role).toUpperCase();
    if (!USER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed roles: ${USER_ROLES.join(', ')}`
      });
    }

    const normalizedRoles = Array.isArray(roles) && roles.length > 0
      ? Array.from(new Set(roles.map((item) => String(item).toUpperCase()).filter((item) => USER_ROLES.includes(item))))
      : [normalizedRole];

    const existingUser = await User.findOne({
      $or: [{ username }, { email: String(email).toLowerCase() }]
    }).lean();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.username === username ? 'Username already taken' : 'User already exists with this email'
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const user = await User.create({
      username,
      email: String(email).toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      roles: normalizedRoles,
      profile: profile || {},
      is_active,
      isEmailVerified,
      structures: [],
      permissions: normalizePermissions(permissions, normalizedRole),
      stats: {
        total_structures_created: 0,
        total_structures_submitted: 0,
        total_structures_approved: 0,
        last_activity_date: new Date(),
        total_login_count: 0
      }
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        ...sanitizeUser(user),
        temporary_password: temporaryPassword
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user details, role and permissions
 */
router.put('/users/:id', authorizeModuleAction('users', 'write'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      role,
      roles,
      profile,
      is_active,
      isEmailVerified,
      permissions
    } = req.body || {};

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const normalizedRole = role ? String(role).toUpperCase() : user.role;
    if (!USER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed roles: ${USER_ROLES.join(', ')}`
      });
    }

    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username, _id: { $ne: id } }).lean();
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken'
        });
      }
      user.username = username;
    }

    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } }).lean();
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'User already exists with this email'
        });
      }
      user.email = email.toLowerCase();
    }

    user.role = normalizedRole;
    user.roles = Array.isArray(roles) && roles.length > 0
      ? Array.from(new Set(roles.map((item) => String(item).toUpperCase()).filter((item) => USER_ROLES.includes(item))))
      : [normalizedRole];

    if (profile && typeof profile === 'object') {
      user.profile = {
        ...(user.profile?.toObject ? user.profile.toObject() : user.profile || {}),
        ...profile
      };
    }

    if (typeof is_active === 'boolean') user.is_active = is_active;
    if (typeof isEmailVerified === 'boolean') user.isEmailVerified = isEmailVerified;
    user.permissions = normalizePermissions(permissions || user.permissions, normalizedRole);

    await user.save();

    return res.json({
      success: true,
      message: 'User updated successfully',
      data: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Soft delete by deactivating user access
 */
router.delete('/users/:id', authorizeModuleAction('users', 'write'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (String(user._id) === String(req.user.userId)) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account'
      });
    }

    user.is_active = false;
    await user.save();

    return res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset and return a temporary password
 */
router.post('/users/:id/reset-password', authorizeModuleAction('users', 'write'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    user.password = await bcrypt.hash(temporaryPassword, 12);
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        user_id: user._id,
        username: user.username,
        temporary_password: temporaryPassword
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

/**
 * GET /api/admin/structures/:id/location
 * Get location screen for any structure as admin
 */
router.get(
  '/structures/:id/location',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  handleValidationErrors,
  structureController.getLocationScreen
);

/**
 * GET /api/admin/structures/:id/administrative
 * Get administrative screen for any structure as admin
 */
router.get(
  '/structures/:id/administrative',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  handleValidationErrors,
  structureController.getAdministrativeScreen
);

/**
 * GET /api/admin/structures/:id/floors
 * Get floors list for any structure as admin
 */
router.get(
  '/structures/:id/floors',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  handleValidationErrors,
  structureController.getFloors
);

/**
 * GET /api/admin/structures/:id/flats
 * Get all flats across all floors for any structure as admin
 */
router.get(
  '/structures/:id/flats',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { structure } = await structureController.findStructureAcrossUsers(id);

      return res.json({
        success: true,
        message: 'Admin structure flats retrieved successfully',
        data: buildAdminFlatsPayload(structure)
      });
    } catch (error) {
      console.error('Get admin structure flats error:', error);
      const status = error.message === 'Structure not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message === 'Structure not found'
          ? 'Structure not found'
          : 'Failed to retrieve admin structure flats'
      });
    }
  }
);

/**
 * GET /api/admin/structures/:id/floors/:floorId
 * Get single floor for any structure as admin
 */
router.get(
  '/structures/:id/floors/:floorId',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  parameterValidations.floorId,
  handleValidationErrors,
  structureController.getFloorById
);

/**
 * GET /api/admin/structures/:id/floors/:floorId/flats
 * Get flats in a floor for any structure as admin
 */
router.get(
  '/structures/:id/floors/:floorId/flats',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  parameterValidations.floorId,
  handleValidationErrors,
  structureController.getFlatsInFloor
);

/**
 * GET /api/admin/structures/:id/floors/:floorId/ratings
 * Get floor-wise ratings for any structure as admin
 */
router.get(
  '/structures/:id/floors/:floorId/ratings',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  parameterValidations.floorId,
  handleValidationErrors,
  structureController.getFloorRatings
);

/**
 * GET /api/admin/structures/:id/floors/:floorId/structural/:type
 * Get floor structural component ratings for any structure as admin
 */
router.get(
  '/structures/:id/floors/:floorId/structural/:type',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFloorStructuralComponents
);

/**
 * GET /api/admin/structures/:id/floors/:floorId/non-structural/:type
 * Get floor non-structural component ratings for any structure as admin
 */
router.get(
  '/structures/:id/floors/:floorId/non-structural/:type',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  parameterValidations.floorId,
  parameterValidations.componentType,
  handleValidationErrors,
  structureController.getFloorNonStructuralComponents
);

/**
 * GET /api/admin/structures/:id/ratings
 * Get structure-level ratings summary and floor-wise structural/non-structural ratings
 */
router.get(
  '/structures/:id/ratings',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { structure } = await structureController.findStructureAcrossUsers(id);

      return res.json({
        success: true,
        message: 'Admin structure ratings retrieved successfully',
        data: buildAdminRatingsPayload(structure)
      });
    } catch (error) {
      console.error('Get admin structure ratings error:', error);
      const status = error.message === 'Structure not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: error.message === 'Structure not found'
          ? 'Structure not found'
          : 'Failed to retrieve admin structure ratings'
      });
    }
  }
);

/**
 * GET /api/admin/structures/:id
 * Get single structure by ID using the same detail payload as user-level route
 */
router.get(
  '/structures/:id',
  authorizeModuleAction('structures', 'read'),
  parameterValidations.structureId,
  handleValidationErrors,
  structureController.getStructureDetails
);

/**
 * GET /api/admin/system-stats
 * Get system statistics
 */
router.get('/system-stats', authorizeModuleAction('admin', 'read'), async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalStructures] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
      User.aggregate([
        { $project: { structureCount: { $size: { $ifNull: ['$structures', []] } } } },
        { $group: { _id: null, total: { $sum: '$structureCount' } } }
      ])
    ]);

    res.json({
      success: true,
      message: 'System statistics retrieved',
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        structures: {
          total: totalStructures[0]?.total || 0
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system statistics'
    });
  }
});

module.exports = router;
