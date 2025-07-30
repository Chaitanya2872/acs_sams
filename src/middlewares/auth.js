const jwt = require('jsonwebtoken');
const { User } = require('../models/schemas');

/**
 * Middleware to authenticate JWT token
 * Adds user information to req.user if token is valid
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',    
        code : 'NO_TOKEN'
      });
    }

    // Verify JWT token
const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated',
        code: 'USER_INACTIVE'
      });
    }

    // Add user info to request object
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    };

    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    // After line 37 (TokenExpiredError), add:
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
 * Middleware to check if user has required role
 * Usage: authorizeRole(['admin', 'engineer'])
 */
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

/**
 * Middleware to check if user's email is verified
 */
const requireEmailVerification = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Email verification required'
      });
    }

    next();
  } catch (error) {
    console.error('Email verification check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification check failed'
    });
  }
};

/**
 * Middleware to check if user can access a specific structure
 * Users can only access structures they created unless they're admin
 */
const authorizeStructureAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Admin can access all structures
    if (req.user.role === 'admin') {
      return next();
    }

    const structureId = req.params.id || req.body.structure_id;
    
    if (!structureId) {
      return res.status(400).json({
        success: false,
        error: 'Structure ID required'
      });
    }

    const { Structure } = require('../models/schemas');
    const structure = await Structure.findById(structureId);
    
    if (!structure) {
      return res.status(404).json({
        success: false,
        error: 'Structure not found'
      });
    }

    // Check if user created this structure or is assigned to it
    if (structure.creation_info.created_by.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this structure'
      });
    }

    next();
  } catch (error) {
    console.error('Structure access authorization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if token is present and valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // No token provided, continue without user info
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      };
    }

    next();
  } catch (error) {
    // Invalid token, but continue without user info
    console.warn('Optional auth failed:', error.message);
    next();
  }
};

/**
 * Middleware to validate request body size and format
 */
const validateRequest = (req, res, next) => {
  try {
    // Check content type for POST/PUT requests
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
  } catch (error) {
    console.error('Request validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid request format'
    });
  }
};

/**
 * Middleware to log user actions for audit trail
 */
const auditLog = (action) => {
  return (req, res, next) => {
    try {
      const logData = {
        userId: req.user?.userId,
        username: req.user?.username,
        action: action,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      };

      // Log to console (in production, you'd want to log to a file or database)
      console.log('Audit Log:', JSON.stringify(logData));

      // You could also save to database here
      // const { AuditLog } = require('../models/schemas');
      // new AuditLog(logData).save().catch(console.error);

      next();
    } catch (error) {
      console.error('Audit logging error:', error);
      next(); // Don't fail the request if logging fails
    }
  };
};

/**
 * Middleware to check API rate limits per user
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    console.log('⚠️ Rate limiting disabled for development');
    next(); // Always allow requests
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
  requireEmailVerification,
  authorizeStructureAccess,
  optionalAuth,
  validateRequest,
  auditLog,
  userRateLimit
};