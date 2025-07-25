/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
const sendSuccessResponse = (res, message = 'Success', data = null, statusCode = 200, meta = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Validation errors or additional error details
 * @param {string} errorCode - Custom error code
 */
const sendErrorResponse = (res, message = 'Something went wrong', statusCode = 500, errors = null, errorCode = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    response.errorCode = errorCode;
  }

  if (errors) {
    response.errors = errors;
  }

  // Don't send stack trace in production
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = new Error().stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */
const sendPaginatedResponse = (res, data, page, limit, total, message = 'Data retrieved successfully') => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const totalPages = Math.ceil(total / limit);

  const pagination = {
    current: page,
    total: totalPages,
    hasNext: endIndex < total,
    hasPrev: startIndex > 0,
    next: endIndex < total ? page + 1 : null,
    prev: startIndex > 0 ? page - 1 : null,
    limit,
    totalItems: total
  };

  return sendSuccessResponse(res, message, data, 200, { pagination });
};

/**
 * Send authentication response with token
 * @param {Object} res - Express response object
 * @param {Object} user - User object
 * @param {string} token - JWT token
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const sendAuthResponse = (res, user, token, message = 'Authentication successful', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        contactNumber: user.contactNumber,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      },
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array} validationErrors - Array of validation errors
 * @param {string} message - Error message
 */
const sendValidationErrorResponse = (res, validationErrors, message = 'Validation failed') => {
  const formattedErrors = validationErrors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value
  }));

  return sendErrorResponse(res, message, 400, formattedErrors, 'VALIDATION_ERROR');
};

/**
 * Send file upload response
 * @param {Object} res - Express response object
 * @param {Object|Array} files - Uploaded file(s) information
 * @param {string} message - Success message
 */
const sendFileUploadResponse = (res, files, message = 'Files uploaded successfully') => {
  const fileData = Array.isArray(files) ? files : [files];
  
  const formattedFiles = fileData.map(file => ({
    originalName: file.originalname,
    fileName: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    url: file.url || `/uploads/${file.filename}`,
    uploadedAt: new Date().toISOString()
  }));

  return sendSuccessResponse(res, message, formattedFiles, 201);
};

/**
 * Send no content response (for DELETE operations)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 */
const sendNoContentResponse = (res, message = 'Operation completed successfully') => {
  return res.status(204).json({
    success: true,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send created response (for POST operations)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
const sendCreatedResponse = (res, data, message = 'Resource created successfully') => {
  return sendSuccessResponse(res, message, data, 201);
};

/**
 * Send updated response (for PUT/PATCH operations)
 * @param {Object} res - Express response object
 * @param {*} data - Updated resource data
 * @param {string} message - Success message
 */
const sendUpdatedResponse = (res, data, message = 'Resource updated successfully') => {
  return sendSuccessResponse(res, message, data, 200);
};

/**
 * Handle async operations and send appropriate response
 * @param {Object} res - Express response object
 * @param {Function} operation - Async operation to perform
 * @param {string} successMessage - Success message
 * @param {string} errorMessage - Error message
 */
const handleAsyncResponse = async (res, operation, successMessage = 'Operation successful', errorMessage = 'Operation failed') => {
  try {
    const result = await operation();
    return sendSuccessResponse(res, successMessage, result);
  } catch (error) {
    console.error('Async operation error:', error);
    return sendErrorResponse(res, errorMessage, 500);
  }
};

/**
 * Create response formatter for consistent API responses
 * @param {string} version - API version
 */
const createResponseFormatter = (version = 'v1') => {
  return {
    success: (res, message, data, statusCode = 200, meta = null) => {
      const response = {
        success: true,
        version,
        message,
        timestamp: new Date().toISOString()
      };

      if (data !== null) {
        response.data = data;
      }

      if (meta) {
        response.meta = meta;
      }

      return res.status(statusCode).json(response);
    },

    error: (res, message, statusCode = 500, errors = null) => {
      const response = {
        success: false,
        version,
        message,
        timestamp: new Date().toISOString()
      };

      if (errors) {
        response.errors = errors;
      }

      return res.status(statusCode).json(response);
    }
  };
};

module.exports = {
  sendSuccessResponse,
  sendErrorResponse,
  sendPaginatedResponse,
  sendAuthResponse,
  sendValidationErrorResponse,
  sendFileUploadResponse,
  sendNoContentResponse,
  sendCreatedResponse,
  sendUpdatedResponse,
  handleAsyncResponse,
  createResponseFormatter
};