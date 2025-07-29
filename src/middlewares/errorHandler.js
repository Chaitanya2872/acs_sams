/**
 * Error handling middleware and utilities
 */

const { sendInternalServerErrorResponse } = require('../utils/responseHandler');

/**
 * Catch async errors wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle MongoDB cast errors
 * @param {Error} err - MongoDB error
 * @returns {AppError} Formatted error
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB duplicate field errors
 * @param {Error} err - MongoDB error
 * @returns {AppError} Formatted error
 */
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB validation errors
 * @param {Error} err - MongoDB error
 * @returns {AppError} Formatted error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT invalid token errors
 * @returns {AppError} Formatted error
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

/**
 * Handle JWT expired token errors
 * @returns {AppError} Formatted error
 */
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

/**
 * Send error response for development
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      success: false,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // RENDERED WEBSITE
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

/**
 * Send error response for production
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }

  // RENDERED WEBSITE
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  
  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

/**
 * Handle unhandled routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handleUnhandledRoutes = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

/**
 * Handle validation errors
 * @param {Array} errors - Array of validation errors
 * @returns {AppError} Formatted error
 */
const handleValidationErrors = (errors) => {
  const message = errors.map(error => error.message || error.msg).join('. ');
  return new AppError(`Validation Error: ${message}`, 400);
};

/**
 * Create validation error
 * @param {string} field - Field name
 * @param {string} message - Error message
 * @param {*} value - Field value
 * @returns {Object} Validation error object
 */
const createValidationError = (field, message, value = null) => {
  return {
    field,
    message,
    value
  };
};

/**
 * Log error to console with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
const logError = (error, context = {}) => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    message: error.message,
    stack: error.stack,
    ...context
  };

  console.error('🔥 Error Log:', JSON.stringify(errorInfo, null, 2));
};

/**
 * Create database connection error
 * @param {Error} error - Original error
 * @returns {AppError} Formatted error
 */
const createDatabaseError = (error) => {
  logError(error, { type: 'DATABASE_ERROR' });
  return new AppError('Database connection failed', 500);
};

/**
 * Create authentication error
 * @param {string} message - Error message
 * @returns {AppError} Formatted error
 */
const createAuthError = (message = 'Authentication failed') => {
  return new AppError(message, 401);
};

/**
 * Create authorization error
 * @param {string} message - Error message
 * @returns {AppError} Formatted error
 */
const createAuthorizationError = (message = 'Insufficient permissions') => {
  return new AppError(message, 403);
};

/**
 * Create not found error
 * @param {string} resource - Resource name
 * @returns {AppError} Formatted error
 */
const createNotFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404);
};

/**
 * Create conflict error
 * @param {string} message - Error message
 * @returns {AppError} Formatted error
 */
const createConflictError = (message = 'Resource already exists') => {
  return new AppError(message, 409);
};

/**
 * Create rate limit error
 * @param {string} message - Error message
 * @returns {AppError} Formatted error
 */
const createRateLimitError = (message = 'Too many requests') => {
  return new AppError(message, 429);
};

/**
 * Handle async route errors
 * @param {Function} asyncFn - Async function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const asyncErrorHandler = (asyncFn) => {
  return (req, res, next) => {
    asyncFn(req, res, next).catch((error) => {
      console.error('Async Error:', error);
      next(error);
    });
  };
};

/**
 * Middleware to handle 404 errors for API routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handle404 = (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint ${req.method} ${req.originalUrl} not found`
    });
  }
  next();
};

module.exports = {
  catchAsync,
  AppError,
  globalErrorHandler,
  handleUnhandledRoutes,
  handleValidationErrors,
  createValidationError,
  logError,
  createDatabaseError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createRateLimitError,
  asyncErrorHandler,
  handle404
};