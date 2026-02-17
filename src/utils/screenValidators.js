const { body, query, param } = require('express-validator');


const multiComponentRatingValidation = [
  body('structures')
    .isArray({ min: 1 })
    .withMessage('Structures array must contain at least one component type'),

  body('structures.*.component_type')
    .notEmpty()
    .withMessage('Component type is required')
    .isString()
    .isIn([
      // Structural components (RCC)
      'beams', 'columns', 'slab', 'foundation', 'roof_truss',
      // Structural components (Steel) - NEW
      'connections', 'bracings', 'purlins', 'channels', 'steel_flooring',
      // Non-structural components (residential/commercial)
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts',
      // Non-structural components (industrial - RCC)
      'walls_cladding', 'industrial_flooring', 'ventilation',
      'overhead_cranes', 'loading_docks',
      // Non-structural components (industrial - Steel) - NEW
      'cladding_partition_panels', 'roof_sheeting', 'chequered_plate',
      'panel_board_transformer', 'lift',
      // Floor-level components
      'walls', 'flooring', 'electrical_system', 'fire_safety', 'drainage'
    ])
    .withMessage('Invalid component type'),

  body('structures.*.components')
    .isArray({ min: 1 })
    .withMessage('Components array must contain at least one component instance'),

  body('structures.*.components.*._id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Component ID must be 1-100 characters if provided'),

  body('structures.*.components.*.name')
    .notEmpty()
    .withMessage('Component name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Component name must be 1-200 characters'),

  body('structures.*.components.*.rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('structures.*.components.*.photo')
    .optional()
    .isString()
    .custom((value) => {
      if (!value || value.trim() === '') return false;
      const extRegex = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
      return value.startsWith('data:image/') || 
             value.startsWith('blob:') || 
             value.includes('/uploads/') || 
             /^https?:\/\/.+/i.test(value) ||
             extRegex.test(value);
    })
    .withMessage('Invalid photo format. Must be a valid image URL or data URI'),

  body('structures.*.components.*.photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array'),

  body('structures.*.components.*.photos.*')
    .optional()
    .isString()
    .custom((value) => {
      if (!value || value.trim() === '') return false;
      const extRegex = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
      return value.startsWith('data:image/') ||
             value.startsWith('blob:') ||
             value.includes('/uploads/') ||
             /^https?:\/\/.+/i.test(value) ||
             extRegex.test(value);
    })
    .withMessage('Invalid photo format in photos array. Must be a valid image URL or data URI'),

  body('structures.*.components.*.condition_comment')
    .notEmpty()
    .withMessage('Condition comment is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Condition comment must be 1-1000 characters'),

  body('structures.*.components.*.inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Inspector notes cannot exceed 2000 characters'),

  // NEW: Distress dimensions validation
  body('structures.*.components.*.distress_dimensions.length')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Distress length must be between 0 and 10000'),
  
  body('structures.*.components.*.distress_dimensions.breadth')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Distress breadth must be between 0 and 10000'),
  
  body('structures.*.components.*.distress_dimensions.height')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Distress height must be between 0 and 10000'),
  
  body('structures.*.components.*.distress_dimensions.unit')
    .optional()
    .isIn(['mm', 'cm', 'm', 'inch', 'feet'])
    .withMessage('Unit must be one of: mm, cm, m, inch, feet'),

  // NEW: Repair methodology validation - MUST BE STRING, not boolean
  body('structures.*.components.*.repair_methodology')
    .optional()
    .custom((value) => {
      if (typeof value === 'boolean') {
        throw new Error('Repair methodology must be a string, not a boolean');
      }
      if (typeof value !== 'string') {
        throw new Error('Repair methodology must be a string value');
      }
      return true;
    })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Repair methodology cannot exceed 2000 characters'),

  // NEW: Distress types validation
  body('structures.*.components.*.distress_types')
    .optional()
    .isArray()
    .withMessage('Distress types must be an array'),
  
  body('structures.*.components.*.distress_types.*')
    .if(body('structures.*.components.*.distress_types').exists())
    .isIn(['physical', 'chemical', 'mechanical'])
    .withMessage('Distress type must be one of: physical, chemical, mechanical'),

  // NEW: PDF files validation
  body('structures.*.components.*.pdf_files')
    .optional()
    .isArray()
    .withMessage('PDF files must be an array'),
  
  body('structures.*.components.*.pdf_files.*.filename')
    .if(body('structures.*.components.*.pdf_files').exists())
    .notEmpty()
    .withMessage('PDF filename is required'),
  
  body('structures.*.components.*.pdf_files.*.file_path')
    .if(body('structures.*.components.*.pdf_files').exists())
    .notEmpty()
    .withMessage('PDF file path is required'),

  // Custom validation: photo required for ratings 1-5; extra details required for ratings 1-3
  body().custom((requestBody) => {
    const errors = [];
    
    if (requestBody.structures && Array.isArray(requestBody.structures)) {
      requestBody.structures.forEach((structure, structureIndex) => {
        if (structure.components && Array.isArray(structure.components)) {
          structure.components.forEach((component, index) => {
            const parsedRating = Number(component.rating);
            const hasValidRating = !Number.isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5;

            if (hasValidRating) {
              // Check for photo for all valid ratings
              const hasPhotoString = component.photo && typeof component.photo === 'string' && component.photo.trim() !== '';
              const hasPhotosArray = Array.isArray(component.photos) && component.photos.length > 0;
              if (!hasPhotoString && !hasPhotosArray) {
                errors.push(`${structure.component_type} - Component ${index + 1} (${component.name || 'unnamed'}): At least one photo is required for ratings 1-5`);
              }
            }

            if (hasValidRating && parsedRating <= 3) {
              // Check for detailed comment
              if (!component.condition_comment || component.condition_comment.trim().length < 10) {
                errors.push(`${structure.component_type} - Component ${index + 1} (${component.name || 'unnamed'}): Detailed condition comment (min 10 chars) is required for ratings 1-3`);
              }
              
              // NEW: Check for distress dimensions for poor ratings
              if (!component.distress_dimensions || 
                  (!component.distress_dimensions.length && 
                   !component.distress_dimensions.breadth && 
                   !component.distress_dimensions.height)) {
                errors.push(`${structure.component_type} - Component ${index + 1} (${component.name || 'unnamed'}): Distress dimensions (L, B, or H) are required for ratings 1-3`);
              }
              
              // NEW: Check for repair methodology
              if (!component.repair_methodology || typeof component.repair_methodology !== 'string' || component.repair_methodology.trim().length < 10) {
                errors.push(`${structure.component_type} - Component ${index + 1} (${component.name || 'unnamed'}): Repair methodology must be a non-empty string (min 10 chars) for ratings 1-3`);
              }
              
              // NEW: Check for distress types
              if (!component.distress_types || component.distress_types.length === 0) {
                errors.push(`${structure.component_type} - Component ${index + 1} (${component.name || 'unnamed'}): At least one distress type (physical/chemical/mechanical) is required for ratings 1-3`);
              }
            }
          });
        }
      });
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(' | '));
    }
    
    return true;
  })
];
// =================== SINGLE COMPONENT TYPE VALIDATION (Legacy) ===================
const componentRatingValidation = [
  body('component_type')
    .notEmpty()
    .withMessage('Component type is required')
    .isString()
    .isIn([
      'beams', 'columns', 'slab', 'foundation', 'roof_truss',
      'connections', 'bracings', 'purlins', 'channels', 'steel_flooring',
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts',
      'walls_cladding', 'industrial_flooring', 'ventilation',
      'overhead_cranes', 'loading_docks',
      'cladding_partition_panels', 'roof_sheeting', 'chequered_plate',
      'panel_board_transformer', 'lift',
      'walls', 'flooring', 'electrical_system', 'fire_safety', 'drainage'
    ])
    .withMessage('Invalid component type'),

  body('components')
    .isArray({ min: 1 })
    .withMessage('Components array must contain at least one component'),

  body('components.*._id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Component ID must be 1-100 characters if provided'),

  body('components.*.name')
    .notEmpty()
    .withMessage('Component name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Component name must be 1-200 characters'),

  body('components.*.rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('components.*.condition_comment')
    .notEmpty()
    .withMessage('Condition comment is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Condition comment must be 1-1000 characters')
];

// =================== COMPONENT UPDATE VALIDATION ===================
const componentUpdateValidation = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Component name must be 1-200 characters'),

  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Condition comment cannot exceed 1000 characters'),

  body('inspector_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Inspector notes cannot exceed 2000 characters'),
  
  body('distress_dimensions')
    .optional()
    .isObject()
    .withMessage('Distress dimensions must be an object'),
  
  body('repair_methodology')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Repair methodology cannot exceed 2000 characters'),
  
  body('distress_types')
    .optional()
    .isArray()
    .withMessage('Distress types must be an array')
];

// =================== LOCATION VALIDATION (Screen 1) ===================
const locationValidation = [
  body('structure_name')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Structure name cannot exceed 200 characters'),

  body('zip_code')
    .notEmpty()
    .withMessage('Zip code is required')
    .matches(/^[0-9]{6}$/)
    .withMessage('Zip code must be exactly 6 digits'),

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

  // NEW: Structure subtype validation (RCC or Steel)
  body('structure_subtype')
    .notEmpty()
    .withMessage('Structure subtype is required')
    .isIn(['rcc', 'steel'])
    .withMessage('Structure subtype must be either: rcc or steel'),

  // NEW: Age of structure validation
  body('age_of_structure')
    .notEmpty()
    .withMessage('Age of structure is required')
    .isInt({ min: 0, max: 100 })
    .withMessage('Age of structure must be between 0 and 100 years'),

  body('commercial_subtype')
    .custom((value, { req }) => {
      if (req.body.type_of_structure === 'commercial') {
        if (!value) {
          throw new Error('Commercial subtype is required for commercial structures');
        }
        if (!['only_commercial', 'commercial_residential'].includes(value)) {
          throw new Error('Invalid commercial subtype. Must be either: only_commercial or commercial_residential');
        }
      }
      return true;
    }),

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
  
  // Parking floors validation
  body('has_parking_floors')
    .optional()
    .isBoolean()
    .withMessage('Has parking floors must be a boolean'),
  
  body('number_of_parking_floors')
    .optional()
    .custom((value, { req }) => {
      if (req.body.has_parking_floors === true || req.body.has_parking_floors === 'true') {
        if (!value || parseInt(value) < 1) {
          throw new Error('Number of parking floors must be at least 1 when parking floors are enabled');
        }
        if (parseInt(value) > 10) {
          throw new Error('Number of parking floors cannot exceed 10');
        }
      }
      return true;
    }),

  body('parking_floor_type')
    .optional()
    .custom((value, { req }) => {
      const allowed = ['stilt', 'cellar', 'subcellar_1', 'subcellar_2', 'subcellar_3', 'subcellar_4', 'subcellar_5'];
      if (req.body.has_parking_floors === true || req.body.has_parking_floors === 'true') {
        if (!value) {
          throw new Error('parking_floor_type is required when has_parking_floors is true');
        }
        if (typeof value !== 'string' || !allowed.includes(value)) {
          throw new Error('Invalid parking_floor_type. Must be one of: ' + allowed.join(', '));
        }
      }
      return true;
    }),
  
  body('structure_width')
    .notEmpty()
    .withMessage('Structure width is required')
    .isFloat({ min: 5, max: 1000 })
    .withMessage('Structure width must be between 5 and 1000 meters'),
  
  body('structure_length')
    .notEmpty()
    .withMessage('Structure length is required')
    .isFloat({ min: 5, max: 1000 })
    .withMessage('Structure length must be between 5 and 1000 meters'),
  
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

// =================== INDUSTRIAL BLOCKS VALIDATION ===================
const blockValidation = [
  body('blocks')
    .isArray({ min: 1 })
    .withMessage('Blocks array must contain at least one block'),
  
  body('blocks.*.block_number')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Block number must be 1-20 characters'),
  
  body('blocks.*.block_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Block name must be 1-100 characters'),
  
  body('blocks.*.block_type')
    .optional()
    .isIn(['manufacturing', 'warehouse', 'storage', 'office', 'utility', 'mixed'])
    .withMessage('Invalid block type'),
  
  body('blocks.*.area_sq_mts')
    .optional()
    .isFloat({ min: 1, max: 100000 })
    .withMessage('Area must be between 1 and 100,000 square meters'),
  
  body('blocks.*.block_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Block notes cannot exceed 1000 characters')
];

// =================== FLOOR VALIDATION ===================
const floorValidation = [
  
  
  body('floors.*.floor_number')
    .isInt({ min: 0, max: 200 })
    .withMessage('Floor number must be between 0 and 200 (0 for basement/parking)'),

  
  body('floors.*.is_parking_floor')
    .optional()
    .isBoolean()
    .withMessage('Is parking floor must be a boolean'),

  
  body('floors.*.floor_height')
    .optional()
    .isFloat({ min: 2, max: 100000 })
    .withMessage('Floor height must be between 2 and 100,000 meters'),
  
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
  
  body('floors.*.number_of_blocks')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Number of blocks must be between 0 and 50'),
  
  body('floors.*.floor_notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Floor notes cannot exceed 1000 characters')
];

// =================== FLAT VALIDATION ===================
const flatValidation = [
  
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

const blockRatingsValidation = [
  // =================== STRUCTURAL RATINGS FOR INDUSTRIAL ===================
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
  
  // Roof Truss (Industrial specific)
  body('structural_rating.roof_truss.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Roof truss rating must be between 1 and 5'),
  
  body('structural_rating.roof_truss.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Roof truss condition comment cannot exceed 1000 characters'),
  
  body('structural_rating.roof_truss.photos')
    .optional()
    .isArray()
    .withMessage('Roof truss photos must be an array'),

  // =================== NON-STRUCTURAL RATINGS FOR INDUSTRIAL ===================
  // Walls & Cladding
  body('non_structural_rating.walls_cladding.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Walls & Cladding rating must be between 1 and 5'),
  
  body('non_structural_rating.walls_cladding.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Walls & Cladding condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.walls_cladding.photos')
    .optional()
    .isArray()
    .withMessage('Walls & Cladding photos must be an array'),
  
  // Industrial Flooring
  body('non_structural_rating.industrial_flooring.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Industrial Flooring rating must be between 1 and 5'),
  
  body('non_structural_rating.industrial_flooring.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Industrial Flooring condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.industrial_flooring.photos')
    .optional()
    .isArray()
    .withMessage('Industrial Flooring photos must be an array'),
  
  // Ventilation
  body('non_structural_rating.ventilation.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Ventilation rating must be between 1 and 5'),
  
  body('non_structural_rating.ventilation.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Ventilation condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.ventilation.photos')
    .optional()
    .isArray()
    .withMessage('Ventilation photos must be an array'),
  
  // Electrical System
  body('non_structural_rating.electrical_system.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical System rating must be between 1 and 5'),
  
  body('non_structural_rating.electrical_system.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Electrical System condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.electrical_system.photos')
    .optional()
    .isArray()
    .withMessage('Electrical System photos must be an array'),
  
  // Fire Safety
  body('non_structural_rating.fire_safety.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Fire Safety rating must be between 1 and 5'),
  
  body('non_structural_rating.fire_safety.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Fire Safety condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.fire_safety.photos')
    .optional()
    .isArray()
    .withMessage('Fire Safety photos must be an array'),
  
  // Drainage
  body('non_structural_rating.drainage.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Drainage rating must be between 1 and 5'),
  
  body('non_structural_rating.drainage.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Drainage condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.drainage.photos')
    .optional()
    .isArray()
    .withMessage('Drainage photos must be an array'),
  
  // Overhead Cranes
  body('non_structural_rating.overhead_cranes.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Overhead Cranes rating must be between 1 and 5'),
  
  body('non_structural_rating.overhead_cranes.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Overhead Cranes condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.overhead_cranes.photos')
    .optional()
    .isArray()
    .withMessage('Overhead Cranes photos must be an array'),
  
  // Loading Docks
  body('non_structural_rating.loading_docks.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Loading Docks rating must be between 1 and 5'),
  
  body('non_structural_rating.loading_docks.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Loading Docks condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.loading_docks.photos')
    .optional()
    .isArray()
    .withMessage('Loading Docks photos must be an array'),

  // Custom validation to ensure at least one rating type is provided
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

  // Validate photo requirement for ratings 1-5 and comment requirement for ratings 1-3
  body().custom((requestBody) => {
    const errors = [];
    
    // Check structural ratings
    if (requestBody.structural_rating) {
      const structuralComponents = ['beams', 'columns', 'slab', 'foundation', 'roof_truss'];
      
      structuralComponents.forEach(component => {
        const rating = requestBody.structural_rating[component];
        if (rating && rating.rating && rating.rating >= 1 && rating.rating <= 5) {
          if (!rating.photos || rating.photos.length === 0) {
            errors.push(`Photos are required for ${component} when rating is 1-5`);
          }
        }
        if (rating && rating.rating && rating.rating <= 3) {
          if (!rating.condition_comment || rating.condition_comment.trim() === '') {
            errors.push(`Condition comment is required for ${component} when rating is 1-3`);
          }
        }
      });
    }
    
    // Check non-structural ratings
    if (requestBody.non_structural_rating) {
      const nonStructuralComponents = [
        'walls_cladding', 'industrial_flooring', 'ventilation', 'electrical_system',
        'fire_safety', 'drainage', 'overhead_cranes', 'loading_docks'
      ];
      
      nonStructuralComponents.forEach(component => {
        const rating = requestBody.non_structural_rating[component];
        if (rating && rating.rating && rating.rating >= 1 && rating.rating <= 5) {
          if (!rating.photos || rating.photos.length === 0) {
            const componentName = component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            errors.push(`Photos are required for ${componentName} when rating is 1-5`);
          }
        }
        if (rating && rating.rating && rating.rating <= 3) {
          if (!rating.condition_comment || rating.condition_comment.trim() === '') {
            const componentName = component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            errors.push(`Condition comment is required for ${componentName} when rating is 1-3`);
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

// =================== FLAT COMBINED RATINGS VALIDATION (Main Rating System) ===================
const flatCombinedRatingsValidation = [
  // =================== STRUCTURAL RATINGS ===================
  
  // Beams
  body('structural_rating.beams.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Beams component ID must be 1-100 characters'),
  
  body('structural_rating.beams.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Beams component name must be 1-100 characters'),
  
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
  body('structural_rating.columns.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Columns component ID must be 1-100 characters'),
  
  body('structural_rating.columns.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Columns component name must be 1-100 characters'),
  
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
  body('structural_rating.slab.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Slab component ID must be 1-100 characters'),
  
  body('structural_rating.slab.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Slab component name must be 1-100 characters'),
  
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
  body('structural_rating.foundation.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Foundation component ID must be 1-100 characters'),
  
  body('structural_rating.foundation.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Foundation component name must be 1-100 characters'),
  
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
  body('non_structural_rating.brick_plaster.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brick & Plaster component ID must be 1-100 characters'),
  
  body('non_structural_rating.brick_plaster.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brick & Plaster component name must be 1-100 characters'),
  
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
  body('non_structural_rating.doors_windows.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Doors & Windows component ID must be 1-100 characters'),
  
  body('non_structural_rating.doors_windows.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Doors & Windows component name must be 1-100 characters'),
  
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
  body('non_structural_rating.flooring_tiles.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Flooring & Tiles component ID must be 1-100 characters'),
  
  body('non_structural_rating.flooring_tiles.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Flooring & Tiles component name must be 1-100 characters'),
  
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
  body('non_structural_rating.electrical_wiring.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Electrical Wiring component ID must be 1-100 characters'),
  
  body('non_structural_rating.electrical_wiring.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Electrical Wiring component name must be 1-100 characters'),
  
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
  body('non_structural_rating.sanitary_fittings.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Sanitary Fittings component ID must be 1-100 characters'),
  
  body('non_structural_rating.sanitary_fittings.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Sanitary Fittings component name must be 1-100 characters'),
  
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
  body('non_structural_rating.railings.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Railings component ID must be 1-100 characters'),
  
  body('non_structural_rating.railings.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Railings component name must be 1-100 characters'),
  
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
  body('non_structural_rating.water_tanks.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Water Tanks component ID must be 1-100 characters'),
  
  body('non_structural_rating.water_tanks.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Water Tanks component name must be 1-100 characters'),
  
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
  body('non_structural_rating.plumbing.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Plumbing component ID must be 1-100 characters'),
  
  body('non_structural_rating.plumbing.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Plumbing component name must be 1-100 characters'),
  
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
  body('non_structural_rating.sewage_system.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Sewage System component ID must be 1-100 characters'),
  
  body('non_structural_rating.sewage_system.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Sewage System component name must be 1-100 characters'),
  
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
  body('non_structural_rating.panel_board.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Panel Board component ID must be 1-100 characters'),
  
  body('non_structural_rating.panel_board.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Panel Board component name must be 1-100 characters'),
  
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
  body('non_structural_rating.lifts.component_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Lifts component ID must be 1-100 characters'),
  
  body('non_structural_rating.lifts.component_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Lifts component name must be 1-100 characters'),
  
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

  // Validate photo requirement for ratings 1-5 and comment requirement for ratings 1-3
  body().custom((requestBody) => {
    const errors = [];
    
    // Check structural ratings
    if (requestBody.structural_rating) {
      const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
      
      structuralComponents.forEach(component => {
        const rating = requestBody.structural_rating[component];
        if (rating && rating.rating && rating.rating >= 1 && rating.rating <= 5) {
          if (!rating.photos || rating.photos.length === 0) {
            errors.push(`Photos are required for ${component} when rating is 1-5`);
          }
        }
        if (rating && rating.rating && rating.rating <= 3) {
          if (!rating.condition_comment || rating.condition_comment.trim() === '') {
            errors.push(`Condition comment is required for ${component} when rating is 1-3`);
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
        if (rating && rating.rating && rating.rating >= 1 && rating.rating <= 5) {
          if (!rating.photos || rating.photos.length === 0) {
            const componentName = component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            errors.push(`Photos are required for ${componentName} when rating is 1-5`);
          }
        }
        if (rating && rating.rating && rating.rating <= 3) {
          if (!rating.condition_comment || rating.condition_comment.trim() === '') {
            const componentName = component.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            errors.push(`Condition comment is required for ${componentName} when rating is 1-3`);
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
// =================== PARAMETER VALIDATIONS ===================
const parameterValidations = {
  structureId: param('id')
    .notEmpty()
    .withMessage('Structure ID is required')
    .isMongoId()
    .withMessage('Invalid structure ID format'),
  
  floorId: param('floorId')
    .notEmpty()
    .withMessage('Floor ID is required')
    .isString()
    .withMessage('Invalid floor ID format'),
  
  flatId: param('flatId')
    .notEmpty()
    .withMessage('Flat ID is required')
    .isString()
    .withMessage('Invalid flat ID format'),
  
  blockId: param('blockId')
    .notEmpty()
    .withMessage('Block ID is required')
    .isString()
    .withMessage('Invalid block ID format'),
  
  componentId: param('componentId')
    .notEmpty()
    .withMessage('Component ID is required')
    .isString()
    .withMessage('Invalid component ID format'),
  
  componentType: param('type')
    .notEmpty()
    .withMessage('Component type is required')
    .isString()
    .isIn([
      'beams', 'columns', 'slab', 'foundation', 'roof_truss',
      'connections', 'bracings', 'purlins', 'channels', 'steel_flooring',
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts',
      'walls_cladding', 'industrial_flooring', 'ventilation',
      'overhead_cranes', 'loading_docks',
      'cladding_partition_panels', 'roof_sheeting', 'chequered_plate',
      'panel_board_transformer', 'lift',
      'walls', 'flooring', 'electrical_system', 'fire_safety', 'drainage'
    ])
    .withMessage('Invalid component type'),
  
  testId: param('testId')
    .notEmpty()
    .withMessage('Test ID is required')
    .isString()
    .withMessage('Invalid test ID format')
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

const distressDimensionsValidation = [
  body('distress_dimensions.length')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Length must be between 0 and 10000'),
  
  body('distress_dimensions.breadth')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Breadth must be between 0 and 10000'),
  
  body('distress_dimensions.height')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Height must be between 0 and 10000'),
  
  body('distress_dimensions.unit')
    .optional()
    .isIn(['mm', 'cm', 'm', 'inch', 'feet'])
    .withMessage('Unit must be one of: mm, cm, m, inch, feet')
];

const pdfFilesValidation = [
  body('pdf_files')
    .optional()
    .isArray()
    .withMessage('PDF files must be an array'),
  
  body('pdf_files.*.filename')
    .if(body('pdf_files').exists())
    .notEmpty()
    .withMessage('PDF filename is required')
    .isString()
    .withMessage('PDF filename must be a string'),
  
  body('pdf_files.*.file_path')
    .if(body('pdf_files').exists())
    .notEmpty()
    .withMessage('PDF file path is required')
    .isString()
    .withMessage('PDF file path must be a string'),
  
  body('pdf_files.*.file_size')
    .optional()
    .isInt({ min: 0 })
    .withMessage('File size must be a positive integer')
];



// =================== FLOOR-LEVEL RATINGS VALIDATION ===================
const floorRatingsValidation = [
  // Structural ratings for floor-level (commercial/industrial)
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

  // Non-structural ratings for floor-level
  body('non_structural_rating.walls.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Walls rating must be between 1 and 5'),
  
  body('non_structural_rating.walls.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Walls condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.walls.photos')
    .optional()
    .isArray()
    .withMessage('Walls photos must be an array'),
  
  body('non_structural_rating.flooring.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Flooring rating must be between 1 and 5'),
  
  body('non_structural_rating.flooring.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Flooring condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.flooring.photos')
    .optional()
    .isArray()
    .withMessage('Flooring photos must be an array'),
  
  body('non_structural_rating.electrical_system.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical system rating must be between 1 and 5'),
  
  body('non_structural_rating.electrical_system.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Electrical system condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.electrical_system.photos')
    .optional()
    .isArray()
    .withMessage('Electrical system photos must be an array'),
  
  body('non_structural_rating.fire_safety.rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Fire safety rating must be between 1 and 5'),
  
  body('non_structural_rating.fire_safety.condition_comment')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Fire safety condition comment cannot exceed 1000 characters'),
  
  body('non_structural_rating.fire_safety.photos')
    .optional()
    .isArray()
    .withMessage('Fire safety photos must be an array'),

  // Custom validation
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
  })
];


const testingRequirementsValidation = [
  body('testing_required')
    .notEmpty()
    .withMessage('Testing required field is required')
    .isBoolean()
    .withMessage('Testing required must be true or false'),
  
  body('selected_tests')
    .if(body('testing_required').equals(true))
    .isArray({ min: 1 })
    .withMessage('At least one test must be selected when testing is required'),
  
  body('selected_tests.*')
    .if(body('testing_required').equals(true))
    .isIn([
      'rebound_hammer',
      'ultra_pulse_velocity',
      'half_cell_potential',
      'carbonation_depth',
      'cover_meter',
      'core_cutting',
      'pull_out',
      'chemical_analysis',
      'ultrasonic_thickness_gauge',
      'magnetic_particle',
      'liquid_penetration',
      'hardness_test'
    ])
    .withMessage('Invalid test type selected')
];


// =================== TEST RESULT VALIDATION ===================
const testResultValidation = [
  body('test_name')
    .notEmpty()
    .withMessage('Test name is required')
    .isIn([
      'rebound_hammer',
      'ultra_pulse_velocity',
      'half_cell_potential',
      'carbonation_depth',
      'cover_meter',
      'core_cutting',
      'pull_out',
      'chemical_analysis',
      'ultrasonic_thickness_gauge',
      'magnetic_particle',
      'liquid_penetration',
      'hardness_test'
    ])
    .withMessage('Invalid test name'),
  
  body('component_type')
    .notEmpty()
    .withMessage('Component type is required')
    .isString()
    .withMessage('Component type must be a string'),
  
  body('component_id')
    .notEmpty()
    .withMessage('Component ID is required')
    .isString()
    .withMessage('Component ID must be a string'),
  
  body('test_date')
    .optional()
    .isISO8601()
    .withMessage('Test date must be a valid date'),
  
  body('test_results')
    .notEmpty()
    .withMessage('Test results are required')
    .isObject()
    .withMessage('Test results must be an object'),
  
  body('tested_by')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tested by name cannot exceed 100 characters'),
  
  body('remarks')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks cannot exceed 1000 characters'),
  
  body('test_report_pdf')
    .optional()
    .isObject()
    .withMessage('Test report PDF must be an object'),
  
  body('test_report_pdf.filename')
    .if(body('test_report_pdf').exists())
    .notEmpty()
    .withMessage('PDF filename is required'),
  
  body('test_report_pdf.file_path')
    .if(body('test_report_pdf').exists())
    .notEmpty()
    .withMessage('PDF file path is required')
];

// =================== TEST FORMAT VALIDATION ===================
const testFormatValidation = [
  body('test_name')
    .notEmpty()
    .withMessage('Test name is required')
    .isIn([
      'rebound_hammer',
      'ultra_pulse_velocity',
      'half_cell_potential',
      'carbonation_depth',
      'cover_meter',
      'core_cutting',
      'pull_out',
      'chemical_analysis',
      'ultrasonic_thickness_gauge',
      'magnetic_particle',
      'liquid_penetration',
      'hardness_test',
      'custom'
    ])
    .withMessage('Invalid test name'),
  
  body('display_name')
    .notEmpty()
    .withMessage('Display name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be 1-100 characters'),
  
  body('format_template')
    .notEmpty()
    .withMessage('Format template is required')
    .isObject()
    .withMessage('Format template must be an object'),
  
  body('field_definitions')
    .isArray({ min: 1 })
    .withMessage('Field definitions must be an array with at least one field'),
  
  body('field_definitions.*.field_name')
    .notEmpty()
    .withMessage('Field name is required')
    .isString()
    .withMessage('Field name must be a string'),
  
  body('field_definitions.*.field_type')
    .notEmpty()
    .withMessage('Field type is required')
    .isIn(['text', 'number', 'date', 'select', 'multiselect', 'file'])
    .withMessage('Invalid field type'),
  
  body('field_definitions.*.field_label')
    .notEmpty()
    .withMessage('Field label is required')
    .isString()
    .withMessage('Field label must be a string'),
  
  body('field_definitions.*.required')
    .optional()
    .isBoolean()
    .withMessage('Required must be a boolean'),
  
  body('field_definitions.*.options')
    .optional()
    .isArray()
    .withMessage('Options must be an array'),
  
  body('is_custom')
    .optional()
    .isBoolean()
    .withMessage('is_custom must be a boolean')
];

const customNonStructuralComponentValidation = [
  body('component_category_name')
    .notEmpty()
    .withMessage('Component category name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Component category name must be 1-100 characters')
    .matches(/^[a-z_]+$/)
    .withMessage('Component category name must be lowercase with underscores only'),
  
  body('display_name')
    .notEmpty()
    .withMessage('Display name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be 1-100 characters'),
  
  body('components')
    .isArray({ min: 1 })
    .withMessage('Components array must contain at least one component instance'),
  
  // Validate each component instance
  body('components.*._id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Component ID must be 1-100 characters if provided'),
  
  body('components.*.name')
    .notEmpty()
    .withMessage('Component name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Component name must be 1-200 characters'),
  
  body('components.*.rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
];



// =================== EXPORTS ===================
module.exports = {
  // Basic Screen Validations
  locationValidation,
  administrativeValidation,
  geometricDetailsValidation,

  componentRatingValidation,
  componentUpdateValidation,
  multiComponentRatingValidation,
  parameterValidations,
  
  // Floors & Flats (for residential/commercial)
  floorValidation,
  flatValidation,
  
  // Industrial Blocks
  blockValidation,
  blockRatingsValidation,
  
  // Flat-Level Ratings (for residential/commercial)
  flatCombinedRatingsValidation,
  
  floorRatingsValidation,
  // Bulk Operations
  bulkRatingsValidation,

  // Testing Validations
  testingRequirementsValidation,
  testResultValidation,
  testFormatValidation,
  
  // Custom Component Validation
  customNonStructuralComponentValidation,
  
  // Distress & Repair Validations
  distressDimensionsValidation,
  pdfFilesValidation,
  
  // Utilities
  structureNumberValidation,
  parameterValidations,
  queryValidations
};
