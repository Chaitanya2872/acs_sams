const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const { authenticateToken } = require('../middlewares/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth operations
  message: {
    success: false,
    error: 'Too many auth attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 2, // limit each IP to 2 OTP requests per minute
  message: {
    success: false,
    error: 'Too many OTP requests, please wait a minute before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware with better error handling
const validateRegistration = (req, res, next) => {
  try {
    // Check if req.body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body is missing or invalid. Make sure to send JSON data with Content-Type: application/json'
      });
    }

    const { username, email, password, confirmPassword } = req.body;
    
    const errors = [];
    
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      errors.push('Username is required and must be at least 3 characters long');
    }
    
    if (!email || typeof email !== 'string' || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      errors.push('Please provide a valid email address');
    }
    
    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
    }
    
    if (!confirmPassword || typeof confirmPassword !== 'string') {
      errors.push('Confirm password is required');
    }
    
    if (password && confirmPassword && password !== confirmPassword) {
      errors.push('Password and confirm password must match');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  } catch (error) {
    console.error('Validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during validation'
    });
  }
};

const validateEmail = (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body is missing. Send JSON data with Content-Type: application/json'
      });
    }

    const { email } = req.body;
    
    if (!email || typeof email !== 'string' || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }
    
    next();
  } catch (error) {
    console.error('Email validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during email validation'
    });
  }
};

const validateOTP = (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body is missing. Send JSON data with Content-Type: application/json'
      });
    }

    const { email, otp } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'OTP is required'
      });
    }
    
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be a 6-digit number'
      });
    }
    
    next();
  } catch (error) {
    console.error('OTP validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during OTP validation'
    });
  }
};

// Debug middleware to log request details
const debugMiddleware = (req, res, next) => {
  console.log('\n🔍 Auth Route Debug Info:');
  console.log('├─ Method:', req.method);
  console.log('├─ URL:', req.url);
  console.log('├─ Content-Type:', req.headers['content-type']);
  console.log('├─ Body exists:', !!req.body);
  console.log('├─ Body type:', typeof req.body);
  console.log('└─ Body keys:', req.body ? Object.keys(req.body) : 'No body');
  next();
};

// Routes

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', debugMiddleware, authLimiter, validateRegistration, async (req, res) => {
  try {
    console.log('📝 Processing registration for:', req.body.email);
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post('/verify-email', debugMiddleware, authLimiter, validateOTP, async (req, res) => {
  try {
    console.log('📧 Processing email verification for:', req.body.email);
    const result = await authService.verifyEmailOTP(req.body.email, req.body.otp);
    
    // Send welcome email after successful verification
    if (result.success && result.user) {
      try {
        await emailService.sendWelcomeEmail(
          result.user.email, 
          result.user.username, 
          result.user.role
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the verification if welcome email fails
      }
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', debugMiddleware, authLimiter, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body is missing. Send JSON data with Content-Type: application/json'
      });
    }

    const { identifier, password } = req.body;
    
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email/Username is required'
      });
    }
    
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }
    
    console.log('🔐 Processing login for:', identifier);
    const result = await authService.login({ identifier, password });
    res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP for email verification or password reset
 * @access  Public
 */
router.post('/resend-otp', debugMiddleware, otpLimiter, validateEmail, async (req, res) => {
  try {
    const { email, type } = req.body;
    
    if (!type || !['email_verification', 'password_reset'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP type. Must be email_verification or password_reset'
      });
    }
    
    console.log(`📧 Resending ${type} OTP for:`, email);
    const result = await authService.resendOTP(email, type);
    res.status(200).json(result);
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset OTP
 * @access  Public
 */
router.post('/forgot-password', debugMiddleware, otpLimiter, validateEmail, async (req, res) => {
  try {
    console.log('🔑 Processing forgot password for:', req.body.email);
    const result = await authService.sendPasswordResetOTP(req.body.email);
    res.status(200).json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post('/reset-password', debugMiddleware, authLimiter, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body is missing. Send JSON data with Content-Type: application/json'
      });
    }

    const { email, otp, newPassword, confirmPassword } = req.body;
    
    const errors = [];
    if (!email) errors.push('Email is required');
    if (!otp) errors.push('OTP is required');
    if (!newPassword) errors.push('New password is required');
    if (!confirmPassword) errors.push('Confirm password is required');
    
    if (otp && !/^\d{6}$/.test(otp)) {
      errors.push('OTP must be a 6-digit number');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    console.log('🔑 Processing password reset for:', email);
    const result = await authService.resetPasswordWithOTP({
      email,
      otp,
      newPassword,
      confirmPassword
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', debugMiddleware, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body is missing. Send JSON data with Content-Type: application/json'
      });
    }

    const { refreshToken } = req.body;
    
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required',
        code: 'NO_REFRESH_TOKEN'
      });
    }
    
    console.log('🔄 Processing token refresh...');
    const result = await authService.refreshTokens(refreshToken);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: error.message,
      code: 'REFRESH_FAILED'
    });
  }
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password for logged-in user
 * @access  Private
 */
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body is missing. Send JSON data with Content-Type: application/json'
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    const errors = [];
    if (!currentPassword) errors.push('Current password is required');
    if (!newPassword) errors.push('New password is required');
    if (!confirmPassword) errors.push('Confirm password is required');
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    console.log('🔑 Processing password change for user:', req.user.userId);
    const result = await authService.changePassword(req.user.userId, {
      currentPassword,
      newPassword,
      confirmPassword
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify JWT token and get user info
 * @access  Private
 */
router.post('/verify-token', authenticateToken, async (req, res) => {
  try {
    // If we reach here, token is valid (verified by middleware)
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: req.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const result = await authService.logout(req.headers.authorization?.split(' ')[1]);
    res.status(200).json(result);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { User } = require('../models/schemas');
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

/**
 * @route   GET /api/auth/test-email
 * @desc    Test email configuration (admin only)
 * @access  Private (Admin)
 */
router.get('/test-email', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const result = await emailService.testEmailConfig();
    res.status(200).json(result);
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test email configuration'
    });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('Auth router error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;