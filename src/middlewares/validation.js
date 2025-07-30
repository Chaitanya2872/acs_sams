const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  try {
    console.log('🔍 Validating request body...');
    console.log('📋 Request body keys:', Object.keys(req.body));
    
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors found:', errors.array().length);
      console.log('📝 Validation errors:', JSON.stringify(errors.array(), null, 2));
      
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors,
        totalErrors: formattedErrors.length
      });
    }

    console.log('✅ Validation passed');
    next();
  } catch (error) {
    console.error('❌ Validation middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal validation error',
      error: error.message
    });
  }
};

// Alternative: Skip validation for testing
const skipValidation = (req, res, next) => {
  console.log('⚠️  Skipping validation (for testing only)');
  next();
};

module.exports = {
  handleValidationErrors,
  skipValidation
};