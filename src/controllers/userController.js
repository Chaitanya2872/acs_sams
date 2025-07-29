const { User } = require('../models/schemas'); // Fixed import - destructured from schemas
const bcrypt = require('bcryptjs');
const { 
  sendSuccessResponse, 
  sendErrorResponse, 
  sendUpdatedResponse, 
  sendPaginatedResponse 
} = require('../utils/responseHandler');
const { MESSAGES, PAGINATION } = require('../utils/constants');

class UserController {
  /**
   * Get current user profile
   * @route GET /api/users/profile
   * @access Private
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId).select('-password'); // Fixed: use req.user.userId
      
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }
      
      sendSuccessResponse(res, 'Profile retrieved successfully', {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      console.error('❌ Get profile error:', error);
      sendErrorResponse(res, 'Failed to fetch profile', 500, error.message);
    }
  }
  
  /**
   * Update user profile
   * @route PUT /api/users/profile
   * @access Private
   */
  async updateProfile(req, res) {
    try {
      const { username, email } = req.body;
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }
      
      // Check if new username already exists (for other users)
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ 
          username, 
          _id: { $ne: req.user.userId } 
        });
        if (existingUser) {
          return sendErrorResponse(res, 'Username already taken', 409);
        }
        user.username = username;
      }
      
      // Check if new email already exists (for other users)
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ 
          email: email.toLowerCase(), 
          _id: { $ne: req.user.userId } 
        });
        if (existingUser) {
          return sendErrorResponse(res, 'Email already registered', 409);
        }
        user.email = email.toLowerCase();
        user.isEmailVerified = false; // Need to re-verify new email
      }
      
      await user.save();
      
      // Return user data without password
      const userData = {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        updatedAt: user.updatedAt
      };
      
      sendUpdatedResponse(res, userData, 'Profile updated successfully');
    } catch (error) {
      console.error('❌ Update profile error:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      sendErrorResponse(res, 'Failed to update profile', 500, error.message);
    }
  }
  
  /**
   * Change user password
   * @route PUT /api/users/change-password
   * @access Private
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return sendErrorResponse(res, 'All password fields are required', 400);
      }
      
      if (newPassword !== confirmPassword) {
        return sendErrorResponse(res, 'New passwords do not match', 400);
      }
      
      // Password strength validation
      if (newPassword.length < 8) {
        return sendErrorResponse(res, 'New password must be at least 8 characters long', 400);
      }
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return sendErrorResponse(res, 'Current password is incorrect', 400);
      }
      
      // Check if new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return sendErrorResponse(res, 'New password must be different from current password', 400);
      }
      
      // Hash and save new password
      const saltRounds = 12;
      user.password = await bcrypt.hash(newPassword, saltRounds);
      await user.save();
      
      sendSuccessResponse(res, 'Password changed successfully');
    } catch (error) {
      console.error('❌ Change password error:', error);
      sendErrorResponse(res, 'Failed to change password', 500, error.message);
    }
  }
  
  /**
   * Get all users (Admin only)
   * @route GET /api/users
   * @access Private (Admin only)
   */
  async getAllUsers(req, res) {
    try {
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
          .select('-password')
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(filter)
      ]);

      sendPaginatedResponse(res, users, pageNum, limitNum, total, 'Users retrieved successfully');
    } catch (error) {
      console.error('❌ Get all users error:', error);
      sendErrorResponse(res, 'Failed to fetch users', 500, error.message);
    }
  }

  /**
   * Get user by ID (Admin only)
   * @route GET /api/users/:id
   * @access Private (Admin only)
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id).select('-password');
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }
      
      sendSuccessResponse(res, 'User retrieved successfully', user);
    } catch (error) {
      console.error('❌ Get user by ID error:', error);
      sendErrorResponse(res, 'Failed to fetch user', 500, error.message);
    }
  }

  /**
   * Update user status (Admin only)
   * @route PUT /api/users/:id/status
   * @access Private (Admin only)
   */
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return sendErrorResponse(res, 'isActive must be a boolean value', 400);
      }
      
      const user = await User.findById(id);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }
      
      // Prevent deactivating yourself
      if (id === req.user.userId.toString()) {
        return sendErrorResponse(res, 'Cannot deactivate your own account', 400);
      }
      
      user.isActive = isActive;
      await user.save();
      
      const userData = await User.findById(id).select('-password');
      sendUpdatedResponse(res, userData, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('❌ Update user status error:', error);
      sendErrorResponse(res, 'Failed to update user status', 500, error.message);
    }
  }

  /**
   * Update user role (Admin only)
   * @route PUT /api/users/:id/role
   * @access Private (Admin only)
   */
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      const validRoles = ['admin', 'engineer', 'inspector', 'viewer'];
      if (!validRoles.includes(role)) {
        return sendErrorResponse(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
      }
      
      const user = await User.findById(id);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }
      
      // Prevent changing your own role from admin
      if (id === req.user.userId.toString() && req.user.role === 'admin' && role !== 'admin') {
        return sendErrorResponse(res, 'Cannot remove admin role from your own account', 400);
      }
      
      user.role = role;
      await user.save();
      
      const userData = await User.findById(id).select('-password');
      sendUpdatedResponse(res, userData, `User role updated to ${role} successfully`);
    } catch (error) {
      console.error('❌ Update user role error:', error);
      sendErrorResponse(res, 'Failed to update user role', 500, error.message);
    }
  }

  /**
   * Get user statistics
   * @route GET /api/users/stats
   * @access Private (Admin only)
   */
  async getUserStats(req, res) {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
            verifiedUsers: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
            adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
            engineerUsers: { $sum: { $cond: [{ $eq: ['$role', 'engineer'] }, 1, 0] } },
            inspectorUsers: { $sum: { $cond: [{ $eq: ['$role', 'inspector'] }, 1, 0] } },
            viewerUsers: { $sum: { $cond: [{ $eq: ['$role', 'viewer'] }, 1, 0] } }
          }
        }
      ]);

      const roleDistribution = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const result = {
        summary: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          verifiedUsers: 0,
          adminUsers: 0,
          engineerUsers: 0,
          inspectorUsers: 0,
          viewerUsers: 0
        },
        roleDistribution
      };
      
      sendSuccessResponse(res, 'User statistics retrieved successfully', result);
    } catch (error) {
      console.error('❌ Get user stats error:', error);
      sendErrorResponse(res, 'Failed to fetch user statistics', 500, error.message);
    }
  }
}

module.exports = new UserController();