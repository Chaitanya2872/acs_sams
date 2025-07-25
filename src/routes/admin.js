const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');
const {
  validateObjectId,
  validateQueryParams,
  handleValidationErrors
} = require('../middlewares/validation');
const { body, param } = require('express-validator');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// User Management Routes

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Admin only)
 */
router.get('/users', validateQueryParams, adminController.getUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user by ID
 * @access  Private (Admin only)
 */
router.get('/users/:id', validateObjectId('id'), adminController.getUser);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post(
  '/users',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    
    body('role')
      .isIn(['user', 'admin', 'inspector', 'engineer'])
      .withMessage('Invalid role'),
    
    body('designation')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Designation cannot exceed 100 characters'),
    
    body('contactNumber')
      .optional()
      .matches(/^[0-9]{10}$/)
      .withMessage('Contact number must be a valid 10-digit number'),
    
    handleValidationErrors
  ],
  adminController.createUser
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put(
  '/users/:id',
  validateObjectId('id'),
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    
    body('role')
      .optional()
      .isIn(['user', 'admin', 'inspector', 'engineer'])
      .withMessage('Invalid role'),
    
    body('designation')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Designation cannot exceed 100 characters'),
    
    body('contactNumber')
      .optional()
      .matches(/^[0-9]{10}$/)
      .withMessage('Contact number must be a valid 10-digit number'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    
    handleValidationErrors
  ],
  adminController.updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/users/:id', validateObjectId('id'), adminController.deleteUser);

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Private (Admin only)
 */
router.post('/users/:id/reset-password', validateObjectId('id'), adminController.resetUserPassword);

// Code Management Routes

/**
 * @route   GET /api/admin/codes/states
 * @desc    Get all state codes
 * @access  Private (Admin only)
 */
router.get('/codes/states', adminController.getStateCodes);

/**
 * @route   GET /api/admin/codes/districts/:stateCode
 * @desc    Get district codes by state
 * @access  Private (Admin only)
 */
router.get(
  '/codes/districts/:stateCode',
  [
    param('stateCode')
      .isLength({ min: 2, max: 2 })
      .withMessage('State code must be exactly 2 characters')
      .isAlpha()
      .withMessage('State code must contain only letters'),
    handleValidationErrors
  ],
  adminController.getDistrictCodes
);

/**
 * @route   POST /api/admin/codes/districts
 * @desc    Create district code
 * @access  Private (Admin only)
 */
router.post(
  '/codes/districts',
  [
    body('stateCode')
      .isLength({ min: 2, max: 2 })
      .withMessage('State code must be exactly 2 characters')
      .isAlpha()
      .withMessage('State code must contain only letters'),
    
    body('code')
      .isLength({ min: 2, max: 2 })
      .withMessage('District code must be exactly 2 characters'),
    
    body('name')
      .trim()
      .notEmpty()
      .withMessage('District name is required')
      .isLength({ max: 100 })
      .withMessage('District name cannot exceed 100 characters'),
    
    handleValidationErrors
  ],
  adminController.createDistrictCode
);

/**
 * @route   GET /api/admin/codes/structure-types
 * @desc    Get all structure types
 * @access  Private (Admin only)
 */
router.get('/codes/structure-types', adminController.getStructureTypes);

/**
 * @route   POST /api/admin/codes/structure-types
 * @desc    Create structure type
 * @access  Private (Admin only)
 */
router.post(
  '/codes/structure-types',
  [
    body('code')
      .trim()
      .notEmpty()
      .withMessage('Structure type code is required')
      .isLength({ max: 10 })
      .withMessage('Code cannot exceed 10 characters'),
    
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Structure type name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),
    
    body('category')
      .isIn(['residential', 'commercial', 'educational', 'hospital', 'industrial', 'other'])
      .withMessage('Invalid category'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    handleValidationErrors
  ],
  adminController.createStructureType
);

/**
 * @route   GET /api/admin/codes/structural-forms
 * @desc    Get all structural forms
 * @access  Private (Admin only)
 */
router.get('/codes/structural-forms', adminController.getStructuralForms);

/**
 * @route   GET /api/admin/codes/materials
 * @desc    Get all construction materials
 * @access  Private (Admin only)
 */
router.get('/codes/materials', adminController.getConstructionMaterials);

/**
 * @route   GET /api/admin/codes/rating-descriptions
 * @desc    Get rating descriptions
 * @access  Private (Admin only)
 */
router.get('/codes/rating-descriptions', adminController.getRatingDescriptions);

/**
 * @route   POST /api/admin/codes/rating-descriptions
 * @desc    Create rating description
 * @access  Private (Admin only)
 */
router.post(
  '/codes/rating-descriptions',
  [
    body('elementType')
      .isIn([
        'beams', 'columns', 'slab', 'foundation',
        'brick_plaster', 'doors_windows', 'flooring_bathroom_tiles',
        'electrical_wiring', 'fittings_sanitary', 'railings',
        'water_tanks', 'plumbing', 'sewage_system',
        'panel_board_transformer', 'lifts'
      ])
      .withMessage('Invalid element type'),
    
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    
    body('condition')
      .isIn(['excellent', 'good', 'fair', 'poor', 'very_poor', 'failure'])
      .withMessage('Invalid condition'),
    
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    
    body('recommendedAction')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Recommended action cannot exceed 500 characters'),
    
    handleValidationErrors
  ],
  adminController.createRatingDescription
);

/**
 * @route   PUT /api/admin/codes/rating-descriptions/:id
 * @desc    Update rating description
 * @access  Private (Admin only)
 */
router.put(
  '/codes/rating-descriptions/:id',
  validateObjectId('id'),
  [
    body('condition')
      .optional()
      .isIn(['excellent', 'good', 'fair', 'poor', 'very_poor', 'failure'])
      .withMessage('Invalid condition'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    
    body('recommendedAction')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Recommended action cannot exceed 500 characters'),
    
    handleValidationErrors
  ],
  adminController.updateRatingDescription
);

// System Management Routes

/**
 * @route   GET /api/admin/system-stats
 * @desc    Get system statistics
 * @access  Private (Admin only)
 */
router.get('/system-stats', adminController.getSystemStats);

/**
 * @route   PUT /api/admin/structures/bulk-update
 * @desc    Bulk update structures
 * @access  Private (Admin only)
 */
router.put(
  '/structures/bulk-update',
  [
    body('structureIds')
      .isArray({ min: 1 })
      .withMessage('Structure IDs must be a non-empty array')
      .custom((ids) => {
        return ids.every(id => id.match(/^[0-9a-fA-F]{24}$/));
      })
      .withMessage('All structure IDs must be valid MongoDB ObjectIds'),
    
    body('updateData')
      .isObject()
      .withMessage('Update data must be an object'),
    
    body('updateData.status')
      .optional()
      .isIn(['draft', 'submitted', 'under_inspection', 'completed', 'rejected'])
      .withMessage('Invalid status'),
    
    body('updateData.priorityLevel')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority level'),
    
    body('updateData.inspectorId')
      .optional()
      .isMongoId()
      .withMessage('Inspector ID must be a valid MongoDB ObjectId'),
    
    handleValidationErrors
  ],
  adminController.bulkUpdateStructures
);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private (Admin only)
 */
router.get('/audit-logs', validateQueryParams, adminController.getAuditLogs);

module.exports = router;