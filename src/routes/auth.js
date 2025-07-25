const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../utils/validators');
const { handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

// Register
router.post('/register', 
  registerValidation, 
  handleValidationErrors, 
  authController.register
);

// Login
router.post('/login', 
  loginValidation, 
  handleValidationErrors, 
  authController.login
);

// Refresh Token
router.post('/refresh-token', authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

// Verify Email
router.get('/verify-email/:token', authController.verifyEmail);

// Forgot Password
router.post('/forgot-password', authController.forgotPassword);

// Reset Password
router.post('/reset-password/:token', authController.resetPassword);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  authController.googleCallback
);

module.exports = router;