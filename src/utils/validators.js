const { body, validationResult } = require('express-validator');

const hasAtLeastOnePhoto = (photoField, photosField) => {
  const hasPhotoString = typeof photoField === 'string' && photoField.trim() !== '';
  const hasPhotoArray = Array.isArray(photoField) && photoField.some(
    (photo) => typeof photo === 'string' && photo.trim() !== ''
  );
  const hasPhotosArray = Array.isArray(photosField) && photosField.some(
    (photo) => typeof photo === 'string' && photo.trim() !== ''
  );

  return hasPhotoString || hasPhotoArray || hasPhotosArray;
};

// Custom validator for rating-based image requirements
const validateRatingImages = (req, res, next) => {
  const errors = [];
  
  if (req.body.geometric_details?.floors) {
    req.body.geometric_details.floors.forEach((floor, floorIndex) => {
      if (floor.flats) {
        floor.flats.forEach((flat, flatIndex) => {
          // Check structural ratings
          if (flat.structural_rating) {
            ['beams', 'columns', 'slab', 'foundation'].forEach(component => {
              const rating = flat.structural_rating[component];
              if (rating && rating.rating >= 1 && rating.rating <= 5) {
                if (!hasAtLeastOnePhoto(rating.photo, rating.photos)) {
                  errors.push({
                    field: `geometric_details.floors[${floorIndex}].flats[${flatIndex}].structural_rating.${component}.photos`,
                    message: `Photos are required for ${component} with rating ${rating.rating} (ratings 1-5)`,
                    location: `Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1}`
                  });
                }
              }
            });
          }
          
          // Check non-structural ratings  
          if (flat.non_structural_rating) {
            Object.keys(flat.non_structural_rating).forEach(component => {
              const rating = flat.non_structural_rating[component];
              if (rating && rating.rating >= 1 && rating.rating <= 5) {
                if (!hasAtLeastOnePhoto(rating.photo, rating.photos)) {
                  errors.push({
                    field: `geometric_details.floors[${floorIndex}].flats[${flatIndex}].non_structural_rating.${component}.photos`,
                    message: `Photos are required for ${component.replace('_', ' ')} with rating ${rating.rating} (ratings 1-5)`,
                    location: `Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1}`
                  });
                }
              }
            });
          }
        });
      }
    });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Image validation failed - Photos required for ratings 1-5',
      errors: errors
    });
  }
  
  next();
};

const structureValidation = [
  // Structural Identity Validation
  body('structural_identity.state_code')
    .isLength({ min: 2, max: 2 })
    .withMessage('State code must be 2 characters')
    .matches(/^[A-Z]{2}$/)
    .withMessage('State code must be 2 uppercase letters'),

  body('structural_identity.district_code')
    .isLength({ min: 2, max: 2 })
    .withMessage('District code must be 2 characters')
    .matches(/^[0-9]{2}$/)
    .withMessage('District code must be 2 digits'),

  body('structural_identity.city_name')
    .notEmpty()
    .withMessage('City name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('City name must be between 1-50 characters'),

  body('structural_identity.location_code')
    .notEmpty()
    .withMessage('Location code is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Location code must be between 1-10 characters'),

  body('structural_identity.structure_number')
    .notEmpty()
    .withMessage('Structure number is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Structure number must be between 1-20 characters'),

  body('structural_identity.type_of_structure')
    .isIn(['residential', 'commercial', 'educational', 'hospital', 'industrial'])
    .withMessage('Invalid structure type. Must be one of: residential, commercial, educational, hospital, industrial'),

  // Location Validation
  body('location.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('location.address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),

  body('location.area_of_structure')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Area must be positive'),

  // Administration Validation
  body('administration.client_name')
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Client name must be between 1-100 characters'),

  body('administration.custodian')
    .notEmpty()
    .withMessage('Custodian is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Custodian name must be between 1-50 characters'),

  body('administration.engineer_designation')
    .notEmpty()
    .withMessage('Engineer designation is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Engineer designation must be between 1-50 characters'),

  body('administration.contact_details')
    .matches(/^[0-9]{10}$/)
    .withMessage('Contact details must be 10 digits'),

  body('administration.email_id')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  // Geometric Details Validation
  body('geometric_details.number_of_floors')
    .isInt({ min: 1 })
    .withMessage('Number of floors must be at least 1'),

  body('geometric_details.structure_width')
    .isFloat({ min: 0.1 })
    .withMessage('Structure width must be positive'),

  body('geometric_details.structure_length')
    .isFloat({ min: 0.1 })
    .withMessage('Structure length must be positive'),

  body('geometric_details.structure_height')
    .isFloat({ min: 0.1 })
    .withMessage('Total height must be positive'),

  // Floors validation
  body('geometric_details.floors')
    .optional()
    .isArray()
    .withMessage('Floors must be an array'),

  body('geometric_details.floors.*.floor_number')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Floor number must be non-negative'),

  body('geometric_details.floors.*.floor_type')
    .optional()
    .isIn(['parking', 'residential', 'commercial', 'common_area', 'mixed_use', 'other'])
    .withMessage('Invalid floor type'),

  body('geometric_details.floors.*.floor_height')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Floor height must be positive'),

  // Status validation
  body('status')
    .optional()
    .isIn(['draft', 'submitted', 'approved', 'requires_inspection', 'maintenance_needed'])
    .withMessage('Invalid status'),

  // Additional fields validation
  body('additional_photos')
    .optional()
    .isArray()
    .withMessage('Additional photos must be an array'),

  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),

  body('overall_condition_summary')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Overall condition summary must not exceed 500 characters')
];

module.exports = {
  structureValidation,
  validateRatingImages
};
