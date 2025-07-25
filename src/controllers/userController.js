const User = require('../models/User');

class UserController {
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id).select('-password');
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        error: error.message
      });
    }
  }
  
  async updateProfile(req, res) {
    try {
      const { name, contactNumber, designation } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { name, contactNumber, designation },
        { new: true, runValidators: true }
      ).select('-password');
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
  
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const user = await User.findById(req.user._id).select('+password');
      
      if (!(await user.comparePassword(currentPassword))) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      user.password = newPassword;
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }
  
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = { isActive: true };
      if (req.query.role) filter.role = req.query.role;
      
      const users = await User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        data: users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }
}

module.exports = new UserController();