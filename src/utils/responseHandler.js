/**
 * Utility functions for consistent API responses
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Response data (optional)
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccessResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {*} error - Additional error details (optional)
 */
const sendErrorResponse = (res, message, statusCode = 400, error = null) => {
  // Backward compatibility for accidental call pattern:
  // sendErrorResponse(res, 500, 'Message', error)
  if (typeof message === 'number') {
    const normalizedStatusCode = message;
    const normalizedMessage = typeof statusCode === 'string' ? statusCode : 'Request failed';
    const normalizedError = error ?? (typeof statusCode !== 'string' ? statusCode : null);
    message = normalizedMessage;
    statusCode = normalizedStatusCode;
    error = normalizedError;
  }

  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
    statusCode = 400;
  }

  const response = {
    success: false,
    message
  };
  
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message (optional)
 */
const sendCreatedResponse = (res, data, message = 'Resource created successfully') => {
  res.status(201).json({
    success: true,
    message,
    data
  });
};

/**
 * Send updated response (200)
 * @param {Object} res - Express response object
 * @param {*} data - Updated resource data
 * @param {string} message - Success message (optional)
 */
const sendUpdatedResponse = (res, data, message = 'Resource updated successfully') => {
  res.status(200).json({
    success: true,
    message,
    data
  });
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message (optional)
 */
const sendPaginatedResponse = (res, data, page, limit, total, message = 'Data retrieved successfully') => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  });
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 * @param {string} message - Error message (optional)
 */
const sendValidationErrorResponse = (res, errors, message = 'Validation failed') => {
  res.status(400).json({
    success: false,
    message,
    errors
  });
};

/**
 * Send unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 */
const sendUnauthorizedResponse = (res, message = 'Unauthorized access') => {
  res.status(401).json({
    success: false,
    message
  });
};

/**
 * Send forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 */
const sendForbiddenResponse = (res, message = 'Forbidden access') => {
  res.status(403).json({
    success: false,
    message
  });
};

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 */
const sendNotFoundResponse = (res, message = 'Resource not found') => {
  res.status(404).json({
    success: false,
    message
  });
};

/**
 * Send too many requests response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 */
const sendTooManyRequestsResponse = (res, message = 'Too many requests') => {
  res.status(429).json({
    success: false,
    message
  });
};

/**
 * Send internal server error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message (optional)
 * @param {*} error - Error details (optional)
 */
const sendInternalServerErrorResponse = (res, message = 'Internal server error', error = null) => {
  const response = {
    success: false,
    message
  };
  
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }
  
  res.status(500).json(response);
};

module.exports = {
  sendSuccessResponse,
  sendErrorResponse,
  sendCreatedResponse,
  sendUpdatedResponse,
  sendPaginatedResponse,
  sendValidationErrorResponse,
  sendUnauthorizedResponse,
  sendForbiddenResponse,
  sendNotFoundResponse,
  sendTooManyRequestsResponse,
  sendInternalServerErrorResponse
};
