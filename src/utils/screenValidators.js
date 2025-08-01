const { body, query } = require('express-validator');

// =================== LOCATION VALIDATION ===================
const locationValidation = [
  // Zip Code field
  body('zip_code')
    .notEmpty()
    .withMessage('Zip code is required')
    .matches(/^[0-9]{6}$/)
    .withMessage('Zip code must be exactly 6 digits'),

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

// =================== ADMINISTRATIVE VALIDATION ===================
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

// =================== GEOMETRIC DETAILS VALIDATION ===================
const geometricDetailsValidation = [
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
    .withMessage('Structure height must be between 0.1 and 500 meters')
];

// =================== FLOOR VALIDATION ===================
const floorValidation = [
  body('floors')
    .isArray({ min: 1 })
    .withMessage('At least one floor is required'),
  
  body('floors.*.floor_number')
    .isInt({ min: 1, max: 100 })
    .withMessage('Floor number must be between 1 and 100'),
  
  body('floors.*.floor_type')
    .optional()
    .isIn(['parking', 'residential', 'commercial', 'common_area', 'mixed_use', 'other'])
    .withMessage('Invalid floor type'),
  
  body('floors.*.floor_height')
    .optional()
    .isFloat({ min: 2, max: 20 })
    .withMessage('Floor height must be between 2 and 20 meters'),
  
  body('floors.*.total_area_sq_mts')
    .optional()
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Total area must be between 1 and 10,000 square meters'),
  
  body('floors.*.floor_label_name')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Floor label name cannot exceed 50 characters'),
  
  // FIXED: Allow 0 flats for parking floors
  body('floors.*.number_of_flats')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Number of flats must be between 0 and 50'),
  
  body('floors.*.floor_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Floor notes cannot exceed 500 characters')
];

// =================== UPDATED: FLAT VALIDATION ===================
const flatValidation = [
  body('flats')
    .isArray({ min: 1 })
    .withMessage('At least one flat is required'),
  
  body('flats.*.flat_number')
    .notEmpty()
    .withMessage('Flat number is required')
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters'),
  
  body('flats.*.flat_type')
    .optional()
    .isIn(['1bhk', '2bhk', '3bhk', '4bhk', '5bhk', 'studio', 'duplex', 'penthouse', 'shop', 'office', 'parking_slot'])
    .withMessage('Invalid flat type'),
  
  body('flats.*.area_sq_mts')
    .optional()
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Area must be between 1 and 10,000 square meters'),
  
  body('flats.*.direction_facing')
    .optional()
    .isIn(['north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west'])
    .withMessage('Invalid direction'),
  
  body('flats.*.occupancy_status')
    .optional()
    .isIn(['occupied', 'vacant', 'under_maintenance', 'locked'])
    .withMessage('Invalid occupancy status'),
  
  body('flats.*.flat_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Flat notes cannot exceed 1000 characters')
];

// =================== FLAT STRUCTURAL RATING VALIDATION ===================
const flatStructuralRatingValidation = [
  // Beams rating
  body('beams.rating')
    .notEmpty()
    .withMessage('Beams rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Beams rating must be between 1 and 5'),
  
  body('beams.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Beams condition comment cannot exceed 1000 characters'),
  
  body('beams.photos')
    .optional()
    .isArray()
    .withMessage('Beams photos must be an array'),

  // Columns rating
  body('columns.rating')
    .notEmpty()
    .withMessage('Columns rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Columns rating must be between 1 and 5'),
  
  body('columns.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Columns condition comment cannot exceed 1000 characters'),
  
  body('columns.photos')
    .optional()
    .isArray()
    .withMessage('Columns photos must be an array'),

  // Slab rating
  body('slab.rating')
    .notEmpty()
    .withMessage('Slab rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Slab rating must be between 1 and 5'),
  
  body('slab.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Slab condition comment cannot exceed 1000 characters'),
  
  body('slab.photos')
    .optional()
    .isArray()
    .withMessage('Slab photos must be an array'),

  // Foundation rating
  body('foundation.rating')
    .notEmpty()
    .withMessage('Foundation rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Foundation rating must be between 1 and 5'),
  
  body('foundation.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Foundation condition comment cannot exceed 1000 characters'),
  
  body('foundation.photos')
    .optional()
    .isArray()
    .withMessage('Foundation photos must be an array'),

  // Custom validation for photos when rating < 3
  body().custom((requestBody) => {
    const errors = [];
    const components = ['beams', 'columns', 'slab', 'foundation'];
    
    components.forEach(component => {
      const rating = requestBody[component]?.rating;
      const photos = requestBody[component]?.photos;
      
      if (rating && rating < 3 && (!photos || photos.length === 0)) {
        errors.push(`Photos are mandatory for ${component} when rating is below 3`);
      }
    });
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  })
];

// =================== FLAT NON-STRUCTURAL RATING VALIDATION ===================
const flatNonStructuralRatingValidation = [
  // Brick & Plaster
  body('brick_plaster.rating')
    .notEmpty()
    .withMessage('Brick & Plaster rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Brick & Plaster rating must be between 1 and 5'),
  
  body('brick_plaster.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Brick & Plaster condition comment cannot exceed 1000 characters'),
  
  body('brick_plaster.photos')
    .optional()
    .isArray()
    .withMessage('Brick & Plaster photos must be an array'),

  // Doors & Windows
  body('doors_windows.rating')
    .notEmpty()
    .withMessage('Doors & Windows rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Doors & Windows rating must be between 1 and 5'),
  
  body('doors_windows.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Doors & Windows condition comment cannot exceed 1000 characters'),
  
  body('doors_windows.photos')
    .optional()
    .isArray()
    .withMessage('Doors & Windows photos must be an array'),

  // Flooring & Tiles
  body('flooring_tiles.rating')
    .notEmpty()
    .withMessage('Flooring & Tiles rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Flooring & Tiles rating must be between 1 and 5'),
  
  body('flooring_tiles.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Flooring & Tiles condition comment cannot exceed 1000 characters'),
  
  body('flooring_tiles.photos')
    .optional()
    .isArray()
    .withMessage('Flooring & Tiles photos must be an array'),

  // Electrical Wiring
  body('electrical_wiring.rating')
    .notEmpty()
    .withMessage('Electrical Wiring rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical Wiring rating must be between 1 and 5'),
  
  body('electrical_wiring.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Electrical Wiring condition comment cannot exceed 1000 characters'),
  
  body('electrical_wiring.photos')
    .optional()
    .isArray()
    .withMessage('Electrical Wiring photos must be an array'),

  // Sanitary Fittings
  body('sanitary_fittings.rating')
    .notEmpty()
    .withMessage('Sanitary Fittings rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sanitary Fittings rating must be between 1 and 5'),
  
  body('sanitary_fittings.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Sanitary Fittings condition comment cannot exceed 1000 characters'),
  
  body('sanitary_fittings.photos')
    .optional()
    .isArray()
    .withMessage('Sanitary Fittings photos must be an array'),

  // Railings
  body('railings.rating')
    .notEmpty()
    .withMessage('Railings rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Railings rating must be between 1 and 5'),
  
  body('railings.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Railings condition comment cannot exceed 1000 characters'),
  
  body('railings.photos')
    .optional()
    .isArray()
    .withMessage('Railings photos must be an array'),

  // Water Tanks
  body('water_tanks.rating')
    .notEmpty()
    .withMessage('Water Tanks rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Water Tanks rating must be between 1 and 5'),
  
  body('water_tanks.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Water Tanks condition comment cannot exceed 1000 characters'),
  
  body('water_tanks.photos')
    .optional()
    .isArray()
    .withMessage('Water Tanks photos must be an array'),

  // Plumbing
  body('plumbing.rating')
    .notEmpty()
    .withMessage('Plumbing rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Plumbing rating must be between 1 and 5'),
  
  body('plumbing.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Plumbing condition comment cannot exceed 1000 characters'),
  
  body('plumbing.photos')
    .optional()
    .isArray()
    .withMessage('Plumbing photos must be an array'),

  // Sewage System
  body('sewage_system.rating')
    .notEmpty()
    .withMessage('Sewage System rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sewage System rating must be between 1 and 5'),
  
  body('sewage_system.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Sewage System condition comment cannot exceed 1000 characters'),
  
  body('sewage_system.photos')
    .optional()
    .isArray()
    .withMessage('Sewage System photos must be an array'),

  // Panel Board
  body('panel_board.rating')
    .notEmpty()
    .withMessage('Panel Board rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Panel Board rating must be between 1 and 5'),
  
  body('panel_board.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Panel Board condition comment cannot exceed 1000 characters'),
  
  body('panel_board.photos')
    .optional()
    .isArray()
    .withMessage('Panel Board photos must be an array'),

  // Lifts
  body('lifts.rating')
    .notEmpty()
    .withMessage('Lifts rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Lifts rating must be between 1 and 5'),
  
  body('lifts.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Lifts condition comment cannot exceed 1000 characters'),
  
  body('lifts.photos')
    .optional()
    .isArray()
    .withMessage('Lifts photos must be an array'),

  // Custom validation for photos when rating < 3
  body().custom((requestBody) => {
    const errors = [];
    const components = [
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'
    ];
    
    components.forEach(component => {
      const rating = requestBody[component]?.rating;
      const photos = requestBody[component]?.photos;
      
      if (rating && rating < 3 && (!photos || photos.length === 0)) {
        const componentName = component.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        errors.push(`Photos are mandatory for ${componentName} when rating is below 3`);
      }
    });
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  })
];

// =================== OVERALL STRUCTURAL RATING VALIDATION ===================
const overallStructuralRatingValidation = [
  // Beams
  body('beams.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Beams rating must be between 1 and 5'),
  
  body('beams.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Beams condition comment must not exceed 2000 characters'),
  
  body('beams.photos')
    .optional()
    .isArray()
    .withMessage('Beams photos must be an array'),

  // Columns
  body('columns.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Columns rating must be between 1 and 5'),
  
  body('columns.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Columns condition comment must not exceed 2000 characters'),
  
  body('columns.photos')
    .optional()
    .isArray()
    .withMessage('Columns photos must be an array'),

  // Slab
  body('slab.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Slab rating must be between 1 and 5'),
  
  body('slab.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Slab condition comment must not exceed 2000 characters'),
  
  body('slab.photos')
    .optional()
    .isArray()
    .withMessage('Slab photos must be an array'),

  // Foundation
  body('foundation.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Foundation rating must be between 1 and 5'),
  
  body('foundation.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Foundation condition comment must not exceed 2000 characters'),
  
  body('foundation.photos')
    .optional()
    .isArray()
    .withMessage('Foundation photos must be an array')
];

// =================== OVERALL NON-STRUCTURAL RATING VALIDATION ===================
const overallNonStructuralRatingValidation = [
  // Brick & Plaster
  body('brick_plaster.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Brick & Plaster rating must be between 1 and 5'),
  
  body('brick_plaster.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Brick & Plaster condition comment must not exceed 2000 characters'),
  
  body('brick_plaster.photos')
    .optional()
    .isArray()
    .withMessage('Brick & Plaster photos must be an array'),

  // Doors & Windows
  body('doors_windows.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Doors & Windows rating must be between 1 and 5'),
  
  body('doors_windows.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Doors & Windows condition comment must not exceed 2000 characters'),
  
  body('doors_windows.photos')
    .optional()
    .isArray()
    .withMessage('Doors & Windows photos must be an array'),

  // Flooring & Tiles
  body('flooring_tiles.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Flooring & Tiles rating must be between 1 and 5'),
  
  body('flooring_tiles.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Flooring & Tiles condition comment must not exceed 2000 characters'),
  
  body('flooring_tiles.photos')
    .optional()
    .isArray()
    .withMessage('Flooring & Tiles photos must be an array'),

  // Electrical Wiring
  body('electrical_wiring.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical Wiring rating must be between 1 and 5'),
  
  body('electrical_wiring.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Electrical Wiring condition comment must not exceed 2000 characters'),
  
  body('electrical_wiring.photos')
    .optional()
    .isArray()
    .withMessage('Electrical Wiring photos must be an array'),

  // Sanitary Fittings
  body('sanitary_fittings.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sanitary Fittings rating must be between 1 and 5'),
  
  body('sanitary_fittings.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Sanitary Fittings condition comment must not exceed 2000 characters'),
  
  body('sanitary_fittings.photos')
    .optional()
    .isArray()
    .withMessage('Sanitary Fittings photos must be an array'),

  // Railings
  body('railings.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Railings rating must be between 1 and 5'),
  
  body('railings.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Railings condition comment must not exceed 2000 characters'),
  
  body('railings.photos')
    .optional()
    .isArray()
    .withMessage('Railings photos must be an array'),

  // Water Tanks
  body('water_tanks.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Water Tanks rating must be between 1 and 5'),
  
  body('water_tanks.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Water Tanks condition comment must not exceed 2000 characters'),
  
  body('water_tanks.photos')
    .optional()
    .isArray()
    .withMessage('Water Tanks photos must be an array'),

  // Plumbing
  body('plumbing.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Plumbing rating must be between 1 and 5'),
  
  body('plumbing.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Plumbing condition comment must not exceed 2000 characters'),
  
  body('plumbing.photos')
    .optional()
    .isArray()
    .withMessage('Plumbing photos must be an array'),

  // Sewage System
  body('sewage_system.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sewage System rating must be between 1 and 5'),
  
  body('sewage_system.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Sewage System condition comment must not exceed 2000 characters'),
  
  body('sewage_system.photos')
    .optional()
    .isArray()
    .withMessage('Sewage System photos must be an array'),

  // Panel Board
  body('panel_board.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Panel Board rating must be between 1 and 5'),
  
  body('panel_board.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Panel Board condition comment must not exceed 2000 characters'),
  
  body('panel_board.photos')
    .optional()
    .isArray()
    .withMessage('Panel Board photos must be an array'),

  // Lifts
  body('lifts.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Lifts rating must be between 1 and 5'),
  
  body('lifts.condition_comment')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Lifts condition comment must not exceed 2000 characters'),
  
  body('lifts.photos')
    .optional()
    .isArray()
    .withMessage('Lifts photos must be an array')
];

// =================== STRUCTURE NUMBER VALIDATION ===================
const structureNumberValidation = [
  body('structural_identity_number')
    .notEmpty()
    .withMessage('Structural identity number is required')
    .isLength({ min: 17, max: 17 })
    .withMessage('Structural identity number must be exactly 17 characters')
    .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z]{2}[0-9]{5}[0-9]{2}$/)
    .withMessage('Invalid structural identity number format')
];

const bulkRatingsValidation = [
  // Validate floors array exists and is not empty
  body('floors')
    .isArray({ min: 1 })
    .withMessage('Floors array is required and must contain at least one floor'),

  // Validate each floor
  body('floors.*.floor_number')
    .notEmpty()
    .withMessage('Floor number is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Floor number must be between 1 and 100'),

  body('floors.*.flats')
    .isArray({ min: 1 })
    .withMessage('Each floor must contain at least one flat'),

  // Validate each flat
  body('floors.*.flats.*.flat_number')
    .notEmpty()
    .withMessage('Flat number is required')
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Flat number cannot exceed 20 characters'),

  // Optional structural ratings validation
  body('floors.*.flats.*.structural_rating.beams.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Beams rating must be between 1 and 5'),

  body('floors.*.flats.*.structural_rating.columns.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Columns rating must be between 1 and 5'),

  body('floors.*.flats.*.structural_rating.slab.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Slab rating must be between 1 and 5'),

  body('floors.*.flats.*.structural_rating.foundation.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Foundation rating must be between 1 and 5'),

  // Optional non-structural ratings validation (basic check)
  body('floors.*.flats.*.non_structural_rating.brick_plaster.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Brick & Plaster rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.doors_windows.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Doors & Windows rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.flooring_tiles.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Flooring & Tiles rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.electrical_wiring.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical Wiring rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.sanitary_fittings.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Sanitary Fittings rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.railings.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Railings rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.water_tanks.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Water Tanks rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.plumbing.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Plumbing rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.sewage_system.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Sewage System rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.panel_board.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Panel Board rating must be between 1 and 5'),

  body('floors.*.flats.*.non_structural_rating.lifts.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Lifts rating must be between 1 and 5'),

  // Validate condition comments length
  body('floors.*.flats.*.structural_rating.*.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Condition comment cannot exceed 1000 characters'),

  body('floors.*.flats.*.non_structural_rating.*.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Condition comment cannot exceed 1000 characters'),

  // Validate photos arrays
  body('floors.*.flats.*.structural_rating.*.photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array'),

  body('floors.*.flats.*.non_structural_rating.*.photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array')
];




module.exports = {
  locationValidation,
  administrativeValidation,
  geometricDetailsValidation,
  floorValidation,
  flatValidation,
  flatStructuralRatingValidation,
  flatNonStructuralRatingValidation,
  overallStructuralRatingValidation,
  overallNonStructuralRatingValidation,
  structureNumberValidation,
  bulkRatingsValidation
};