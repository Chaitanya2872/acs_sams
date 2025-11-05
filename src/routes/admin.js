const express = require('express');
const { User } = require('../models/schemas');
const { protect, isAdmin } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protect);
router.use(isAdmin);

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -structures')
      .limit(100)
      .lean();

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      total: users.length
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
router.get('/users/:id', async (req, res) => {
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
      data: {
        ...user,
        structure_count: user.structures?.length || 0
      }
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
router.get('/structures', async (req, res) => {
  try {
    console.log('📊 Admin fetching all structures');
    
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
            structure_name: structure.structural_identity?.structure_name,
            client_name: structure.administration?.client_name,
            status: structure.status,
            type: structure.structural_identity?.type_of_structure,
            location: {
              city: structure.structural_identity?.city_name,
              state: structure.structural_identity?.state_code
            },
            owner: {
              user_id: user._id,
              username: user.username,
              email: user.email
            },
            created_date: structure.creation_info?.created_date,
            last_updated: structure.creation_info?.last_updated_date
          });
        });
      }
    });

    console.log(`📊 Total structures: ${allStructures.length}`);

    res.json({
      success: true,
      message: 'Structures retrieved successfully',
      data: allStructures,
      total: allStructures.length
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
 * GET /api/admin/structures/:id
 * Get single structure by ID
 */
router.get('/structures/:id', async (req, res) => {
  try {
    const users = await User.find({ 'structures._id': req.params.id });
    
    let foundStructure = null;
    let foundUser = null;
    
    for (const user of users) {
      const structure = user.structures.id(req.params.id);
      if (structure) {
        foundStructure = structure;
        foundUser = user;
        break;
      }
    }

    if (!foundStructure) {
      return res.status(404).json({
        success: false,
        error: 'Structure not found'
      });
    }

    res.json({
      success: true,
      message: 'Structure retrieved successfully',
      data: {
        ...foundStructure.toObject(),
        owner: {
          user_id: foundUser._id,
          username: foundUser.username,
          email: foundUser.email
        }
      }
    });
  } catch (error) {
    console.error('Get structure error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve structure'
    });
  }
});

/**
 * GET /api/admin/system-stats
 * Get system statistics
 */
router.get('/system-stats', async (req, res) => {
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