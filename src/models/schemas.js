const mongoose = require('mongoose');

// =================== UTILITY SCHEMAS ===================

// FIXED: Enhanced Rating Component Schema with flexible photo validation
const ratingComponentSchema = {
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  condition_comment: {
    type: String,
    maxlength: 1000,
    default: '',
    trim: true
  },
  inspection_date: {
    type: Date,
    default: Date.now
  },
  // FIXED: Flexible photo validation - accepts base64, blob URLs, file paths, and HTTP URLs
  photos: [{
    type: String,
    validate: {
      validator: function(v) {
        // Allow empty strings
        if (!v || v.trim() === '') return true;
        
        // Check for base64 image data
        if (v.startsWith('data:image/')) return true;
        
        // Check for blob URLs (browser generated)
        if (v.startsWith('blob:')) return true;
        
        // Check for file paths (for local development/uploads)
        if (v.includes('/uploads/') || v.includes('\\uploads\\')) return true;
        
        // Check for any HTTP/HTTPS URLs (including cloud storage without extensions)
        const urlRegex = /^https?:\/\/.+/i;
        if (urlRegex.test(v)) return true;
        
        // Allow local file references
        if (v.match(/^[a-zA-Z]:\\/i) || v.startsWith('/') || v.startsWith('./')) return true;
        
        return false;
      },
      message: 'Invalid photo format. Must be a valid URL, base64 data, blob URL, or file path.'
    }
  }],
  inspector_notes: {
    type: String,
    maxlength: 2000,
    default: ''
  }
};

// Enhanced Flat Schema with Combined Ratings
const flatSchema = {
  // Don't manually set _id, let MongoDB handle it
  flat_id: {
    type: String,
    required: true,
    unique: false // Allow duplicates across different structures
  },
  flat_number: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  flat_type: {
    type: String,
    enum: {
      values: ['1bhk', '2bhk', '3bhk', '4bhk', '5bhk', 'studio', 'duplex', 'penthouse', 'shop', 'office', 'parking_slot'],
      message: 'Invalid flat type'
    },
    default: '2bhk'
  },
  area_sq_mts: {
    type: Number,
    min: [1, 'Area must be at least 1 square meter'],
    max: [10000, 'Area cannot exceed 10,000 square meters']
  },
  direction_facing: {
    type: String,
    enum: {
      values: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'],
      message: 'Invalid direction'
    },
    default: 'north'
  },
  occupancy_status: {
    type: String,
    enum: {
      values: ['occupied', 'vacant', 'under_renovation', 'locked'],
      message: 'Invalid occupancy status'
    },
    default: 'occupied'
  },
  
  // FLAT-LEVEL STRUCTURAL RATINGS
  structural_rating: {
    beams: ratingComponentSchema,
    columns: ratingComponentSchema,
    slab: ratingComponentSchema,
    foundation: ratingComponentSchema,
    
    // Auto-calculated flat structural summary
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: {
        values: ['Good', 'Fair', 'Poor', 'Critical'],
        message: 'Health status must be one of: Good, Fair, Poor, Critical'
      },
      default: null
    },
    assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // FLAT-LEVEL NON-STRUCTURAL RATINGS
  non_structural_rating: {
    brick_plaster: ratingComponentSchema,
    doors_windows: ratingComponentSchema,
    flooring_tiles: ratingComponentSchema,
    electrical_wiring: ratingComponentSchema,
    sanitary_fittings: ratingComponentSchema,
    railings: ratingComponentSchema,
    water_tanks: ratingComponentSchema,
    plumbing: ratingComponentSchema,
    sewage_system: ratingComponentSchema,
    panel_board: ratingComponentSchema,
    lifts: ratingComponentSchema,
    
    // Auto-calculated flat non-structural summary
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // FLAT OVERALL HEALTH (combination of structural + non-structural)
  flat_overall_rating: {
    combined_score: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: {
        values: ['Good', 'Fair', 'Poor', 'Critical'],
        message: 'Health status must be one of: Good, Fair, Poor, Critical'
      },
      default: null
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Priority must be one of: Low, Medium, High, Critical'
      },
      default: null
    },
    last_assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  flat_notes: {
    type: String,
    maxlength: 1000
  },
  last_inspection_date: {
    type: Date
  }
};

// FIXED: Enhanced Floor Schema with Floor-Level Ratings - allowing null values
const floorSchema = {
  // Don't manually set _id, let MongoDB handle it
  floor_id: {
    type: String,
    required: true,
    unique: false // Allow duplicates across different structures
  },
  floor_number: {
    type: Number,
    required: true,
    min: [0, 'Floor number cannot be negative'],
    max: [200, 'Floor number cannot exceed 200']
  },
  floor_type: {
    type: String,
    enum: {
      values: ['residential', 'commercial', 'mixed', 'parking', 'utility', 'recreational'],
      message: 'Invalid floor type'
    },
    default: 'residential'
  },
  floor_height: {
    type: Number,
    min: [2, 'Floor height must be at least 2 meters'],
    max: [10, 'Floor height cannot exceed 10 meters']
  },
  total_area_sq_mts: {
    type: Number,
    min: [1, 'Total area must be at least 1 square meter'],
    max: [50000, 'Total area cannot exceed 50,000 square meters']
  },
  floor_label_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  // FIXED: Allow 0 flats for parking floors
  number_of_flats: {
    type: Number,
    required: true,
    min: [0, 'Number of flats cannot be negative'], // Changed from 1 to 0
    max: [100, 'Number of flats cannot exceed 100 per floor']
  },
  
  // FLATS ARRAY with enhanced ratings
  flats: [flatSchema],
  
  // =================== FIXED: FLOOR-LEVEL OVERALL RATINGS - ALLOWING NULL VALUES ===================
  // Floor-level aggregated ratings from all flats in the floor
  floor_overall_structural_rating: {
    beams_average: {
      type: Number,
      min: 1,
      max: 5
    },
    columns_average: {
      type: Number,
      min: 1,
      max: 5
    },
    slab_average: {
      type: Number,
      min: 1,
      max: 5
    },
    foundation_average: {
      type: Number,
      min: 1,
      max: 5
    },
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    // FIXED: Allow null values for enum fields
    health_status: {
      type: String,
      enum: {
        values: ['Good', 'Fair', 'Poor', 'Critical'],
        message: 'Health status must be one of: Good, Fair, Poor, Critical'
      },
      default: null,
      validate: {
        validator: function(v) {
          return v === null || ['Good', 'Fair', 'Poor', 'Critical'].includes(v);
        },
        message: 'Health status must be null or one of: Good, Fair, Poor, Critical'
      }
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Priority must be one of: Low, Medium, High, Critical'
      },
      default: null,
      validate: {
        validator: function(v) {
          return v === null || ['Low', 'Medium', 'High', 'Critical'].includes(v);
        },
        message: 'Priority must be null or one of: Low, Medium, High, Critical'
      }
    },
    assessment_date: {
      type: Date,
      default: Date.now
    },
    total_flats_assessed: {
      type: Number,
      default: 0
    }
  },
  
  floor_overall_non_structural_rating: {
    brick_plaster_average: { type: Number, min: 1, max: 5 },
    doors_windows_average: { type: Number, min: 1, max: 5 },
    flooring_tiles_average: { type: Number, min: 1, max: 5 },
    electrical_wiring_average: { type: Number, min: 1, max: 5 },
    sanitary_fittings_average: { type: Number, min: 1, max: 5 },
    railings_average: { type: Number, min: 1, max: 5 },
    water_tanks_average: { type: Number, min: 1, max: 5 },
    plumbing_average: { type: Number, min: 1, max: 5 },
    sewage_system_average: { type: Number, min: 1, max: 5 },
    panel_board_average: { type: Number, min: 1, max: 5 },
    lifts_average: { type: Number, min: 1, max: 5 },
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    assessment_date: {
      type: Date,
      default: Date.now
    },
    total_flats_assessed: {
      type: Number,
      default: 0
    }
  },
  
  // FIXED: FLOOR COMBINED HEALTH - ALLOWING NULL VALUES
  floor_combined_health: {
    combined_score: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: {
        values: ['Good', 'Fair', 'Poor', 'Critical'],
        message: 'Health status must be one of: Good, Fair, Poor, Critical'
      },
      default: null,
      validate: {
        validator: function(v) {
          return v === null || ['Good', 'Fair', 'Poor', 'Critical'].includes(v);
        },
        message: 'Health status must be null or one of: Good, Fair, Poor, Critical'
      }
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Priority must be one of: Low, Medium, High, Critical'
      },
      default: null,
      validate: {
        validator: function(v) {
          return v === null || ['Low', 'Medium', 'High', 'Critical'].includes(v);
        },
        message: 'Priority must be null or one of: Low, Medium, High, Critical'
      }
    },
    last_assessment_date: {
      type: Date,
      default: Date.now
    },
    total_flats: {
      type: Number,
      default: 0
    },
    flats_needing_attention: {
      type: Number,
      default: 0
    }
  },
  
  floor_notes: {
    type: String,
    maxlength: 1000
  }
};

// =================== STRUCTURE SCHEMA (EMBEDDED SUBDOCUMENT) ===================

const structureSchema = new mongoose.Schema({
  // Basic Structure Identity (Screen 1)
  structural_identity: {
    uid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{8,12}$/, 'UID must be 8-12 alphanumeric characters']
    },
    structural_identity_number: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{17}$/, 'Structural Identity Number must be exactly 17 characters']
    },
    zip_code: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, 'Zip code must be exactly 6 digits']
    },
    state_code: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{2}$/, 'State code must be exactly 2 uppercase letters']
    },
    district_code: {
      type: String,
      trim: true,
      match: [/^\d{2}$/, 'District code must be exactly 2 digits']
    },
    city_name: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 50
    },
    location_code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10
    },
    structure_number: {
      type: String,
      trim: true,
      maxlength: 20
    },
    type_of_structure: {
      type: String,
      enum: {
        values: ['residential', 'commercial', 'educational', 'hospital', 'industrial'],
        message: 'Type of structure must be one of: residential, commercial, educational, hospital, industrial'
      },
      default: 'residential'
    },
    type_code: {
      type: String,
      match: [/^\d{2}$/, 'Type code must be exactly 2 digits']
    }
  },
  
  // Location Information (Screen 1)
  location: {
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 200
    }
  },
  
  // Administration Details (Screen 2)
  administration: {
    client_name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    custodian: {
      type: String,
      trim: true,
      maxlength: 100
    },
    engineer_designation: {
      type: String,
      trim: true,
      maxlength: 100
    },
    contact_details: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Contact details must be a valid 10-digit Indian mobile number']
    },
    email_id: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    organization: {
      type: String,
      trim: true,
      maxlength: 200
    }
  },
  
  // Geometric Details with Enhanced Floors and Flats (Screen 3)
  geometric_details: {
    number_of_floors: {
      type: Number,
      min: [1, 'Number of floors must be at least 1'],
      max: [200, 'Number of floors cannot exceed 200']
    },
    structure_height: {
      type: Number,
      min: [3, 'Structure height must be at least 3 meters'],
      max: [1000, 'Structure height cannot exceed 1000 meters']
    },
    structure_width: {
      type: Number,
      min: [5, 'Structure width must be at least 5 meters'],
      max: [500, 'Structure width cannot exceed 500 meters']
    },
    structure_length: {
      type: Number,
      min: [5, 'Structure length must be at least 5 meters'],
      max: [500, 'Structure length cannot exceed 500 meters']
    },
    
    // ENHANCED FLOORS ARRAY with floor-level ratings
    floors: [floorSchema],
    
    building_age: {
      type: Number,
      min: [0, 'Building age cannot be negative'],
      max: [200, 'Building age cannot exceed 200 years']
    },
    construction_year: {
      type: Number,
      min: [1800, 'Construction year seems too old'],
      max: [new Date().getFullYear() + 5, 'Construction year cannot be in the far future']
    }
  },
  
  // =================== FIXED: STRUCTURE-LEVEL RATINGS - ALLOWING NULL VALUES ===================
  
  // STRUCTURE-LEVEL OVERALL STRUCTURAL RATING (aggregated from floors)
  overall_structural_rating: {
    beams: ratingComponentSchema,
    columns: ratingComponentSchema,
    slab: ratingComponentSchema,
    foundation: ratingComponentSchema,
    
    // Auto-calculated from floor-level aggregations
    beams_structure_average: {
      type: Number,
      min: 1,
      max: 5
    },
    columns_structure_average: {
      type: Number,
      min: 1,
      max: 5
    },
    slab_structure_average: {
      type: Number,
      min: 1,
      max: 5
    },
    foundation_structure_average: {
      type: Number,
      min: 1,
      max: 5
    },
    
    // Overall structure structural rating
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: {
        values: ['Good', 'Fair', 'Poor', 'Critical'],
        message: 'Health status must be one of: Good, Fair, Poor, Critical'
      },
      default: null,
      validate: {
        validator: function(v) {
          return v === null || ['Good', 'Fair', 'Poor', 'Critical'].includes(v);
        },
        message: 'Health status must be null or one of: Good, Fair, Poor, Critical'
      }
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Priority must be one of: Low, Medium, High, Critical'
      },
      default: null,
      validate: {
        validator: function(v) {
          return v === null || ['Low', 'Medium', 'High', 'Critical'].includes(v);
        },
        message: 'Priority must be null or one of: Low, Medium, High, Critical'
      }
    },
    assessment_date: {
      type: Date,
      default: Date.now
    },
    next_inspection_date: {
      type: Date
    },
    structural_notes: {
      type: String,
      maxlength: 2000
    },
    total_floors_assessed: {
      type: Number,
      default: 0
    },
    total_flats_assessed: {
      type: Number,
      default: 0
    }
  },
  
  // STRUCTURE-LEVEL OVERALL NON-STRUCTURAL RATING (aggregated from floors)
  overall_non_structural_rating: {
    brick_plaster: ratingComponentSchema,
    doors_windows: ratingComponentSchema,
    flooring_tiles: ratingComponentSchema,
    electrical_wiring: ratingComponentSchema,
    sanitary_fittings: ratingComponentSchema,
    railings: ratingComponentSchema,
    water_tanks: ratingComponentSchema,
    plumbing: ratingComponentSchema,
    sewage_system: ratingComponentSchema,
    panel_board: ratingComponentSchema,
    lifts: ratingComponentSchema,
    
    // Auto-calculated averages from floor-level aggregations
    brick_plaster_structure_average: { type: Number, min: 1, max: 5 },
    doors_windows_structure_average: { type: Number, min: 1, max: 5 },
    flooring_tiles_structure_average: { type: Number, min: 1, max: 5 },
    electrical_wiring_structure_average: { type: Number, min: 1, max: 5 },
    sanitary_fittings_structure_average: { type: Number, min: 1, max: 5 },
    railings_structure_average: { type: Number, min: 1, max: 5 },
    water_tanks_structure_average: { type: Number, min: 1, max: 5 },
    plumbing_structure_average: { type: Number, min: 1, max: 5 },
    sewage_system_structure_average: { type: Number, min: 1, max: 5 },
    panel_board_structure_average: { type: Number, min: 1, max: 5 },
    lifts_structure_average: { type: Number, min: 1, max: 5 },
    
    // Overall structure non-structural rating
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    assessment_date: {
      type: Date,
      default: Date.now
    },
    non_structural_notes: {
      type: String,
      maxlength: 2000
    },
    total_floors_assessed: {
      type: Number,
      default: 0
    },
    total_flats_assessed: {
      type: Number,
      default: 0
    }
  },
  
  // FIXED: FINAL COMBINED HEALTH ASSESSMENT - ALLOWING NULL VALUES
  final_health_assessment: {
    overall_score: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: {
        values: ['Good', 'Fair', 'Poor', 'Critical'],
        message: 'Health status must be one of: Good, Fair, Poor, Critical'
      },
      default: null,
      validate: {
        validator: function(v) {
          return v === null || ['Good', 'Fair', 'Poor', 'Critical'].includes(v);
        },
        message: 'Health status must be null or one of: Good, Fair, Poor, Critical'
      }
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: 'Priority must be one of: Low, Medium, High, Critical'
      },
      default: null,
      validate: {
        validator: function(v) {
          return v === null || ['Low', 'Medium', 'High', 'Critical'].includes(v);
        },
        message: 'Priority must be null or one of: Low, Medium, High, Critical'
      }
    },
    assessment_date: {
      type: Date,
      default: Date.now
    },
    assessment_notes: {
      type: String,
      maxlength: 2000
    },
    structural_weight: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },
    non_structural_weight: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1
    }
  },
  
  // Structure Status (updated with new statuses)
  status: {
    type: String,
    enum: {
      values: ['draft', 'in_progress', 'location_completed', 'admin_completed', 'geometric_completed', 
               'ratings_in_progress', 'flat_ratings_completed', 'floor_ratings_completed',
               'overall_structural_completed', 'overall_non_structural_completed', 'fully_rated',
               'submitted', 'approved', 'requires_inspection', 'under_maintenance', 'condemned'],
      message: 'Invalid status'
    },
    default: 'draft'
  },
  
  // Inspection History
  inspection_history: [{
    inspection_id: {
      type: String,
      required: true
    },
    inspection_date: {
      type: Date,
      required: true,
      default: Date.now
    },
    inspection_type: {
      type: String,
      enum: ['routine', 'detailed', 'emergency', 'annual'],
      required: true
    },
    inspector_name: {
      type: String,
      required: true,
      maxlength: 100
    },
    findings: {
      type: String,
      maxlength: 5000
    },
    recommendations: [{
      priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical']
      },
      description: {
        type: String,
        maxlength: 1000
      },
      estimated_cost: {
        type: Number,
        min: 0
      },
      target_completion_date: Date
    }],
    photos: [String],
    status: {
      type: String,
      enum: ['completed', 'in_progress', 'pending'],
      default: 'completed'
    }
  }],
  
  // Maintenance Records
  maintenance_records: [{
    maintenance_id: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['routine', 'repair', 'renovation', 'emergency'],
      required: true
    },
    description: {
      type: String,
      maxlength: 2000
    },
    cost: {
      type: Number,
      min: 0
    },
    contractor: {
      type: String,
      maxlength: 200
    },
    completion_status: {
      type: String,
      enum: ['completed', 'in_progress', 'pending'],
      default: 'pending'
    },
    photos: [String],
    completion_date: Date
  }],
  
  // Additional Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 50
  }],
  
  // General Notes and Comments
  general_notes: {
    type: String,
    maxlength: 5000
  },
  
  // Creation and Update Information
  creation_info: {
    created_date: {
      type: Date,
      default: Date.now,
      immutable: true
    },
    last_updated_date: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  _id: true // Enable _id for subdocuments
});

// =================== USER SCHEMA WITH EMBEDDED STRUCTURES ===================

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'engineer', 'inspector', 'supervisor', 'viewer'],
      message: 'Invalid role. Must be one of: admin, engineer, inspector, supervisor, viewer'
    },
    default: 'engineer'
  },
  profile: {
    first_name: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    last_name: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number']
    },
    organization: {
      type: String,
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters']
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters']
    },
    employee_id: {
      type: String,
      trim: true,
      maxlength: [50, 'Employee ID cannot exceed 50 characters']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    }
  },
  permissions: {
    can_create_structures: {
      type: Boolean,
      default: true
    },
    can_approve_structures: {
      type: Boolean,
      default: false
    },
    can_delete_structures: {
      type: Boolean,
      default: false
    },
    can_view_all_structures: {
      type: Boolean,
      default: false
    },
    can_export_reports: {
      type: Boolean,
      default: false
    },
    can_manage_users: {
      type: Boolean,
      default: false
    }
  },
  
  // =================== EMBEDDED STRUCTURES ARRAY ===================
  structures: [structureSchema], // This embeds all structures as subdocuments
  
  // User Statistics
  stats: {
    total_structures_created: {
      type: Number,
      default: 0,
      min: 0
    },
    total_structures_submitted: {
      type: Number,
      default: 0,
      min: 0
    },
    total_structures_approved: {
      type: Number,
      default: 0,
      min: 0
    },
    last_activity_date: {
      type: Date,
      default: Date.now
    },
    total_login_count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Account Status
  is_active: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  last_login: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'users'
});

// =================== INDEXES FOR PERFORMANCE ===================

// User-level indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ 'profile.organization': 1 });
userSchema.index({ is_active: 1 });
userSchema.index({ created_at: -1 });

// Embedded structure indexes
userSchema.index({ 'structures.structural_identity.structural_identity_number': 1 }, { sparse: true });
userSchema.index({ 'structures.structural_identity.uid': 1 });
userSchema.index({ 'structures.status': 1 });
userSchema.index({ 'structures.structural_identity.state_code': 1, 'structures.structural_identity.district_code': 1 });
userSchema.index({ 'structures.overall_structural_rating.priority': 1 });
userSchema.index({ 'structures.overall_structural_rating.health_status': 1 });
userSchema.index({ 'structures.final_health_assessment.priority': 1 });
userSchema.index({ 'structures.creation_info.created_date': -1 });

// Enhanced indexes for floor and flat level ratings
userSchema.index({ 'structures.geometric_details.floors.floor_combined_health.priority': 1 });
userSchema.index({ 'structures.geometric_details.floors.flats.flat_overall_rating.priority': 1 });

// =================== VIRTUAL FIELDS ===================

// User virtual fields
userSchema.virtual('full_name').get(function() {
  return `${this.profile?.first_name || ''} ${this.profile?.last_name || ''}`.trim();
});

userSchema.virtual('active_structures').get(function() {
  return this.structures.filter(structure => 
    structure.status !== 'condemned' && structure.is_active !== false
  );
});

// Structure virtual fields (for subdocuments)
structureSchema.virtual('total_area').get(function() {
  if (!this.geometric_details?.structure_width || !this.geometric_details?.structure_length) return null;
  return this.geometric_details.structure_width * this.geometric_details.structure_length;
});

structureSchema.virtual('total_flats').get(function() {
  if (!this.geometric_details?.floors) return 0;
  return this.geometric_details.floors.reduce((total, floor) => {
    return total + (floor.flats ? floor.flats.length : 0);
  }, 0);
});

structureSchema.virtual('formatted_structure_number').get(function() {
  if (!this.structural_identity?.structural_identity_number) return null;
  const num = this.structural_identity.structural_identity_number;
  return `${num.substr(0,2)}-${num.substr(2,2)}-${num.substr(4,4)}-${num.substr(8,2)}-${num.substr(10,5)}-${num.substr(15,2)}`;
});

// =================== MIDDLEWARE ===================

// Pre-save middleware to update timestamps and version
userSchema.pre('save', function(next) {
  this.updated_at = new Date();
  
  // Update structure timestamps and versions
  this.structures.forEach(structure => {
    if (structure.isModified() && !structure.isNew) {
      structure.creation_info.last_updated_date = new Date();
      structure.creation_info.version += 1;
    }
  });
  
  next();
});

// FIXED: Enhanced pre-save middleware with better null handling
structureSchema.pre('save', function(next) {
  // Only calculate ratings if floors exist and are modified
  if (this.geometric_details?.floors && this.isModified('geometric_details.floors')) {
    this.geometric_details.floors.forEach(floor => {
      if (floor.flats && floor.flats.length > 0) {
        floor.flats.forEach(flat => {
          // Calculate flat structural rating average
          if (flat.structural_rating) {
            const structuralRatings = [];
            if (flat.structural_rating.beams?.rating) structuralRatings.push(flat.structural_rating.beams.rating);
            if (flat.structural_rating.columns?.rating) structuralRatings.push(flat.structural_rating.columns.rating);
            if (flat.structural_rating.slab?.rating) structuralRatings.push(flat.structural_rating.slab.rating);
            if (flat.structural_rating.foundation?.rating) structuralRatings.push(flat.structural_rating.foundation.rating);
            
            if (structuralRatings.length > 0) {
              const average = structuralRatings.reduce((sum, rating) => sum + rating, 0) / structuralRatings.length;
              flat.structural_rating.overall_average = Math.round(average * 10) / 10;
              flat.structural_rating.health_status = this.getHealthStatus(average);
              flat.structural_rating.assessment_date = new Date();
            }
          }
          
          // Calculate flat non-structural rating average
          if (flat.non_structural_rating) {
            const nonStructuralRatings = [];
            const components = ['brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
                               'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
                               'sewage_system', 'panel_board', 'lifts'];
            
            components.forEach(component => {
              if (flat.non_structural_rating[component]?.rating) {
                nonStructuralRatings.push(flat.non_structural_rating[component].rating);
              }
            });
            
            if (nonStructuralRatings.length > 0) {
              const average = nonStructuralRatings.reduce((sum, rating) => sum + rating, 0) / nonStructuralRatings.length;
              flat.non_structural_rating.overall_average = Math.round(average * 10) / 10;
              flat.non_structural_rating.assessment_date = new Date();
            }
          }
          
          // Calculate flat overall rating (combined)
          if (flat.structural_rating?.overall_average && flat.non_structural_rating?.overall_average) {
            const structuralWeight = 0.7;
            const nonStructuralWeight = 0.3;
            
            const combinedScore = (flat.structural_rating.overall_average * structuralWeight) + 
                                 (flat.non_structural_rating.overall_average * nonStructuralWeight);
            
            flat.flat_overall_rating = flat.flat_overall_rating || {};
            flat.flat_overall_rating.combined_score = Math.round(combinedScore * 10) / 10;
            flat.flat_overall_rating.health_status = this.getHealthStatus(combinedScore);
            flat.flat_overall_rating.priority = this.getPriority(combinedScore);
            flat.flat_overall_rating.last_assessment_date = new Date();
          }
        });
        
        // Calculate floor-level ratings from flats - ONLY if we have flat ratings
        this.calculateFloorLevelRatings(floor);
      }
    });
    
    // Calculate structure-level ratings from floors - ONLY if we have floor ratings
    this.calculateStructureLevelRatings();
  }
  
  next();
});

// =================== INSTANCE METHODS ===================

// User methods
userSchema.methods.getStructureById = function(structureId) {
  return this.structures.id(structureId);
};

userSchema.methods.getActiveStructures = function() {
  return this.structures.filter(structure => 
    structure.status !== 'condemned' && structure.is_active !== false
  );
};

userSchema.methods.updateStats = function() {
  this.stats.total_structures_created = this.structures.length;
  this.stats.total_structures_submitted = this.structures.filter(s => 
    ['submitted', 'approved'].includes(s.status)
  ).length;
  this.stats.total_structures_approved = this.structures.filter(s => 
    s.status === 'approved'
  ).length;
  this.stats.last_activity_date = new Date();
};

// FIXED: Enhanced structure methods with better null handling
structureSchema.methods.getHealthStatus = function(average) {
  if (!average || isNaN(average)) return null;
  if (average >= 4) return 'Good';
  if (average >= 3) return 'Fair';
  if (average >= 2) return 'Poor';
  return 'Critical';
};

structureSchema.methods.getPriority = function(average) {
  if (!average || isNaN(average)) return null;
  if (average >= 4) return 'Low';
  if (average >= 3) return 'Medium';
  if (average >= 2) return 'High';
  return 'Critical';
};

structureSchema.methods.calculateAverage = function(ratings) {
  const validRatings = ratings.filter(r => r && !isNaN(r));
  if (validRatings.length === 0) return null;
  
  const average = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
  return Math.round(average * 10) / 10;
};

// FIXED: Better floor-level ratings calculation with null safety
structureSchema.methods.calculateFloorLevelRatings = function(floor) {
  if (!floor.flats || floor.flats.length === 0) return;
  
  const structuralRatings = {
    beams: [],
    columns: [],
    slab: [],
    foundation: []
  };
  
  const nonStructuralRatings = {
    brick_plaster: [], doors_windows: [], flooring_tiles: [], electrical_wiring: [],
    sanitary_fittings: [], railings: [], water_tanks: [], plumbing: [],
    sewage_system: [], panel_board: [], lifts: []
  };
  
  let flatsAssessed = 0;
  let flatsNeedingAttention = 0;
  
  // Collect ratings from all flats
  floor.flats.forEach(flat => {
    // Structural ratings
    if (flat.structural_rating) {
      if (flat.structural_rating.beams?.rating) structuralRatings.beams.push(flat.structural_rating.beams.rating);
      if (flat.structural_rating.columns?.rating) structuralRatings.columns.push(flat.structural_rating.columns.rating);
      if (flat.structural_rating.slab?.rating) structuralRatings.slab.push(flat.structural_rating.slab.rating);
      if (flat.structural_rating.foundation?.rating) structuralRatings.foundation.push(flat.structural_rating.foundation.rating);
    }
    
    // Non-structural ratings
    if (flat.non_structural_rating) {
      Object.keys(nonStructuralRatings).forEach(component => {
        if (flat.non_structural_rating[component]?.rating) {
          nonStructuralRatings[component].push(flat.non_structural_rating[component].rating);
        }
      });
    }
    
    // Count assessed flats and those needing attention
    if (flat.flat_overall_rating?.combined_score) {
      flatsAssessed++;
      if (flat.flat_overall_rating.combined_score < 3) {
        flatsNeedingAttention++;
      }
    }
  });
  
  // FIXED: Only calculate if we have actual ratings
  if (structuralRatings.beams.length > 0 || structuralRatings.columns.length > 0 || 
      structuralRatings.slab.length > 0 || structuralRatings.foundation.length > 0) {
    
    // Calculate floor structural ratings
    floor.floor_overall_structural_rating = floor.floor_overall_structural_rating || {};
    floor.floor_overall_structural_rating.beams_average = this.calculateAverage(structuralRatings.beams);
    floor.floor_overall_structural_rating.columns_average = this.calculateAverage(structuralRatings.columns);
    floor.floor_overall_structural_rating.slab_average = this.calculateAverage(structuralRatings.slab);
    floor.floor_overall_structural_rating.foundation_average = this.calculateAverage(structuralRatings.foundation);
    
    const structuralOverallRatings = [
      floor.floor_overall_structural_rating.beams_average,
      floor.floor_overall_structural_rating.columns_average,
      floor.floor_overall_structural_rating.slab_average,
      floor.floor_overall_structural_rating.foundation_average
    ].filter(r => r !== null && !isNaN(r));
    
    if (structuralOverallRatings.length > 0) {
      floor.floor_overall_structural_rating.overall_average = this.calculateAverage(structuralOverallRatings);
      floor.floor_overall_structural_rating.health_status = this.getHealthStatus(floor.floor_overall_structural_rating.overall_average);
      floor.floor_overall_structural_rating.priority = this.getPriority(floor.floor_overall_structural_rating.overall_average);
    } else {
      // FIXED: Set to null when no ratings available
      floor.floor_overall_structural_rating.health_status = null;
      floor.floor_overall_structural_rating.priority = null;
    }
    
    floor.floor_overall_structural_rating.assessment_date = new Date();
    floor.floor_overall_structural_rating.total_flats_assessed = flatsAssessed;
  }
  
  // Calculate floor non-structural ratings - FIXED with null safety
  const hasNonStructuralRatings = Object.values(nonStructuralRatings).some(ratings => ratings.length > 0);
  
  if (hasNonStructuralRatings) {
    floor.floor_overall_non_structural_rating = floor.floor_overall_non_structural_rating || {};
    const nonStructuralOverallRatings = [];
    
    Object.keys(nonStructuralRatings).forEach(component => {
      const average = this.calculateAverage(nonStructuralRatings[component]);
      floor.floor_overall_non_structural_rating[`${component}_average`] = average;
      if (average !== null && !isNaN(average)) nonStructuralOverallRatings.push(average);
    });
    
    floor.floor_overall_non_structural_rating.overall_average = this.calculateAverage(nonStructuralOverallRatings);
    floor.floor_overall_non_structural_rating.assessment_date = new Date();
    floor.floor_overall_non_structural_rating.total_flats_assessed = flatsAssessed;
  }
  
  // Calculate floor combined health - FIXED with null safety
  if (floor.floor_overall_structural_rating?.overall_average && floor.floor_overall_non_structural_rating?.overall_average) {
    const structuralWeight = 0.7;
    const nonStructuralWeight = 0.3;
    
    const combinedScore = (floor.floor_overall_structural_rating.overall_average * structuralWeight) + 
                         (floor.floor_overall_non_structural_rating.overall_average * nonStructuralWeight);
    
    floor.floor_combined_health = {
      combined_score: Math.round(combinedScore * 10) / 10,
      health_status: this.getHealthStatus(combinedScore),
      priority: this.getPriority(combinedScore),
      last_assessment_date: new Date(),
      total_flats: floor.flats.length,
      flats_needing_attention: flatsNeedingAttention
    };
  } else {
    // FIXED: Set to null when calculations not possible
    if (floor.floor_combined_health) {
      floor.floor_combined_health.health_status = null;
      floor.floor_combined_health.priority = null;
    }
  }
};

// FIXED: Better structure-level ratings calculation
structureSchema.methods.calculateStructureLevelRatings = function() {
  if (!this.geometric_details?.floors || this.geometric_details.floors.length === 0) return;
  
  const structuralRatings = [];
  const nonStructuralRatings = [];
  let totalFloorsAssessed = 0;
  let totalFlatsAssessed = 0;
  
  // Collect floor-level ratings
  this.geometric_details.floors.forEach(floor => {
    if (floor.floor_overall_structural_rating?.overall_average) {
      structuralRatings.push(floor.floor_overall_structural_rating.overall_average);
      totalFloorsAssessed++;
    }
    if (floor.floor_overall_non_structural_rating?.overall_average) {
      nonStructuralRatings.push(floor.floor_overall_non_structural_rating.overall_average);
    }
    
    totalFlatsAssessed += floor.flats ? floor.flats.length : 0;
  });
  
  // Update structure overall structural rating - FIXED with null safety
  if (structuralRatings.length > 0) {
    const structuralAverage = this.calculateAverage(structuralRatings);
    
    this.overall_structural_rating = this.overall_structural_rating || {};
    this.overall_structural_rating.overall_average = structuralAverage;
    this.overall_structural_rating.health_status = this.getHealthStatus(structuralAverage);
    this.overall_structural_rating.priority = this.getPriority(structuralAverage);
    this.overall_structural_rating.assessment_date = new Date();
    this.overall_structural_rating.total_floors_assessed = totalFloorsAssessed;
    this.overall_structural_rating.total_flats_assessed = totalFlatsAssessed;
  } else {
    // FIXED: Set to null when no ratings available
    if (this.overall_structural_rating) {
      this.overall_structural_rating.health_status = null;
      this.overall_structural_rating.priority = null;
    }
  }
  
  // Update structure overall non-structural rating
  if (nonStructuralRatings.length > 0) {
    const nonStructuralAverage = this.calculateAverage(nonStructuralRatings);
    
    this.overall_non_structural_rating = this.overall_non_structural_rating || {};
    this.overall_non_structural_rating.overall_average = nonStructuralAverage;
    this.overall_non_structural_rating.assessment_date = new Date();
    this.overall_non_structural_rating.total_floors_assessed = totalFloorsAssessed;
    this.overall_non_structural_rating.total_flats_assessed = totalFlatsAssessed;
  }
  
  // Update final health assessment - FIXED with null safety
  if (this.overall_structural_rating?.overall_average && this.overall_non_structural_rating?.overall_average) {
    const structuralWeight = this.final_health_assessment?.structural_weight || 0.7;
    const nonStructuralWeight = this.final_health_assessment?.non_structural_weight || 0.3;
    
    const finalScore = (this.overall_structural_rating.overall_average * structuralWeight) + 
                      (this.overall_non_structural_rating.overall_average * nonStructuralWeight);
    
    this.final_health_assessment = this.final_health_assessment || {};
    this.final_health_assessment.overall_score = Math.round(finalScore * 10) / 10;
    this.final_health_assessment.health_status = this.overall_structural_rating.health_status;
    this.final_health_assessment.priority = this.overall_structural_rating.priority;
    this.final_health_assessment.assessment_date = new Date();
    this.final_health_assessment.structural_weight = structuralWeight;
    this.final_health_assessment.non_structural_weight = nonStructuralWeight;
  } else {
    // FIXED: Set to null when calculations not possible
    if (this.final_health_assessment) {
      this.final_health_assessment.health_status = null;
      this.final_health_assessment.priority = null;
    }
  }
};

structureSchema.methods.getCompletionPercentage = function() {
  let completed = 0;
  const totalScreens = 8; // Updated to include enhanced rating screens
  
  // Screen 1: Location
  if (this.structural_identity && this.location?.coordinates?.latitude && this.location?.coordinates?.longitude) {
    completed++;
  }
  
  // Screen 2: Administration
  if (this.administration?.client_name && this.administration?.custodian && 
      this.administration?.engineer_designation && this.administration?.contact_details && 
      this.administration?.email_id) {
    completed++;
  }
  
  // Screen 3: Geometric
  if (this.geometric_details?.number_of_floors && this.geometric_details?.floors && 
      this.geometric_details.floors.length > 0) {
    completed++;
  }
  
  // Screen 4: Floors and Flats added
  if (this.geometric_details?.floors?.length > 0) {
    const allFloorsHaveFlats = this.geometric_details.floors.every(floor => 
      floor.number_of_flats === 0 || (floor.flats && floor.flats.length > 0)
    );
    if (allFloorsHaveFlats) completed++;
  }
  
  // Screen 5: Flat-wise ratings completed
  if (this.geometric_details?.floors?.length > 0) {
    let allFlatsRated = true;
    for (const floor of this.geometric_details.floors) {
      if (floor.flats && floor.flats.length > 0) {
        for (const flat of floor.flats) {
          if (!flat.flat_overall_rating?.combined_score) {
            allFlatsRated = false;
            break;
          }
        }
      }
      if (!allFlatsRated) break;
    }
    if (allFlatsRated) completed++;
  }
  
  // Screen 6: Floor-level ratings completed (auto-calculated)
  if (this.geometric_details?.floors?.length > 0) {
    const allFloorsRated = this.geometric_details.floors.every(floor => 
      floor.floor_combined_health?.combined_score
    );
    if (allFloorsRated) completed++;
  }
  
  // Screen 7: Structure overall structural rating
  if (this.overall_structural_rating?.overall_average) {
    completed++;
  }
  
  // Screen 8: Final health assessment
  if (this.final_health_assessment?.overall_score) {
    completed++;
  }
  
  return Math.round((completed / totalScreens) * 100);
};

structureSchema.methods.isReadyForSubmission = function() {
  return this.getCompletionPercentage() === 100;
};

structureSchema.methods.getNextInspectionDate = function() {
  if (this.overall_structural_rating?.next_inspection_date) {
    return this.overall_structural_rating.next_inspection_date;
  }
  
  // Calculate based on priority
  const currentDate = new Date();
  const priority = this.final_health_assessment?.priority || this.overall_structural_rating?.priority;
  
  switch (priority) {
    case 'Critical':
      currentDate.setMonth(currentDate.getMonth() + 3);
      break;
    case 'High':
      currentDate.setMonth(currentDate.getMonth() + 6);
      break;
    case 'Medium':
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      break;
    case 'Low':
    default:
      currentDate.setFullYear(currentDate.getFullYear() + 2);
      break;
  }
  
  return currentDate;
};

// =================== STATIC METHODS ===================

userSchema.statics.findByRole = function(role) {
  return this.find({ role, is_active: true });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ is_active: true });
};

userSchema.statics.getStructureStats = function() {
  return this.aggregate([
    { $unwind: '$structures' },
    {
      $group: {
        _id: null,
        total_structures: { $sum: 1 },
        by_status: { $push: '$structures.status' },
        by_type: { $push: '$structures.structural_identity.type_of_structure' },
        by_health_status: { $push: '$structures.final_health_assessment.health_status' },
        by_priority: { $push: '$structures.final_health_assessment.priority' }
      }
    }
  ]);
};

// =================== ADDITIONAL SCHEMAS (same as before) ===================

// OTP Schema for authentication
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  otp: {
    type: String,
    required: true,
    match: [/^\d{6}$/, 'OTP must be exactly 6 digits']
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'password_reset', 'email_verification'],
    required: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  expires_at: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete expired OTPs
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1 });

// Token Schema for JWT management
const tokenSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['access', 'refresh', 'reset_password'],
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  expires_at: {
    type: Date,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_used: {
    type: Date,
    default: Date.now
  },
  ip_address: String,
  user_agent: String
});

// Auto-delete expired tokens
tokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ user_id: 1, type: 1 });
tokenSchema.index({ token: 1 });

// Session Schema for user sessions
const sessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session_id: {
    type: String,
    required: true,
    unique: true
  },
  ip_address: String,
  user_agent: String,
  location: {
    city: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_activity: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
});

sessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user_id: 1 });
sessionSchema.index({ session_id: 1 });

// Audit Log Schema for tracking changes
const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  structure_id: {
    type: mongoose.Schema.Types.ObjectId, // This will be the embedded structure's _id
    required: false
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create_structure', 'update_structure', 'delete_structure', 'submit_structure',
      'approve_structure', 'reject_structure', 'add_rating', 'update_rating',
      'add_flat_rating', 'update_flat_rating', 'calculate_floor_rating', 'calculate_structure_rating',
      'login', 'logout', 'password_change', 'profile_update', 'export_data'
    ]
  },
  entity_type: {
    type: String,
    enum: ['user', 'structure', 'floor', 'flat', 'rating', 'system'],
    required: true
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  ip_address: String,
  user_agent: String,
  description: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.index({ user_id: 1, created_at: -1 });
auditLogSchema.index({ structure_id: 1, created_at: -1 });
auditLogSchema.index({ action: 1, created_at: -1 });

// System Configuration Schema
const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['general', 'email', 'security', 'features', 'limits', 'ratings'],
    default: 'general'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

systemConfigSchema.index({ key: 1 });
systemConfigSchema.index({ category: 1 });

// Notification Schema
const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error', 'reminder'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['structure', 'floor', 'flat', 'inspection', 'maintenance', 'system', 'user'],
    required: true
  },
  related_structure_id: {
    type: mongoose.Schema.Types.ObjectId // Reference to embedded structure _id
  },
  is_read: {
    type: Boolean,
    default: false
  },
  is_sent: {
    type: Boolean,
    default: false
  },
  read_at: Date,
  created_at: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });
notificationSchema.index({ created_at: -1 });

// File Upload Schema (for photos and documents)
const fileUploadSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  structure_id: {
    type: mongoose.Schema.Types.ObjectId // Reference to embedded structure _id
  },
  floor_id: {
    type: String // Reference to floor_id
  },
  flat_id: {
    type: String // Reference to flat_id
  },
  filename: {
    type: String,
    required: true
  },
  original_name: {
    type: String,
    required: true
  },
  file_path: {
    type: String,
    required: true
  },
  file_url: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  file_type: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['structure_photo', 'floor_photo', 'flat_photo', 'rating_photo', 'document', 'report', 'other'],
    default: 'other'
  },
  rating_component: {
    type: String,
    enum: ['beams', 'columns', 'slab', 'foundation', 'brick_plaster', 'doors_windows', 
           'flooring_tiles', 'electrical_wiring', 'sanitary_fittings', 'railings', 
           'water_tanks', 'plumbing', 'sewage_system', 'panel_board', 'lifts']
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

fileUploadSchema.index({ user_id: 1, created_at: -1 });
fileUploadSchema.index({ structure_id: 1 });
fileUploadSchema.index({ floor_id: 1 });
fileUploadSchema.index({ flat_id: 1 });

// =================== EXPORT ===================

// Ensure virtual fields are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });
structureSchema.set('toJSON', { virtuals: true });
structureSchema.set('toObject', { virtuals: true });

// Create models
const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);
const Token = mongoose.model('Token', tokenSchema);
const Session = mongoose.model('Session', sessionSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

module.exports = {
  // Main Models
  User,
  
  // Authentication & Security
  OTP,
  Token,
  Session,
  
  // System & Logging
  AuditLog,
  SystemConfig,
  
  // Features
  Notification,
  FileUpload,
  
  // Note: No separate Structure model since structures are embedded in User
  // Access structures via: user.structures or user.structures.id(structureId)
};