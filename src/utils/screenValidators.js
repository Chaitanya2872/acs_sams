const { body, query, param } = require('express-validator');

// =================== LOCATION VALIDATION (Screen 1) ===================
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
    .isLength({ min: 1, max: 50 })
    .withMessage('City name must be 1-50 characters')
    .matches(/^[A-Za-z\s]+$/)
    .withMessage('City name must contain only letters and spaces')
    .customSanitizer((value) => {
      const cleaned = value.replace(/\s+/g, '').toUpperCase();
      return cleaned.padEnd(4, 'X').substring(0, 4);
    }),
  
  body('location_code')
    .notEmpty()
    .withMessage('Location code is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Location code must be 1-10 characters')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('Location code must contain only letters and numbers')
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
  body('address')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters')
];

// =================== ADMINISTRATIVE VALIDATION (Screen 2) ===================
const administrativeValidation = [
  body('client_name')
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Client name must be 1-100 characters')
    .trim(),
  
  body('custodian')
    .notEmpty()
    .withMessage('Custodian is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Custodian must be 1-100 characters')
    .trim(),
  
  body('engineer_designation')
    .notEmpty()
    .withMessage('Engineer designation is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Engineer designation must be 1-100 characters')
    .trim(),
  
  body('contact_details')
    .notEmpty()
    .withMessage('Contact details are required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Contact details must be a valid 10-digit Indian mobile number'),
  
  body('email_id')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),

  body('organization')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization cannot exceed 200 characters')
];

// =================== GEOMETRIC DETAILS VALIDATION (Screen 3) ===================
const geometricDetailsValidation = [
  body('number_of_floors')
    .notEmpty()
    .withMessage('Number of floors is required')
    .isInt({ min: 1, max: 200 })
    .withMessage('Number of floors must be between 1 and 200'),
  
  body('structure_width')
    .notEmpty()
    .withMessage('Structure width is required')
    .isFloat({ min: 5, max: 500 })
    .withMessage('Structure width must be between 5 and 500 meters'),
  
  body('structure_length')
    .notEmpty()
    .withMessage('Structure length is required')
    .isFloat({ min: 5, max: 500 })
    .withMessage('Structure length must be between 5 and 500 meters'),
  
  body('structure_height')
    .notEmpty()
    .withMessage('Structure height is required')
    .isFloat({ min: 3, max: 1000 })
    .withMessage('Structure height must be between 3 and 1000 meters'),

  body('building_age')
    .optional()
    .isInt({ min: 0, max: 200 })
    .withMessage('Building age must be between 0 and 200 years'),

  body('construction_year')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() + 5 })
    .withMessage('Construction year must be realistic')
];

// =================== FLOOR VALIDATION ===================
const floorValidation = [
  body('floors')
    .isArray({ min: 1 })
    .withMessage('At least one floor is required'),
  
  body('floors.*.floor_number')
    .isInt({ min: 0, max: 200 })
    .withMessage('Floor number must be between 0 and 200 (0 for basement/parking)'),
  
  body('floors.*.floor_type')
    .optional()
    .isIn(['residential', 'commercial', 'mixed', 'parking', 'utility', 'recreational'])
    .withMessage('Invalid floor type'),
  
  body('floors.*.floor_height')
    .optional()
    .isFloat({ min: 2, max: 10 })
    .withMessage('Floor height must be between 2 and 10 meters'),
  
  body('floors.*.total_area_sq_mts')
    .optional()
    .isFloat({ min: 1, max: 50000 })
    .withMessage('Total area must be between 1 and 50,000 square meters'),
  
  body('floors.*.floor_label_name')
    .notEmpty()
    .withMessage('Floor label name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Floor label name must be 1-50 characters'),
  
  body('floors.*.number_of_flats')
    .isInt({ min: 0, max: 100 })
    .withMessage('Number of flats must be between 0 and 100'),
  
  body('floors.*.floor_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Floor notes cannot exceed 1000 characters')
];

// =================== FLAT VALIDATION ===================
const flatValidation = [
  body('flats')
    .isArray({ min: 1 })
    .withMessage('At least one flat is required'),
  
  body('flats.*.flat_number')
    .notEmpty()
    .withMessage('Flat number is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Flat number must be 1-20 characters'),
  
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
    .isIn(['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'])
    .withMessage('Invalid direction'),
  
  body('flats.*.occupancy_status')
    .optional()
    .isIn(['occupied', 'vacant', 'under_renovation', 'locked'])
    .withMessage('Invalid occupancy status'),
  
  body('flats.*.flat_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Flat notes cannot exceed 1000 characters')
];

// =================== FLAT COMBINED RATINGS VALIDATION (Main Rating System) ===================
const flatCombinedRatingsValidation = [
  // =================== STRUCTURAL RATINGS ===================
  // Beams
  body('structural_rating.beams.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Beams rating must be between 1 and 5'),
  
  body('structural_rating.beams.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Beams condition comment cannot exceed 1000 characters'),
  
  body('structural_rating.beams.photos')
    .optional()
    .isArray()
    .withMessage('Beams photos must be an array'),
  
  body('structural_rating.beams.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Beams inspector notes cannot exceed 2000 characters'),

  // Columns
  body('structural_rating.columns.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Columns rating must be between 1 and 5'),
  
  body('structural_rating.columns.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Columns condition comment cannot exceed 1000 characters'),
  
  body('structural_rating.columns.photos')
    .optional()
    .isArray()
    .withMessage('Columns photos must be an array'),
  
  body('structural_rating.columns.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Columns inspector notes cannot exceed 2000 characters'),

  // Slab
  body('structural_rating.slab.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Slab rating must be between 1 and 5'),
  
  body('structural_rating.slab.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Slab condition comment cannot exceed 1000 characters'),
  
  body('structural_rating.slab.photos')
    .optional()
    .isArray()
    .withMessage('Slab photos must be an array'),
  
  body('structural_rating.slab.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Slab inspector notes cannot exceed 2000 characters'),

  // Foundation
  body('structural_rating.foundation.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Foundation rating must be between 1 and 5'),
  
  body('structural_rating.foundation.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Foundation condition comment cannot exceed 1000 characters'),
  
  body('structural_rating.foundation.photos')
    .optional()
    .isArray()
    .withMessage('Foundation photos must be an array'),
  
  body('structural_rating.foundation.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Foundation inspector notes cannot exceed 2000 characters'),

  // =================== NON-STRUCTURAL RATINGS ===================
  // Brick & Plaster
  body('non_structural_rating.brick_plaster.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Brick & Plaster rating must be between 1 and 5'),
  
  body('non_structural_rating.brick_plaster.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Brick & Plaster condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.brick_plaster.photos')
    .optional()
    .isArray()
    .withMessage('Brick & Plaster photos must be an array'),

  body('non_structural_rating.brick_plaster.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Brick & Plaster inspector notes cannot exceed 2000 characters'),

  // Doors & Windows
  body('non_structural_rating.doors_windows.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Doors & Windows rating must be between 1 and 5'),
  
  body('non_structural_rating.doors_windows.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Doors & Windows condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.doors_windows.photos')
    .optional()
    .isArray()
    .withMessage('Doors & Windows photos must be an array'),

  body('non_structural_rating.doors_windows.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Doors & Windows inspector notes cannot exceed 2000 characters'),

  // Flooring & Tiles
  body('non_structural_rating.flooring_tiles.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Flooring & Tiles rating must be between 1 and 5'),
  
  body('non_structural_rating.flooring_tiles.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Flooring & Tiles condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.flooring_tiles.photos')
    .optional()
    .isArray()
    .withMessage('Flooring & Tiles photos must be an array'),

  body('non_structural_rating.flooring_tiles.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Flooring & Tiles inspector notes cannot exceed 2000 characters'),

  // Electrical Wiring
  body('non_structural_rating.electrical_wiring.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical Wiring rating must be between 1 and 5'),
  
  body('non_structural_rating.electrical_wiring.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Electrical Wiring condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.electrical_wiring.photos')
    .optional()
    .isArray()
    .withMessage('Electrical Wiring photos must be an array'),

  body('non_structural_rating.electrical_wiring.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Electrical Wiring inspector notes cannot exceed 2000 characters'),

  // Sanitary Fittings
  body('non_structural_rating.sanitary_fittings.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Sanitary Fittings rating must be between 1 and 5'),
  
  body('non_structural_rating.sanitary_fittings.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Sanitary Fittings condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.sanitary_fittings.photos')
    .optional()
    .isArray()
    .withMessage('Sanitary Fittings photos must be an array'),

  body('non_structural_rating.sanitary_fittings.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Sanitary Fittings inspector notes cannot exceed 2000 characters'),

  // Railings
  body('non_structural_rating.railings.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Railings rating must be between 1 and 5'),
  
  body('non_structural_rating.railings.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Railings condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.railings.photos')
    .optional()
    .isArray()
    .withMessage('Railings photos must be an array'),

  body('non_structural_rating.railings.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Railings inspector notes cannot exceed 2000 characters'),

  // Water Tanks
  body('non_structural_rating.water_tanks.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Water Tanks rating must be between 1 and 5'),
  
  body('non_structural_rating.water_tanks.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Water Tanks condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.water_tanks.photos')
    .optional()
    .isArray()
    .withMessage('Water Tanks photos must be an array'),

  body('non_structural_rating.water_tanks.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Water Tanks inspector notes cannot exceed 2000 characters'),

  // Plumbing
  body('non_structural_rating.plumbing.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Plumbing rating must be between 1 and 5'),
  
  body('non_structural_rating.plumbing.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Plumbing condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.plumbing.photos')
    .optional()
    .isArray()
    .withMessage('Plumbing photos must be an array'),

  body('non_structural_rating.plumbing.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Plumbing inspector notes cannot exceed 2000 characters'),

  // Sewage System
  body('non_structural_rating.sewage_system.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Sewage System rating must be between 1 and 5'),
  
  body('non_structural_rating.sewage_system.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Sewage System condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.sewage_system.photos')
    .optional()
    .isArray()
    .withMessage('Sewage System photos must be an array'),

  body('non_structural_rating.sewage_system.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Sewage System inspector notes cannot exceed 2000 characters'),

  // Panel Board
  body('non_structural_rating.panel_board.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Panel Board rating must be between 1 and 5'),
  
  body('non_structural_rating.panel_board.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Panel Board condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.panel_board.photos')
    .optional()
    .isArray()
    .withMessage('Panel Board photos must be an array'),

  body('non_structural_rating.panel_board.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Panel Board inspector notes cannot exceed 2000 characters'),

  // Lifts
  body('non_structural_rating.lifts.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Lifts rating must be between 1 and 5'),
  
  body('non_structural_rating.lifts.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Lifts condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.lifts.photos')
    .optional()
    .isArray()
    .withMessage('Lifts photos must be an array'),

  body('non_structural_rating.lifts.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Lifts inspector notes cannot exceed 2000 characters'),

  // =================== CUSTOM VALIDATION RULES ===================
  
  // Ensure at least one rating type is provided
  body().custom((requestBody) => {
    const hasStructural = requestBody.structural_rating && 
      Object.keys(requestBody.structural_rating).some(key => 
        requestBody.structural_rating[key]?.rating
      );
    
    const hasNonStructural = requestBody.non_structural_rating && 
      Object.keys(requestBody.non_structural_rating).some(key => 
        requestBody.non_structural_rating[key]?.rating
      );
    
    if (!hasStructural && !hasNonStructural) {
      throw new Error('At least one structural or non-structural rating must be provided');
    }
    
    return true;
  }),

  // Validate photo and comment requirements for low ratings
  body().custom((requestBody) => {
    const errors = [];
    
    // Check structural ratings
    if (requestBody.structural_rating) {
      const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
      
      structuralComponents.forEach(component => {
        const rating = requestBody.structural_rating[component];
        if (rating && rating.rating && rating.rating < 3) {
          if (!rating.photos || rating.photos.length === 0) {
            errors.push(`Photos are required for ${component} when rating is below 3`);
          }
          if (!rating.condition_comment || rating.condition_comment.trim() === '') {
            errors.push(`Condition comment is required for ${component} when rating is below 3`);
          }
        }
      });
    }
    
    // Check non-structural ratings
    if (requestBody.non_structural_rating) {
      const nonStructuralComponents = [
        'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
        'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
        'sewage_system', 'panel_board', 'lifts'
      ];
      
      nonStructuralComponents.forEach(component => {
        const rating = requestBody.non_structural_rating[component];
        if (rating && rating.rating && rating.rating < 3) {
          if (!rating.photos || rating.photos.length === 0) {
            const componentName = component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            errors.push(`Photos are required for ${componentName} when rating is below 3`);
          }
          if (!rating.condition_comment || rating.condition_comment.trim() === '') {
            const componentName = component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            errors.push(`Condition comment is required for ${componentName} when rating is below 3`);
          }
        }
      });
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  })
];

// =================== BULK RATINGS VALIDATION ===================
const bulkRatingsValidation = [
  // Validate floors array exists and is not empty
  body('floors')
    .isArray({ min: 1 })
    .withMessage('Floors array is required and must contain at least one floor'),

  // Validate each floor
  body('floors.*.floor_number')
    .notEmpty()
    .withMessage('Floor number is required')
    .isInt({ min: 0, max: 200 })
    .withMessage('Floor number must be between 0 and 200'),

  body('floors.*.flats')
    .isArray({ min: 1 })
    .withMessage('Each floor must contain at least one flat'),

  // Validate each flat
  body('floors.*.flats.*.flat_number')
    .notEmpty()
    .withMessage('Flat number is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Flat number must be 1-20 characters'),

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

  // Optional non-structural ratings validation (basic check for all 11 components)
  ...['brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'].map(component =>
    body(`floors.*.flats.*.non_structural_rating.${component}.rating`)
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage(`${component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} rating must be between 1 and 5`)
  ),

  // Validate condition comments length
  body('floors.*.flats.*.structural_rating.*.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Structural rating condition comments cannot exceed 1000 characters'),

  body('floors.*.flats.*.non_structural_rating.*.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Non-structural rating condition comments cannot exceed 1000 characters'),

  // Validate photos arrays
  body('floors.*.flats.*.structural_rating.*.photos')
    .optional()
    .isArray()
    .withMessage('Structural rating photos must be an array'),

  body('floors.*.flats.*.non_structural_rating.*.photos')
    .optional()
    .isArray()
    .withMessage('Non-structural rating photos must be an array'),

  body('floors.*.flats.*.structural_rating.*.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Structural rating inspector notes cannot exceed 2000 characters'),

  body('floors.*.flats.*.non_structural_rating.*.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Non-structural rating inspector notes cannot exceed 2000 characters'),

  // Custom validation to ensure at least one rating is provided per flat
  body().custom((requestBody) => {
    const errors = [];
    
    if (requestBody.floors && Array.isArray(requestBody.floors)) {
      requestBody.floors.forEach((floor, floorIndex) => {
        if (floor.flats && Array.isArray(floor.flats)) {
          floor.flats.forEach((flat, flatIndex) => {
            const hasStructural = flat.structural_rating && 
              Object.keys(flat.structural_rating).some(key => 
                flat.structural_rating[key]?.rating
              );
            
            const hasNonStructural = flat.non_structural_rating && 
              Object.keys(flat.non_structural_rating).some(key => 
                flat.non_structural_rating[key]?.rating
              );
            
            if (!hasStructural && !hasNonStructural) {
              errors.push(
                `Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1}: ` +
                `At least one structural or non-structural rating must be provided`
              );
            }
          });
        }
      });
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  })
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

// =================== PARAMETER VALIDATIONS ===================
const parameterValidations = {
  structureId: param('id')
    .isMongoId()
    .withMessage('Invalid structure ID format'),
    
  floorId: param('floorId')
    .notEmpty()
    .withMessage('Floor ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Floor ID must be 1-50 characters'),
    
  flatId: param('flatId')
    .notEmpty()
    .withMessage('Flat ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Flat ID must be 1-50 characters')
};

// =================== QUERY VALIDATIONS ===================
const queryValidations = {
  locationStats: [
    query('state_code')
      .notEmpty()
      .withMessage('State code is required')
      .matches(/^[A-Z]{2}$/)
      .withMessage('State code must be 2 uppercase letters'),
    
    query('district_code')
      .notEmpty()
      .withMessage('District code is required')
      .matches(/^[0-9]{1,2}$/)
      .withMessage('District code must be numeric'),
    
    query('city_name')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('City name must be 1-50 characters'),
    
    query('location_code')
      .optional()
      .isLength({ min: 1, max: 10 })
      .withMessage('Location code must be 1-10 characters')
  ]
};

// =================== EXPORTS ===================
module.exports = {
  // Basic Screen Validations
  locationValidation,
  administrativeValidation,
  geometricDetailsValidation,
  
  // Floors & Flats
  floorValidation,
  flatValidation,
  
  // ONLY Flat-Level Ratings (NO overall ratings)
  flatCombinedRatingsValidation,        // Main rating system
  
  // Bulk Operations
  bulkRatingsValidation,
  
  // Utilities
  structureNumberValidation,
  parameterValidations,
  queryValidations
};