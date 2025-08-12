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
        code: 'NO_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
    
    console.log('🔑 Token decoded for user:', decoded.userId);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found for ID:', decoded.userId);
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('👤 User found:', {
      id: user._id,
      email: user.email,
      is_active: user.is_active,
      isEmailVerified: user.isEmailVerified
    });

    // FIXED: Check if user is active using correct field name
    if (!user.is_active) {  // ← FIXED: was user.isActive
      console.log('❌ User is inactive:', user.email);
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated',
        code: 'USER_INACTIVE'
      });
    }

    // FIXED: Check if email is verified using correct field name
    if (!user.isEmailVerified) {  // ← This should match your schema
      console.log('❌ User email not verified:', user.email);
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before accessing this resource',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Add user info to request object with FIXED field names
    req.user = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      roles: user.roles || [user.role], // Support multiple roles, fallback to single role
      isEmailVerified: user.isEmailVerified,  // ← Should match schema
      is_active: user.is_active               // ← Should match schema
    };

    console.log('✅ Authentication successful for:', user.email);
    next();

  } catch (error) {
    console.error('❌ Token authentication error:', error);
    
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

      // Check if user has any of the allowed roles (support multiple roles)
      const userRoles = req.user.roles || [req.user.role];
      const hasAllowedRole = allowedRoles.some(role => userRoles.includes(role));
      
      if (!hasAllowedRole) {
        console.log('❌ Role authorization failed. Required:', allowedRoles, 'User has:', userRoles);
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      console.log('✅ Role authorization passed for:', req.user.role);
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

    // FIXED: Use correct field name check
    if (!req.user.isEmailVerified) {  // ← Should match what we set in authenticateToken
      console.log('❌ Email verification required for:', req.user.email);
      return res.status(403).json({
        success: false,
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    console.log('✅ Email verification check passed for:', req.user.email);
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
      console.log('✅ Admin access granted for structure access');
      return next();
    }

    const structureId = req.params.id || req.body.structure_id;
    
    if (!structureId) {
      return res.status(400).json({
        success: false,
        error: 'Structure ID required'
      });
    }

    // Since structures are embedded in User documents, we need to check differently
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const structure = user.structures.id(structureId);
    if (!structure) {
      console.log('❌ Structure not found or access denied:', structureId);
      return res.status(404).json({
        success: false,
        error: 'Structure not found or access denied'
      });
    }

    console.log('✅ Structure access authorized for:', structureId);
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    // FIXED: Use correct field names
    if (user && user.is_active && user.isEmailVerified) {  // ← FIXED field names
      req.user = {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        roles: user.roles || [user.role], // Support multiple roles
        isEmailVerified: user.isEmailVerified,
        is_active: user.is_active
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
      console.log('📋 Audit Log:', JSON.stringify(logData));

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

// NEW: Test middleware to debug authentication issues
const debugAuth = (req, res, next) => {
  console.log('🔍 DEBUG AUTH MIDDLEWARE:');
  console.log('├─ Method:', req.method);
  console.log('├─ Path:', req.path);
  console.log('├─ Authorization Header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('├─ req.user:', req.user ? {
    userId: req.user.userId,
    email: req.user.email,
    role: req.user.role,
    isEmailVerified: req.user.isEmailVerified,
    is_active: req.user.is_active
  } : 'Not set');
  console.log('└─ Body:', JSON.stringify(req.body, null, 2));
  next();
};

module.exports = {
  authenticateToken,
  authorizeRole,
  requireEmailVerification,
  authorizeStructureAccess,
  optionalAuth,
  validateRequest,
  auditLog,
  userRateLimit,
  debugAuth  // ← NEW: Add this for debugging
};