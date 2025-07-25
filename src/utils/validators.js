const { body, param, query } = require('express-validator');

const registerValidation = [
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
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('contactNumber')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Contact number must be 10 digits'),
  
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const structureValidation = [
  body('stateCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('State code must be 2 characters'),
  
  body('districtCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('District code must be 2 characters'),
  
  body('cityName')
    .trim()
    .notEmpty()
    .withMessage('City name is required'),
  
  body('locationCode')
    .trim()
    .notEmpty()
    .withMessage('Location code is required'),
  
  body('structureNumber')
    .trim()
    .notEmpty()
    .withMessage('Structure number is required'),
  
  body('typeOfStructure')
    .isIn(['residential', 'commercial', 'educational', 'hospital', 'industrial'])
    .withMessage('Invalid structure type'),
  
  body('coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('clientName')
    .trim()
    .notEmpty()
    .withMessage('Client name is required'),
  
  body('custodian')
    .trim()
    .notEmpty()
    .withMessage('Custodian is required'),
  
  body('engineerDesignation')
    .trim()
    .notEmpty()
    .withMessage('Engineer designation is required'),
  
  body('contactDetails')
    .matches(/^[0-9]{10}$/)
    .withMessage('Contact details must be 10 digits'),
  
  body('emailId')
    .isEmail()
    .withMessage('Please provide a valid email'),
  
  body('numberOfFloors')
    .isInt({ min: 1 })
    .withMessage('Number of floors must be at least 1'),
  
  body('structureWidth')
    .isFloat({ min: 0 })
    .withMessage('Structure width must be positive'),
  
  body('structureLength')
    .isFloat({ min: 0 })
    .withMessage('Structure length must be positive'),
  
  body('totalHeight')
    .isFloat({ min: 0 })
    .withMessage('Total height must be positive')
];

module.exports = {
  registerValidation,
  loginValidation,
  structureValidation
};