const jwt = require('jsonwebtoken');
const { User } = require('../models/schemas');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated',
        code: 'USER_INACTIVE'
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before accessing this resource',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      roles: user.roles || [user.role],
      isEmailVerified: user.isEmailVerified,
      is_active: user.is_active
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Authorize by roles
 */
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRoles = req.user.roles || [req.user.role];
    const hasAllowedRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Require email verification
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

/**
 * Check if user has privileged access
 */
const hasPrivilegedAccess = (user) => {
  if (!user) return false;
  const userRoles = user.roles || [user.role];
  const privilegedRoles = ['AD', 'VE', 'TE', 'admin'];
  return privilegedRoles.some(role => userRoles.includes(role));
};

/**
 * Middleware to check admin access
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!hasPrivilegedAccess(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required (AD, TE, VE, or admin role)',
      code: 'ADMIN_ONLY'
    });
  }

  next();
};

/**
 * Validate request format
 */
const validateRequest = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json or multipart/form-data'
      });
    }
  }

  next();
};

// Aliases
const protect = authenticateToken;
const authorize = authorizeRole;

module.exports = {
  authenticateToken,
  protect,
  authorize,
  authorizeRole,
  isAdmin,
  requireEmailVerification,
  validateRequest,
  hasPrivilegedAccess
};