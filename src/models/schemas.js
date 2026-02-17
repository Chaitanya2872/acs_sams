const mongoose = require('mongoose');

// =================== DISTRESS DIMENSIONS SCHEMA ===================
const distressDimensionsSchema = {
  length: {
    type: Number,
    min: [0, 'Length cannot be negative'],
    max: [10000, 'Length cannot exceed 10000'],
  },
  breadth: {
    type: Number,
    min: [0, 'Breadth cannot be negative'],
    max: [10000, 'Breadth cannot exceed 10000'],
  },
  height: {
    type: Number,
    min: [0, 'Height cannot be negative'],
    max: [10000, 'Height cannot exceed 10000'],
  },
  unit: {
    type: String,
    enum: ['mm', 'cm', 'm', 'inch', 'feet'],
    default: 'mm'
  }
};

// =================== COMPONENT INSTANCE SCHEMA ===================
// Each component (like beams) can have multiple instances
const componentInstanceSchema = {
  _id: {
    type: String,
  },
  name: {
    type: String,
    trim: true,
    maxlength: 200
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  photo: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v || v.trim() === '') return false;
        const extRegex = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
        if (v.startsWith('data:image/') ||
            v.startsWith('blob:') ||
            v.includes('/uploads/') ||
            /^https?:\/\/.+/i.test(v) ||
            extRegex.test(v)) {
          return true;
        }
        return false;
      },
      message: 'Invalid photo format'
    }
  },
  condition_comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  inspector_notes: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: ''
  },
  inspection_date: {
    type: Date,
    default: Date.now
  },
  
  // NEW FIELDS FOR DISTRESS OBSERVATIONS
  distress_dimensions: distressDimensionsSchema,
  
  repair_methodology: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  distress_types: [{
    type: String,
    enum: ['physical', 'chemical', 'mechanical']
  }],
  
  pdf_files: [{
    filename: {
      type: String,
      required: true
    },
    file_path: {
      type: String,
      required: true
    },
    file_size: {
      type: Number
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }]
};

// =================== TEST RESULT SCHEMA ===================
const testResultSchema = {
  test_id: {
    type: String,
    required: true
  },
  test_name: {
    type: String,
    required: true,
    enum: [
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
    ]
  },
  component_type: {
    type: String,
    required: true
  },
  component_id: {
    type: String,
    required: true
  },
  test_date: {
    type: Date,
    default: Date.now
  },
  test_results: {
    type: mongoose.Schema.Types.Mixed
  },
  test_report_pdf: {
    filename: String,
    file_path: String,
    uploaded_at: Date
  },
  tested_by: {
    type: String,
    maxlength: 100
  },
  remarks: {
    type: String,
    maxlength: 1000
  }
};

// =================== INDUSTRIAL BLOCK SCHEMA ===================
const industrialBlockSchema = {
  block_id: {
    type: String,
    required: true,
    unique: false
  },
  block_number: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  block_name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  block_type: {
    type: String,
    enum: ['manufacturing', 'warehouse', 'storage', 'office', 'utility', 'mixed'],
    default: 'manufacturing'
  },
  area_sq_mts: {
    type: Number,
    min: [1, 'Area must be at least 1 square meter'],
    max: [100000, 'Area cannot exceed 100,000 square meters']
  },
  
  // BLOCK-LEVEL STRUCTURAL RATINGS (Array of instances)
  structural_rating: {
    beams:{ type: [componentInstanceSchema], default: undefined },
    columns: { type: [componentInstanceSchema], default: undefined },
    slab: { type: [componentInstanceSchema], default: undefined },
    foundation: {type: [componentInstanceSchema], default: undefined},
    roof_truss: {type: [componentInstanceSchema], default: undefined},
    // NEW: For steel structures
    connections: {type: [componentInstanceSchema], default: undefined},
    bracings: {type: [componentInstanceSchema], default: undefined},
    purlins: {type: [componentInstanceSchema], default: undefined},
    channels: {type: [componentInstanceSchema], default: undefined},
    steel_flooring: {type: [componentInstanceSchema], default: undefined},
    
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: ['Good', 'Fair', 'Poor', 'Critical']
    },
    assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // BLOCK-LEVEL NON-STRUCTURAL RATINGS (Array of instances)
  non_structural_rating: {
    // For RCC structures
    walls_cladding:{type: [componentInstanceSchema], default: undefined},
    industrial_flooring: {type: [componentInstanceSchema], default: undefined},
    ventilation:{type: [componentInstanceSchema], default: undefined},
    electrical_system: {type: [componentInstanceSchema], default: undefined},
    fire_safety: {type: [componentInstanceSchema], default: undefined},
    drainage: {type: [componentInstanceSchema], default: undefined},
    overhead_cranes: {type: [componentInstanceSchema], default: undefined},
    loading_docks: {type: [componentInstanceSchema], default: undefined},
    
    // NEW: For steel structures
    cladding_partition_panels: {type: [componentInstanceSchema], default: undefined},
    roof_sheeting: {type: [componentInstanceSchema], default: undefined},
    chequered_plate: {type: [componentInstanceSchema], default: undefined},
    doors_windows: {type: [componentInstanceSchema], default: undefined},
    flooring: {type: [componentInstanceSchema], default: undefined},
    electrical_wiring: {type: [componentInstanceSchema], default: undefined},
    sanitary_fittings: {type: [componentInstanceSchema], default: undefined},
    railings: {type: [componentInstanceSchema], default: undefined},
    water_tanks: {type: [componentInstanceSchema], default: undefined},
    plumbing: {type: [componentInstanceSchema], default: undefined},
    sewage_system: {type: [componentInstanceSchema], default: undefined},
    panel_board_transformer: {type: [componentInstanceSchema], default: undefined},
    lift: {type: [componentInstanceSchema], default: undefined},
    
    // Dynamic/custom non-structural components
    custom_components: {
      type: Map,
      of: [componentInstanceSchema],
      default: undefined
    },
    
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
  
  block_overall_rating: {
    combined_score: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: ['Good', 'Fair', 'Poor', 'Critical']
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical']
    },
    last_assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // NEW: Testing requirements for block
  testing_required: {
    type: Boolean,
    default: false
  },
  
  test_results: [testResultSchema],
  
  block_notes: {
    type: String,
    maxlength: 1000
  },
  last_inspection_date: {
    type: Date
  }
};

// =================== FLAT SCHEMA ===================
const flatSchema = {
  flat_id: {
    type: String,
    required: true,
    unique: false
  },
  flat_number: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  flat_type: {
    type: String,
    enum: ['1bhk', '2bhk', '3bhk', '4bhk', '5bhk', 'studio', 'duplex', 'penthouse', 'shop', 'office', 'parking_slot'],
    default: '2bhk'
  },
  area_sq_mts: {
    type: Number,
    min: [1, 'Area must be at least 1 square meter'],
    max: [10000, 'Area cannot exceed 10,000 square meters']
  },
  direction_facing: {
    type: String,
    enum: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'],
    default: 'north'
  },
  occupancy_status: {
    type: String,
    enum: ['occupied', 'vacant', 'under_renovation', 'locked'],
    default: 'occupied'
  },
  
  // FLAT-LEVEL STRUCTURAL RATINGS (Array of instances)
  structural_rating: {
    beams: { type: [componentInstanceSchema], default: undefined },
    columns: { type: [componentInstanceSchema], default: undefined },
    slab: { type: [componentInstanceSchema], default: undefined },
    foundation:{ type: [componentInstanceSchema], default: undefined },
    
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: ['Good', 'Fair', 'Poor', 'Critical']
    },
    assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // FLAT-LEVEL NON-STRUCTURAL RATINGS (Array of instances)
  non_structural_rating: {
    brick_plaster: { type: [componentInstanceSchema], default: undefined },
    doors_windows: { type: [componentInstanceSchema], default: undefined },
    flooring_tiles:{ type: [componentInstanceSchema], default: undefined },
    electrical_wiring: { type: [componentInstanceSchema], default: undefined },
    sanitary_fittings: { type: [componentInstanceSchema], default: undefined },
    railings: { type: [componentInstanceSchema], default: undefined },
    water_tanks: { type: [componentInstanceSchema], default: undefined },
    plumbing:{ type: [componentInstanceSchema], default: undefined },
    sewage_system:{ type: [componentInstanceSchema], default: undefined },
    panel_board:{ type: [componentInstanceSchema], default: undefined },
    lifts: { type: [componentInstanceSchema], default: undefined },
    
    // Dynamic/custom non-structural components
    custom_components: {
      type: Map,
      of: [componentInstanceSchema],
      default: undefined
    },
    
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
  
  flat_overall_rating: {
    combined_score: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: ['Good', 'Fair', 'Poor', 'Critical']
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical']
    },
    last_assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // NEW: Testing requirements for flat (only for structural members)
  testing_required: {
    type: Boolean,
    default: false
  },
  
  test_results: [testResultSchema],
  
  flat_notes: {
    type: String,
    maxlength: 1000
  },
  last_inspection_date: {
    type: Date
  }
};

// =================== FLOOR SCHEMA ===================
const floorSchema = {
  floor_id: {
    type: String,
    required: true,
    unique: false
  },
  floor_number: {
    type: Number,
    required: true,
    min: [-5, 'Floor number cannot be less thazn -5 (for basements)'],
    max: [200, 'Floor number cannot exceed 200']
  },
  is_parking_floor: {
    type: Boolean,
    default: false
  },
  floor_height: {
    type: Number
  },
  total_area_sq_mts: {
    type: Number,
    min: [1, 'Total area must be at least 1 square meter'],
    max: [100000, 'Total area cannot exceed 100,000 square meters']
  },
  floor_label_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  number_of_flats: {
    type: Number,
    min: [0, 'Number of flats cannot be negative'],
    max: [100, 'Number of flats cannot exceed 100 per floor']
  },
  number_of_blocks: {
    type: Number,
    min: [0, 'Number of blocks cannot be negative'],
    max: [50, 'Number of blocks cannot exceed 50 per floor']
  },
  
  flats: [flatSchema],
  blocks: [industrialBlockSchema],
  
  // FLOOR-LEVEL STRUCTURAL RATINGS
  structural_rating: {
    beams: { type: [componentInstanceSchema], default: undefined },
    columns: { type: [componentInstanceSchema], default: undefined },
    slab: { type: [componentInstanceSchema], default: undefined },
    foundation: { type: [componentInstanceSchema], default: undefined },
    
    overall_average: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: ['Good', 'Fair', 'Poor', 'Critical']
    },
    assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // FLOOR-LEVEL NON-STRUCTURAL RATINGS
  non_structural_rating: {
    walls: { type: [componentInstanceSchema], default: undefined },
    flooring: { type: [componentInstanceSchema], default: undefined },
    electrical_system: { type: [componentInstanceSchema], default: undefined },
    fire_safety: { type: [componentInstanceSchema], default: undefined },
    drainage: { type: [componentInstanceSchema], default: undefined },
    
    // Dynamic/custom non-structural components
    custom_components: {
      type: Map,
      of: [componentInstanceSchema],
      default: undefined
    },
    
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
  
  floor_overall_rating: {
    combined_score: {
      type: Number,
      min: 1,
      max: 5
    },
    health_status: {
      type: String,
      enum: ['Good', 'Fair', 'Poor', 'Critical']
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical']
    },
    last_assessment_date: {
      type: Date,
      default: Date.now
    }
  },
  
  // NEW: Testing requirements for floor
  testing_required: {
    type: Boolean,
    default: false
  },
  
  test_results: [testResultSchema],
  
  floor_notes: {
    type: String,
    maxlength: 500
  },
  last_inspection_date: {
    type: Date
  }
};

// =================== TEST FORMAT SCHEMA ===================
const testFormatSchema = new mongoose.Schema({
  format_id: {
    type: String,
    required: true,
    unique: true
  },
  test_name: {
    type: String,
    required: true,
    enum: [
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
      'custom' // For user-defined tests
    ]
  },
  display_name: {
    type: String,
    required: true,
    maxlength: 100
  },
  format_template: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  field_definitions: [{
    field_name: {
      type: String,
      required: true
    },
    field_type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'multiselect', 'file'],
      required: true
    },
    field_label: {
      type: String,
      required: true
    },
    required: {
      type: Boolean,
      default: false
    },
    options: [String], // For select/multiselect
    validation_rules: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  is_custom: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// =================== STRUCTURE SCHEMA ===================
const structureSchema = new mongoose.Schema({
  structural_identity: {
    structural_identity_number: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: /^[A-Z]{2}[0-9]{2}[A-Z]{4}[A-Z0-9]{2}[0-9]{3}$/
    },
    uid: {
      type: String,
      required: true,
      unique: true
    },
    type_of_structure: {
      type: String,
      enum: ['residential', 'commercial', 'educational', 'hospital', 'industrial'],
      required: true
    },
    // NEW: Structure subtype (RCC or Steel)
    structure_subtype: {
      type: String,
      enum: ['rcc', 'steel'],
      required: true,
      default: 'rcc'
    },
    commercial_subtype: {
      type: String,
      enum: ['only_commercial', 'commercial_residential']
    },
    // NEW: Age of structure in years (0-100)
    age_of_structure: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [100, 'Age cannot exceed 100 years'],
      required: true
    }
  },
  
  location: {
    structure_name: {
      type: String,
      trim: true,
      maxlength: 200
    },
    zip_code: {
      type: String,
      required: true,
      match: /^[0-9]{6}$/
    },
    state_code: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{2}$/
    },
    district_code: {
      type: String,
      required: true,
      match: /^[0-9]{2}$/
    },
    city_name: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: 4
    },
    location_code: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: 2
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  
  administrative: {
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
  
  geometric_details: {
    number_of_floors: {
      type: Number,
      min: [1, 'Must have at least 1 floor'],
      max: [200, 'Cannot exceed 200 floors']
    },
    total_built_up_area_sq_mts: {
      type: Number,
      min: [1, 'Built-up area must be at least 1 square meter'],
      max: [1000000, 'Built-up area cannot exceed 1,000,000 square meters']
    },
    total_carpet_area_sq_mts: {
      type: Number,
      min: [1, 'Carpet area must be at least 1 square meter'],
      max: [1000000, 'Carpet area cannot exceed 1,000,000 square meters']
    },
    year_of_construction: {
      type: Number,
      min: [1800, 'Year must be 1800 or later'],
      max: [new Date().getFullYear() + 5, 'Year cannot be more than 5 years in the future']
    },
    basement_floors: {
      type: Number,
      default: 0,
      min: [0, 'Cannot have negative basement floors'],
      max: [10, 'Cannot exceed 10 basement floors']
    },
    structure_width: {
    type: Number
  },
  structure_length: {
    type: Number
  },
  structure_height: {
    type: Number
  },
    parking_type: {
      type: String,
      enum: ['none', 'surface', 'basement', 'stilt', 'mechanical', 'mixed']
    },
    parking_floor_type: {
      type: String,
      enum: ['stilt', 'cellar', 'subcellar_1', 'subcellar_2', 'subcellar_3', 'subcellar_4', 'subcellar_5'],
      sparse: true,
      required: false
    },
    floors: [floorSchema]
  },
  
  status: {
    type: String,
    enum: ['draft', 'location_completed', 'admin_completed', 'geometric_completed', 'ratings_in_progress', 'submitted', 'in_testing', 'tested', 'in_validation', 'validated', 'approved', 'rejected'],
    default: 'draft'
  },
  
  // NEW: Overall testing requirement for structure
  overall_testing_required: {
    type: Boolean,
    default: false
  },
  
  // NEW: Structure-level test results
  structure_test_results: [testResultSchema],
  
  // NEW: Report generation tracking
  reports: {
    observations_with_quantifications: {
      generated: {
        type: Boolean,
        default: false
      },
      file_path: String,
      generated_at: Date
    },
    non_destructive_test_results: {
      generated: {
        type: Boolean,
        default: false
      },
      file_path: String,
      generated_at: Date
    },
    bill_of_quantities: {
      generated: {
        type: Boolean,
        default: false
      },
      file_path: String,
      generated_at: Date
    }
  },
  
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
  _id: true
});

// =================== USER SCHEMA ===================
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
  roles: [{
    type: String,
    enum: ['AD', 'TE', 'VE', 'FE'],
    required: true
  }],
  role: {
    type: String,
    enum: ['AD', 'TE', 'VE', 'FE'],
    required: true,
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
      default: true
    },
    can_manage_users: {
      type: Boolean,
      default: false
    }
  },
  
  structures: [structureSchema],
  
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

// =================== INDEXES ===================
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ is_active: 1 });
userSchema.index({ created_at: -1 });

userSchema.index({ 'structures.structural_identity.structural_identity_number': 1 }, { sparse: true });
userSchema.index({ 'structures.structural_identity.uid': 1 });
userSchema.index({ 'structures.status': 1 });

testFormatSchema.index({ test_name: 1 });
testFormatSchema.index({ is_custom: 1 });

// =================== VIRTUAL FIELDS ===================
userSchema.virtual('full_name').get(function() {
  return `${this.profile?.first_name || ''} ${this.profile?.last_name || ''}`.trim();
});

structureSchema.virtual('total_units').get(function() {
  if (!this.geometric_details?.floors) return 0;
  
  if (this.structural_identity?.type_of_structure === 'industrial') {
    return this.geometric_details.floors.reduce((total, floor) => {
      return total + (floor.blocks ? floor.blocks.length : 0);
    }, 0);
  } else {
    return this.geometric_details.floors.reduce((total, floor) => {
      return total + (floor.flats ? floor.flats.length : 0);
    }, 0);
  }
});

// =================== MIDDLEWARE ===================
userSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

testFormatSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

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

// Enable virtuals in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });
structureSchema.set('toJSON', { virtuals: true });
structureSchema.set('toObject', { virtuals: true });

// =================== OTP & TOKEN SCHEMAS ===================
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
    default: () => new Date(Date.now() + 10 * 60 * 1000)
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

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
  }
});

otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// =================== CREATE MODELS ===================
const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);
const Token = mongoose.model('Token', tokenSchema);
const TestFormat = mongoose.model('TestFormat', testFormatSchema);

module.exports = {
  User,
  OTP,
  Token,
  TestFormat
};