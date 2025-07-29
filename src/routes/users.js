const express = require('express');
const userController = require('../controllers/userController');
const { 
  authenticateToken, 
  authorizeRole, 
  requireEmailVerification,
  validateRequest 
} = require('../middlewares/auth'); // Fixed: import authorizeRole instead of authorize

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(validateRequest);

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', requireEmailVerification, userController.updateProfile);

/**
 * @route   PUT /api/users/change-password
 * @desc    Change current user password
 * @access  Private
 */
router.put('/change-password', requireEmailVerification, userController.changePassword);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
router.get('/stats', authorizeRole(['admin']), userController.getUserStats); // Fixed: use authorizeRole

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin only)
 */
router.get('/', authorizeRole(['admin']), userController.getAllUsers); // Fixed: use authorizeRole

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authorizeRole(['admin']), userController.getUserById); // Fixed: use authorizeRole

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user active status
 * @access  Private (Admin only)
 */
router.put('/:id/status', authorizeRole(['admin']), userController.updateUserStatus); // Fixed: use authorizeRole

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put('/:id/role', authorizeRole(['admin']), userController.updateUserRole); // Fixed: use authorizeRole

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('User routes error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;