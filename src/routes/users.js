const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Change password
router.put('/change-password', userController.changePassword);

// Get all users (admin only)
router.get('/', authorize('admin'), userController.getAllUsers);

module.exports = router;