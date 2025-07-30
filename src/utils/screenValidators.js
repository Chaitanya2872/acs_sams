const { body, query } = require('express-validator');

// Screen 1: Location (Structure Identification + GPS Coordinates)
const locationValidation = [
  // Structure Identification fields
  body('state_code')
    .notEmpty()
    .withMessage('State code is required')
    .isLength({ min: 2, max: 2 })
    .withMessage('State code must be exactly 2 characters')
    .matches(/^[A-Z]{2}$/)
    .withMessage('State code must be 2 uppercase letters')
    .custom((value) => {
      const validStateCodes = [
        'AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CG', 'DD', 'DL', 'DN', 'GA', 'GJ', 
        'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 
        'NL', 'OD', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TS', 'TR', 'UK', 'UP', 'WB'
      ];
      if (!validStateCodes.includes(value)) {
        throw new Error('Invalid state code. Must be a valid Indian state code.');
      }
      return true;
    }),
  
  body('district_code')
    .notEmpty()
    .withMessage('District code is required')
    .isLength({ min: 1, max: 2 })
    .withMessage('District code must be 1-2 characters')
    .matches(/^[0-9]{1,2}$/)
    .withMessage('District code must be numeric')
    .customSanitizer((value) => {
      return value.padStart(2, '0');
    }),
  
  body('city_name')
    .notEmpty()
    .withMessage('City/Town/Village name is required')
    .isLength({ min: 1, max: 4 })
    .withMessage('City name code must be 1-4 characters')
    .matches(/^[A-Za-z]+$/)
    .withMessage('City name must contain only letters')
    .customSanitizer((value) => {
      const upper = value.toUpperCase();
      return upper.padEnd(4, 'X').substring(0, 4);
    }),
  
  body('location_code')
    .notEmpty()
    .withMessage('Location code is required')
    .isLength({ min: 1, max: 2 })
    .withMessage('Location code must be 1-2 characters')
    .matches(/^[A-Za-z]+$/)
    .withMessage('Location code must contain only letters')
    .customSanitizer((value) => {
      const upper = value.toUpperCase();
      return upper.padEnd(2, 'X').substring(0, 2);
    }),
  
  body('type_of_structure')
    .notEmpty()
    .withMessage('Type of structure is required')
    .isIn(['residential', 'commercial', 'educational', 'hospital', 'industrial'])
    .withMessage('Invalid structure type. Must be one of: residential, commercial, educational, hospital, industrial'),

  // GPS Coordinates
  body('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  // Optional address field
  body('address').optional().isString().trim().isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters')
];

// Screen 2: Administrative (Admin/Client Details)
const administrativeValidation = [
  body('client_name')
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Client name must be 1-50 characters')
    .trim(),
  
  body('custodian')
    .notEmpty()
    .withMessage('Custodian is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Custodian must be 1-20 characters')
    .trim(),
  
  body('engineer_designation')
    .notEmpty()
    .withMessage('Engineer designation is required')
    .isLength({ min: 1, max: 30 })
    .withMessage('Engineer designation must be 1-30 characters')
    .trim(),
  
  body('contact_details')
    .notEmpty()
    .withMessage('Contact details are required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Contact details must be exactly 10 digits'),
  
  body('email_id')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 30 })
    .withMessage('Email cannot exceed 30 characters')
];

// Screen 3: Geometric (Building Dimensions + Floor Details)
const geometricValidation = [
  body('number_of_floors')
    .notEmpty()
    .withMessage('Number of floors is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Number of floors must be between 1 and 100'),
  
  body('structure_width')
    .notEmpty()
    .withMessage('Structure width is required')
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Structure width must be between 0.1 and 1000 meters'),
  
  body('structure_length')
    .notEmpty()
    .withMessage('Structure length is required')
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Structure length must be between 0.1 and 1000 meters'),
  
  body('structure_height')
    .notEmpty()
    .withMessage('Structure height is required')
    .isFloat({ min: 0.1, max: 500 })
    .withMessage('Structure height must be between 0.1 and 500 meters'),

  // Optional floor details for future enhancement
  body('floors').optional().isArray(),
  body('floors.*.floor_number').optional().isInt({ min: 1 }),
  body('floors.*.floor_type').optional().isIn(['parking', 'residential', 'commercial', 'common_area', 'mixed_use', 'other']),
  body('floors.*.floor_height').optional().isFloat({ min: 0.1, max: 20 }),
  body('floors.*.total_area_sq_mts').optional().isFloat({ min: 0.1 })
];

// Screen 4: Overall Ratings (Structural + Non-Structural Combined)
const ratingsValidation = [
  // STRUCTURAL RATINGS
  body('structural_ratings').notEmpty().withMessage('Structural ratings are required'),
  
  body('structural_ratings.beams_rating')
    .notEmpty()
    .withMessage('Beams rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Beams rating must be between 1 and 5'),
  
  body('structural_ratings.columns_rating')
    .notEmpty()
    .withMessage('Columns rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Columns rating must be between 1 and 5'),
  
  body('structural_ratings.slab_rating')
    .notEmpty()
    .withMessage('Slab rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Slab rating must be between 1 and 5'),
  
  body('structural_ratings.foundation_rating')
    .notEmpty()
    .withMessage('Foundation rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Foundation rating must be between 1 and 5'),

  // Optional structural comments and photos
  body('structural_ratings.beams_comment').optional().isString().trim(),
  body('structural_ratings.columns_comment').optional().isString().trim(),
  body('structural_ratings.slab_comment').optional().isString().trim(),
  body('structural_ratings.foundation_comment').optional().isString().trim(),
  body('structural_ratings.beams_photos').optional().isArray(),
  body('structural_ratings.columns_photos').optional().isArray(),
  body('structural_ratings.slab_photos').optional().isArray(),
  body('structural_ratings.foundation_photos').optional().isArray(),

  // NON-STRUCTURAL RATINGS
  body('non_structural_ratings').notEmpty().withMessage('Non-structural ratings are required'),
  
  body('non_structural_ratings.brick_plaster_rating')
    .notEmpty()
    .withMessage('Brick plaster rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Brick plaster rating must be between 1 and 5'),
  
  body('non_structural_ratings.doors_windows_rating')
    .notEmpty()
    .withMessage('Doors & windows rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Doors & windows rating must be between 1 and 5'),
  
  body('non_structural_ratings.flooring_tiles_rating')
    .notEmpty()
    .withMessage('Flooring/tiles rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Flooring/tiles rating must be between 1 and 5'),
  
  body('non_structural_ratings.electrical_wiring_rating')
    .notEmpty()
    .withMessage('Electrical wiring rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical wiring rating must be between 1 and 5'),
  
  body('non_structural_ratings.sanitary_fittings_rating')
    .notEmpty()
    .withMessage('Sanitary fittings rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sanitary fittings rating must be between 1 and 5'),
  
  body('non_structural_ratings.railings_rating')
    .notEmpty()
    .withMessage('Railings rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Railings rating must be between 1 and 5'),
  
  body('non_structural_ratings.water_tanks_rating')
    .notEmpty()
    .withMessage('Water tanks rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Water tanks rating must be between 1 and 5'),
  
  body('non_structural_ratings.plumbing_rating')
    .notEmpty()
    .withMessage('Plumbing rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Plumbing rating must be between 1 and 5'),
  
  body('non_structural_ratings.sewage_system_rating')
    .notEmpty()
    .withMessage('Sewage system rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sewage system rating must be between 1 and 5'),
  
  body('non_structural_ratings.panel_board_rating')
    .notEmpty()
    .withMessage('Panel board rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Panel board rating must be between 1 and 5'),
  
  body('non_structural_ratings.lifts_rating')
    .notEmpty()
    .withMessage('Lifts rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Lifts rating must be between 1 and 5'),

  // Optional non-structural comments and photos
  body('non_structural_ratings.brick_plaster_comment').optional().isString().trim(),
  body('non_structural_ratings.doors_windows_comment').optional().isString().trim(),
  body('non_structural_ratings.flooring_tiles_comment').optional().isString().trim(),
  body('non_structural_ratings.electrical_wiring_comment').optional().isString().trim(),
  body('non_structural_ratings.sanitary_fittings_comment').optional().isString().trim(),
  body('non_structural_ratings.railings_comment').optional().isString().trim(),
  body('non_structural_ratings.water_tanks_comment').optional().isString().trim(),
  body('non_structural_ratings.plumbing_comment').optional().isString().trim(),
  body('non_structural_ratings.sewage_system_comment').optional().isString().trim(),
  body('non_structural_ratings.panel_board_comment').optional().isString().trim(),
  body('non_structural_ratings.lifts_comment').optional().isString().trim(),

  body('non_structural_ratings.brick_plaster_photos').optional().isArray(),
  body('non_structural_ratings.doors_windows_photos').optional().isArray(),
  body('non_structural_ratings.flooring_tiles_photos').optional().isArray(),
  body('non_structural_ratings.electrical_wiring_photos').optional().isArray(),
  body('non_structural_ratings.sanitary_fittings_photos').optional().isArray(),
  body('non_structural_ratings.railings_photos').optional().isArray(),
  body('non_structural_ratings.water_tanks_photos').optional().isArray(),
  body('non_structural_ratings.plumbing_photos').optional().isArray(),
  body('non_structural_ratings.sewage_system_photos').optional().isArray(),
  body('non_structural_ratings.panel_board_photos').optional().isArray(),
  body('non_structural_ratings.lifts_photos').optional().isArray(),

  // Custom validation for photos when ratings < 3
  body().custom((body) => {
    const errors = [];
    
    // Check structural ratings for photo requirements
    const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
    structuralComponents.forEach(component => {
      const rating = body.structural_ratings?.[`${component}_rating`];
      const photos = body.structural_ratings?.[`${component}_photos`];
      
      if (rating < 3 && (!photos || photos.length === 0)) {
        errors.push(`Photos are required for ${component} when rating is below 3`);
      }
    });
    
    // Check non-structural ratings for photo requirements
    const nonStructuralComponents = [
      'brick_plaster', 'doors_windows', 'electrical_wiring', 'plumbing', 'panel_board'
    ];
    nonStructuralComponents.forEach(component => {
      const rating = body.non_structural_ratings?.[`${component}_rating`];
      const photos = body.non_structural_ratings?.[`${component}_photos`];
      
      if (rating < 3 && (!photos || photos.length === 0)) {
        errors.push(`Photos are required for ${component.replace('_', ' ')} when rating is below 3`);
      }
    });
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  })
];

// Structure number validation (for validation API)
const structureNumberValidation = [
  body('structural_identity_number')
    .notEmpty()
    .withMessage('Structural identity number is required')
    .isLength({ min: 17, max: 17 })
    .withMessage('Structural identity number must be exactly 17 characters')
    .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z]{2}[0-9]{5}[0-9]{2}$/)
    .withMessage('Invalid structural identity number format')
];

module.exports = {
  locationValidation,
  administrativeValidation,
  geometricValidation,
  ratingsValidation,
  structureNumberValidation
};