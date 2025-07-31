const { body, query } = require('express-validator');

// Screen 1: Location (Structure Identification + GPS Coordinates)
const locationValidation = [
  // Zip Code field (new)
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

  // Floor details validation
  body('floors').optional().isArray(),
  body('floors.*.floor_number').optional().isInt({ min: 1 }),
  body('floors.*.floor_type').optional().isIn(['parking', 'residential', 'commercial', 'common_area', 'mixed_use', 'other']),
  body('floors.*.floor_height').optional().isFloat({ min: 0.1, max: 20 }),
  body('floors.*.total_area_sq_mts').optional().isFloat({ min: 0.1 }),
  body('floors.*.number_of_flats').optional().isInt({ min: 1, max: 50 }),
  
  // Flat details validation
  body('floors.*.flats').optional().isArray(),
  body('floors.*.flats.*.flat_number').optional().isString().trim(),
  body('floors.*.flats.*.flat_type').optional().isIn(['1bhk', '2bhk', '3bhk', '4bhk', 'studio', 'duplex', 'penthouse', 'shop', 'office', 'parking_slot']),
  body('floors.*.flats.*.area_sq_mts').optional().isFloat({ min: 1 }),
  body('floors.*.flats.*.direction_facing').optional().isIn(['north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west']),
  body('floors.*.flats.*.occupancy_status').optional().isIn(['occupied', 'vacant', 'under_maintenance'])
];

// Screen 4: Flat-wise Ratings (Structural + Non-Structural for each flat)
const ratingsValidation = [
  // Validate that floors and flats data is provided
  body('floors').notEmpty().withMessage('Floor data is required').isArray(),
  
  body('floors.*.floor_number').notEmpty().withMessage('Floor number is required').isInt({ min: 1 }),
  
  body('floors.*.flats').notEmpty().withMessage('Flat data is required').isArray(),
  
  body('floors.*.flats.*.flat_number').notEmpty().withMessage('Flat number is required').isString().trim(),

  // STRUCTURAL RATINGS VALIDATION for each flat
  body('floors.*.flats.*.structural_rating').notEmpty().withMessage('Structural ratings are required for each flat'),
  
  // Beams rating validation
  body('floors.*.flats.*.structural_rating.beams.rating')
    .notEmpty()
    .withMessage('Beams rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Beams rating must be between 1 and 5'),
  
  body('floors.*.flats.*.structural_rating.beams.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.structural_rating.beams.photos')
    .optional()
    .isArray(),

  // Columns rating validation  
  body('floors.*.flats.*.structural_rating.columns.rating')
    .notEmpty()
    .withMessage('Columns rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Columns rating must be between 1 and 5'),
  
  body('floors.*.flats.*.structural_rating.columns.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.structural_rating.columns.photos')
    .optional()
    .isArray(),

  // Slab rating validation
  body('floors.*.flats.*.structural_rating.slab.rating')
    .notEmpty()
    .withMessage('Slab rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Slab rating must be between 1 and 5'),
  
  body('floors.*.flats.*.structural_rating.slab.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.structural_rating.slab.photos')
    .optional()
    .isArray(),

  // Foundation rating validation
  body('floors.*.flats.*.structural_rating.foundation.rating')
    .notEmpty()
    .withMessage('Foundation rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Foundation rating must be between 1 and 5'),
  
  body('floors.*.flats.*.structural_rating.foundation.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.structural_rating.foundation.photos')
    .optional()
    .isArray(),

  // NON-STRUCTURAL RATINGS VALIDATION for each flat
  body('floors.*.flats.*.non_structural_rating').notEmpty().withMessage('Non-structural ratings are required for each flat'),
  
  // Brick plaster rating validation
  body('floors.*.flats.*.non_structural_rating.brick_plaster.rating')
    .notEmpty()
    .withMessage('Brick plaster rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Brick plaster rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.brick_plaster.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.brick_plaster.photos')
    .optional()
    .isArray(),

  // Doors & Windows rating validation
  body('floors.*.flats.*.non_structural_rating.doors_windows.rating')
    .notEmpty()
    .withMessage('Doors & windows rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Doors & windows rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.doors_windows.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.doors_windows.photos')
    .optional()
    .isArray(),

  // Flooring/Tiles rating validation
  body('floors.*.flats.*.non_structural_rating.flooring_tiles.rating')
    .notEmpty()
    .withMessage('Flooring/tiles rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Flooring/tiles rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.flooring_tiles.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.flooring_tiles.photos')
    .optional()
    .isArray(),

  // Electrical Wiring rating validation
  body('floors.*.flats.*.non_structural_rating.electrical_wiring.rating')
    .notEmpty()
    .withMessage('Electrical wiring rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical wiring rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.electrical_wiring.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.electrical_wiring.photos')
    .optional()
    .isArray(),

  // Sanitary Fittings rating validation
  body('floors.*.flats.*.non_structural_rating.sanitary_fittings.rating')
    .notEmpty()
    .withMessage('Sanitary fittings rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sanitary fittings rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.sanitary_fittings.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.sanitary_fittings.photos')
    .optional()
    .isArray(),

  // Railings rating validation
  body('floors.*.flats.*.non_structural_rating.railings.rating')
    .notEmpty()
    .withMessage('Railings rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Railings rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.railings.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.railings.photos')
    .optional()
    .isArray(),

  // Water Tanks rating validation
  body('floors.*.flats.*.non_structural_rating.water_tanks.rating')
    .notEmpty()
    .withMessage('Water tanks rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Water tanks rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.water_tanks.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.water_tanks.photos')
    .optional()
    .isArray(),

  // Plumbing rating validation
  body('floors.*.flats.*.non_structural_rating.plumbing.rating')
    .notEmpty()
    .withMessage('Plumbing rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Plumbing rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.plumbing.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.plumbing.photos')
    .optional()
    .isArray(),

  // Sewage System rating validation
  body('floors.*.flats.*.non_structural_rating.sewage_system.rating')
    .notEmpty()
    .withMessage('Sewage system rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sewage system rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.sewage_system.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.sewage_system.photos')
    .optional()
    .isArray(),

  // Panel Board rating validation
  body('floors.*.flats.*.non_structural_rating.panel_board.rating')
    .notEmpty()
    .withMessage('Panel board rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Panel board rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.panel_board.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.panel_board.photos')
    .optional()
    .isArray(),

  // Lifts rating validation
  body('floors.*.flats.*.non_structural_rating.lifts.rating')
    .notEmpty()
    .withMessage('Lifts rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Lifts rating must be between 1 and 5'),
  
  body('floors.*.flats.*.non_structural_rating.lifts.condition_comment')
    .optional()
    .isString()
    .trim(),
  
  body('floors.*.flats.*.non_structural_rating.lifts.photos')
    .optional()
    .isArray(),

  // Custom validation for mandatory images when rating < 3
  body().custom((requestBody) => {
    const errors = [];
    
    if (!requestBody.floors || !Array.isArray(requestBody.floors)) {
      return true; // Let other validators handle the basic structure
    }

    requestBody.floors.forEach((floor, floorIndex) => {
      if (!floor.flats || !Array.isArray(floor.flats)) {
        return;
      }

      floor.flats.forEach((flat, flatIndex) => {
        const location = `Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1}`;

        // Check structural ratings for photo requirements
        if (flat.structural_rating) {
          const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
          
          structuralComponents.forEach(component => {
            const rating = flat.structural_rating[component]?.rating;
            const photos = flat.structural_rating[component]?.photos;
            
            if (rating && rating < 3 && (!photos || photos.length === 0)) {
              errors.push(`Photos are mandatory for ${component} in ${location} when rating is below 3`);
            }
          });
        }

        // Check non-structural ratings for photo requirements
        if (flat.non_structural_rating) {
          const nonStructuralComponents = [
            'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
            'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
            'sewage_system', 'panel_board', 'lifts'
          ];
          
          nonStructuralComponents.forEach(component => {
            const rating = flat.non_structural_rating[component]?.rating;
            const photos = flat.non_structural_rating[component]?.photos;
            
            if (rating && rating < 3 && (!photos || photos.length === 0)) {
              const componentName = component.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
              errors.push(`Photos are mandatory for ${componentName} in ${location} when rating is below 3`);
            }
          });
        }
      });
    });
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return true;
  })
];


// Screen 5: Overall Structural Rating Validation
const overallStructuralValidation = [
  body('beams_rating.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Beams rating must be between 1 and 5'),
  
  body('beams_rating.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Beams condition comment must not exceed 500 characters'),
  
  body('columns_rating.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Columns rating must be between 1 and 5'),
  
  body('columns_rating.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Columns condition comment must not exceed 500 characters'),
  
  body('slab_rating.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Slab rating must be between 1 and 5'),
  
  body('slab_rating.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Slab condition comment must not exceed 500 characters'),
  
  body('foundation_rating.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Foundation rating must be between 1 and 5'),
  
  body('foundation_rating.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Foundation condition comment must not exceed 500 characters')
];

// Screen 6: Overall Non-Structural Rating Validation
const overallNonStructuralValidation = [
  // Brick & Plaster
  body('brick_plaster.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Brick & Plaster rating must be between 1 and 5'),
  
  body('brick_plaster.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Brick & Plaster condition comment must not exceed 500 characters'),
  
  // Doors & Windows
  body('doors_windows.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Doors & Windows rating must be between 1 and 5'),
  
  body('doors_windows.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Doors & Windows condition comment must not exceed 500 characters'),
  
  // Flooring & Tiles
  body('flooring_tiles.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Flooring & Tiles rating must be between 1 and 5'),
  
  body('flooring_tiles.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Flooring & Tiles condition comment must not exceed 500 characters'),
  
  // Electrical Wiring
  body('electrical_wiring.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Electrical Wiring rating must be between 1 and 5'),
  
  body('electrical_wiring.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Electrical Wiring condition comment must not exceed 500 characters'),
  
  // Sanitary Fittings
  body('sanitary_fittings.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sanitary Fittings rating must be between 1 and 5'),
  
  body('sanitary_fittings.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Sanitary Fittings condition comment must not exceed 500 characters'),
  
  // Railings
  body('railings.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Railings rating must be between 1 and 5'),
  
  body('railings.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Railings condition comment must not exceed 500 characters'),
  
  // Water Tanks
  body('water_tanks.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Water Tanks rating must be between 1 and 5'),
  
  body('water_tanks.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Water Tanks condition comment must not exceed 500 characters'),
  
  // Plumbing
  body('plumbing.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Plumbing rating must be between 1 and 5'),
  
  body('plumbing.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Plumbing condition comment must not exceed 500 characters'),
  
  // Sewage System
  body('sewage_system.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Sewage System rating must be between 1 and 5'),
  
  body('sewage_system.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Sewage System condition comment must not exceed 500 characters'),
  
  // Panel Board
  body('panel_board.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Panel Board rating must be between 1 and 5'),
  
  body('panel_board.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Panel Board condition comment must not exceed 500 characters'),
  
  // Lifts
  body('lifts.rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Lifts rating must be between 1 and 5'),
  
  body('lifts.condition_comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Lifts condition comment must not exceed 500 characters')
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
  structureNumberValidation,
  overallStructuralValidation,
  overallNonStructuralValidation
};