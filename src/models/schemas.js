const mongoose = require('mongoose');

// =================== COMPONENT INSTANCE SCHEMA ===================
// Each component (like beams) can have multiple instances
const componentInstanceSchema = {
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  rating: {
    type: Number,
    required: true,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  photo: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        if (!v || v.trim() === '') return false;
        return v.startsWith('data:image/') || 
               v.startsWith('blob:') || 
               v.includes('/uploads/') || 
               /^https?:\/\/.+/i.test(v);
      },
      message: 'Invalid photo format'
    }
  },
  condition_comment: {
    type: String,
    required: true,
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
    beams: [componentInstanceSchema],
    columns: [componentInstanceSchema],
    slab: [componentInstanceSchema],
    foundation: [componentInstanceSchema],
    roof_truss: [componentInstanceSchema],
    
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
    walls_cladding: [componentInstanceSchema],
    industrial_flooring: [componentInstanceSchema],
    ventilation: [componentInstanceSchema],
    electrical_system: [componentInstanceSchema],
    fire_safety: [componentInstanceSchema],
    drainage: [componentInstanceSchema],
    overhead_cranes: [componentInstanceSchema],
    loading_docks: [componentInstanceSchema],
    
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
    beams: [componentInstanceSchema],
    columns: [componentInstanceSchema],
    slab: [componentInstanceSchema],
    foundation: [componentInstanceSchema],
    
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
    brick_plaster: [componentInstanceSchema],
    doors_windows: [componentInstanceSchema],
    flooring_tiles: [componentInstanceSchema],
    electrical_wiring: [componentInstanceSchema],
    sanitary_fittings: [componentInstanceSchema],
    railings: [componentInstanceSchema],
    water_tanks: [componentInstanceSchema],
    plumbing: [componentInstanceSchema],
    sewage_system: [componentInstanceSchema],
    panel_board: [componentInstanceSchema],
    lifts: [componentInstanceSchema],
    
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
    min: [-5, 'Floor number cannot be less than -5 (for basements)'],
    max: [200, 'Floor number cannot exceed 200']
  },
  floor_type: {
    type: String,
    enum: ['residential', 'commercial', 'mixed', 'parking', 'utility', 'recreational', 'industrial'],
    default: 'residential'
  },
  is_parking_floor: {
    type: Boolean,
    default: false
  },
  floor_height: {
    type: Number,
    min: [2, 'Floor height must be at least 2 meters'],
    max: [20, 'Floor height cannot exceed 20 meters']
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
  
  // FLOOR-LEVEL STRUCTURAL RATINGS (Array of instances) - For commercial/industrial
  structural_rating: {
    beams: [componentInstanceSchema],
    columns: [componentInstanceSchema],
    slab: [componentInstanceSchema],
    foundation: [componentInstanceSchema],
    
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
  
  // FLOOR-LEVEL NON-STRUCTURAL RATINGS (Array of instances)
  non_structural_rating: {
    walls: [componentInstanceSchema],
    flooring: [componentInstanceSchema],
    electrical_system: [componentInstanceSchema],
    fire_safety: [componentInstanceSchema],
    
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
  
  floor_notes: {
    type: String,
    maxlength: 1000
  }
};

// =================== STRUCTURE SCHEMA ===================
const structureSchema = new mongoose.Schema({
  structural_identity: {
    uid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{8,12}$/, 'UID must be 8-12 alphanumeric characters']
    },
    structure_name: {
      type: String,
      trim: true,
      maxlength: 200
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
      enum: ['residential', 'commercial', 'educational', 'hospital', 'industrial'],
      default: 'residential'
    },
    commercial_subtype: {
      type: String,
      enum: ['only_commercial', 'commercial_residential'],
      required: function() {
        return this.type_of_structure === 'commercial';
      }
    },
    type_code: {
      type: String,
      match: [/^\d{2}$/, 'Type code must be exactly 2 digits']
    }
  },
  
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
  
  geometric_details: {
    number_of_floors: {
      type: Number,
      min: [1, 'Number of floors must be at least 1'],
      max: [200, 'Number of floors cannot exceed 200']
    },
    has_parking_floors: {
      type: Boolean,
      default: false
    },
    number_of_parking_floors: {
      type: Number,
      min: [0, 'Number of parking floors cannot be negative'],
      max: [10, 'Number of parking floors cannot exceed 10'],
      default: 0
    },
    structure_height: {
      type: Number,
      min: [3, 'Structure height must be at least 3 meters'],
      max: [1000, 'Structure height cannot exceed 1000 meters']
    },
    structure_width: {
      type: Number,
      min: [5, 'Structure width must be at least 5 meters'],
      max: [1000, 'Structure width cannot exceed 1000 meters']
    },
    structure_length: {
      type: Number,
      min: [5, 'Structure length must be at least 5 meters'],
      max: [1000, 'Structure length cannot exceed 1000 meters']
    },
    
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
  
  status: {
    type: String,
    enum: ['draft', 'location_completed', 'admin_completed', 'geometric_completed', 
           'ratings_in_progress', 'ratings_completed', 'submitted', 'approved'],
    default: 'draft'
  },
  
  general_notes: {
    type: String,
    maxlength: 5000
  },
  
  remarks: {
    fe_remarks: [{
      text: {
        type: String,
        required: true,
        maxlength: 2000,
        trim: true
      },
      author_name: {
        type: String,
        required: true,
        trim: true
      },
      author_role: {
        type: String,
        enum: ['FE'],
        required: true
      },
      created_at: {
        type: Date,
        default: Date.now
      },
      updated_at: {
        type: Date,
        default: Date.now
      }
    }],
    ve_remarks: [{
      text: {
        type: String,
        required: true,
        maxlength: 2000,
        trim: true
      },
      author_name: {
        type: String,
        required: true,
        trim: true
      },
      author_role: {
        type: String,
        enum: ['VE'],
        required: true
      },
      created_at: {
        type: Date,
        default: Date.now
      },
      updated_at: {
        type: Date,
        default: Date.now
      }
    }],
    last_updated_by: {
      role: {
        type: String,
        enum: ['FE', 'VE']
      },
      name: String,
      date: {
        type: Date,
        default: Date.now
      }
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

module.exports = {
  User,
  OTP,
  Token
};