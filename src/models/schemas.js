const mongoose = require('mongoose');

// =================== UTILITY SCHEMAS ===================

// Simplified Rating Component Schema
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
  photos: [{
    type: String,
    validate: {
      validator: function(v) {
        if (!v || v.trim() === '') return true;
        return v.startsWith('data:image/') || 
               v.startsWith('blob:') || 
               v.includes('/uploads/') || 
               /^https?:\/\/.+/i.test(v) ||
               v.match(/^[a-zA-Z]:\\/i) || 
               v.startsWith('/') || 
               v.startsWith('./');
      },
      message: 'Invalid photo format'
    }
  }],
  inspector_notes: {
    type: String,
    maxlength: 2000,
    default: ''
  }
};

// Industrial Block Schema - For industrial structures
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
  
  // BLOCK-LEVEL STRUCTURAL RATINGS
  structural_rating: {
    beams: ratingComponentSchema,
    columns: ratingComponentSchema,
    slab: ratingComponentSchema,
    foundation: ratingComponentSchema,
    roof_truss: ratingComponentSchema,  // Additional for industrial
    
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
  
  // BLOCK-LEVEL NON-STRUCTURAL RATINGS
  non_structural_rating: {
    walls_cladding: ratingComponentSchema,  // Industrial specific
    industrial_flooring: ratingComponentSchema,  // Heavy duty flooring
    ventilation: ratingComponentSchema,
    electrical_system: ratingComponentSchema,
    fire_safety: ratingComponentSchema,
    drainage: ratingComponentSchema,
    overhead_cranes: ratingComponentSchema,  // If applicable
    loading_docks: ratingComponentSchema,
    
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
  
  // BLOCK OVERALL HEALTH
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

// Enhanced Flat Schema - ONLY for residential/commercial structures
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
  
  // FLAT-LEVEL STRUCTURAL RATINGS
  structural_rating: {
    beams: ratingComponentSchema,
    columns: ratingComponentSchema,
    slab: ratingComponentSchema,
    foundation: ratingComponentSchema,
    
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
  
  // FLAT OVERALL HEALTH
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

// Enhanced Floor Schema - Supports both flats and industrial blocks
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
    max: [20, 'Floor height cannot exceed 20 meters']  // Higher for industrial
  },
  total_area_sq_mts: {
    type: Number,
    min: [1, 'Total area must be at least 1 square meter'],
    max: [100000, 'Total area cannot exceed 100,000 square meters']  // Larger for industrial
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
  
  // FLATS ARRAY - For residential/commercial structures
  flats: [flatSchema],
  
  // BLOCKS ARRAY - For industrial structures
  blocks: [industrialBlockSchema],
  
  floor_notes: {
    type: String,
    maxlength: 1000
  }
};

// =================== ENHANCED STRUCTURE SCHEMA ===================

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
  
  // Enhanced Geometric Details (Screen 3)
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
      max: [1000, 'Structure width cannot exceed 1000 meters']  // Larger for industrial
    },
    structure_length: {
      type: Number,
      min: [5, 'Structure length must be at least 5 meters'],
      max: [1000, 'Structure length cannot exceed 1000 meters']  // Larger for industrial
    },
    
    // ENHANCED FLOORS ARRAY - Supports both flats and blocks
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
  
  // Structure Status
  status: {
    type: String,
    enum: ['draft', 'location_completed', 'admin_completed', 'geometric_completed', 
           'ratings_in_progress', 'ratings_completed', 'submitted', 'approved'],
    default: 'draft'
  },
  
  // General Notes and Comments
  general_notes: {
    type: String,
    maxlength: 5000
  },
  
  // Role-based Remarks System
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
  _id: true
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
  
  // =================== EMBEDDED STRUCTURES ARRAY ===================
  structures: [structureSchema],
  
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

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ is_active: 1 });
userSchema.index({ created_at: -1 });

// Embedded structure indexes
userSchema.index({ 'structures.structural_identity.structural_identity_number': 1 }, { sparse: true });
userSchema.index({ 'structures.structural_identity.uid': 1 });
userSchema.index({ 'structures.structural_identity.structure_name': 1 }, { sparse: true });
userSchema.index({ 'structures.status': 1 });
userSchema.index({ 'structures.structural_identity.state_code': 1, 'structures.structural_identity.district_code': 1 });
userSchema.index({ 'structures.creation_info.created_date': -1 });

// =================== VIRTUAL FIELDS ===================

userSchema.virtual('full_name').get(function() {
  return `${this.profile?.first_name || ''} ${this.profile?.last_name || ''}`.trim();
});

userSchema.virtual('active_structures').get(function() {
  return this.structures.filter(structure => 
    structure.status !== 'condemned' && structure.is_active !== false
  );
});

structureSchema.virtual('total_area').get(function() {
  if (!this.geometric_details?.structure_width || !this.geometric_details?.structure_length) return null;
  return this.geometric_details.structure_width * this.geometric_details.structure_length;
});

// Enhanced virtual for total flats or blocks based on structure type
structureSchema.virtual('total_units').get(function() {
  if (!this.geometric_details?.floors) return 0;
  
  if (this.structural_identity?.type_of_structure === 'industrial') {
    // Count blocks for industrial
    return this.geometric_details.floors.reduce((total, floor) => {
      return total + (floor.blocks ? floor.blocks.length : 0);
    }, 0);
  } else {
    // Count flats for residential/commercial
    return this.geometric_details.floors.reduce((total, floor) => {
      return total + (floor.flats ? floor.flats.length : 0);
    }, 0);
  }
});

// =================== ENHANCED MIDDLEWARE ===================

userSchema.pre('save', function(next) {
  this.updated_at = new Date();
  
  this.structures.forEach(structure => {
    if (structure.isModified() && !structure.isNew) {
      structure.creation_info.last_updated_date = new Date();
      structure.creation_info.version += 1;
    }
  });
  
  next();
});

// Enhanced pre-save middleware for structures
structureSchema.pre('save', function(next) {
  if (this.geometric_details?.floors && this.isModified('geometric_details.floors')) {
    const structureType = this.structural_identity?.type_of_structure;
    
    this.geometric_details.floors.forEach(floor => {
      if (structureType === 'industrial') {
        // Process blocks for industrial structures
        if (floor.blocks && floor.blocks.length > 0) {
          floor.blocks.forEach(block => {
            // Calculate block structural rating average
            if (block.structural_rating) {
              const structuralRatings = [];
              const components = ['beams', 'columns', 'slab', 'foundation', 'roof_truss'];
              
              components.forEach(component => {
                if (block.structural_rating[component]?.rating) {
                  structuralRatings.push(block.structural_rating[component].rating);
                }
              });
              
              if (structuralRatings.length > 0) {
                const average = structuralRatings.reduce((sum, rating) => sum + rating, 0) / structuralRatings.length;
                block.structural_rating.overall_average = Math.round(average * 10) / 10;
                block.structural_rating.health_status = this.getHealthStatus(average);
                block.structural_rating.assessment_date = new Date();
              }
            }
            
            // Calculate block non-structural rating average
            if (block.non_structural_rating) {
              const nonStructuralRatings = [];
              const components = ['walls_cladding', 'industrial_flooring', 'ventilation', 'electrical_system',
                                'fire_safety', 'drainage', 'overhead_cranes', 'loading_docks'];
              
              components.forEach(component => {
                if (block.non_structural_rating[component]?.rating) {
                  nonStructuralRatings.push(block.non_structural_rating[component].rating);
                }
              });
              
              if (nonStructuralRatings.length > 0) {
                const average = nonStructuralRatings.reduce((sum, rating) => sum + rating, 0) / nonStructuralRatings.length;
                block.non_structural_rating.overall_average = Math.round(average * 10) / 10;
                block.non_structural_rating.assessment_date = new Date();
              }
            }
            
            // Calculate block overall rating (combined)
            if (block.structural_rating?.overall_average && block.non_structural_rating?.overall_average) {
              const structuralWeight = 0.7;
              const nonStructuralWeight = 0.3;
              
              const combinedScore = (block.structural_rating.overall_average * structuralWeight) + 
                                   (block.non_structural_rating.overall_average * nonStructuralWeight);
              
              block.block_overall_rating = block.block_overall_rating || {};
              block.block_overall_rating.combined_score = Math.round(combinedScore * 10) / 10;
              block.block_overall_rating.health_status = this.getHealthStatus(combinedScore);
              block.block_overall_rating.priority = this.getPriority(combinedScore);
              block.block_overall_rating.last_assessment_date = new Date();
            }
          });
        }
      } else {
        // Process flats for residential/commercial structures (existing logic)
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
        }
      }
    });
  }
  
  next();
});

// =================== INSTANCE METHODS ===================

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

// Enhanced completion percentage for different structure types
structureSchema.methods.getCompletionPercentage = function() {
  let completed = 0;
  const totalScreens = 4;
  
  // Screen 1: Location
  if (this.structural_identity && this.location?.coordinates?.latitude && this.location?.coordinates?.longitude) {
    completed++;
  }
  
  // Screen 2: Administration
  if (this.administration?.client_name && this.administration?.email_id) {
    completed++;
  }
  
  // Screen 3: Geometric with floors
  if (this.geometric_details?.structure_width && this.geometric_details?.structure_height && 
      this.geometric_details?.floors?.length > 0) {
    completed++;
  }
  
  // Screen 4: Ratings completed
  if (this.geometric_details?.floors?.length > 0) {
    const structureType = this.structural_identity?.type_of_structure;
    let allUnitsRated = true;
    
    for (const floor of this.geometric_details.floors) {
      if (structureType === 'industrial') {
        // Check blocks for industrial
        if (floor.blocks && floor.blocks.length > 0) {
          for (const block of floor.blocks) {
            if (!block.block_overall_rating?.combined_score) {
              allUnitsRated = false;
              break;
            }
          }
        }
      } else {
        // Check flats for residential/commercial
        if (floor.flats && floor.flats.length > 0) {
          for (const flat of floor.flats) {
            if (!flat.flat_overall_rating?.combined_score) {
              allUnitsRated = false;
              break;
            }
          }
        }
      }
      if (!allUnitsRated) break;
    }
    
    if (allUnitsRated) completed++;
  }
  
  return Math.round((completed / totalScreens) * 100);
};

structureSchema.methods.isReadyForSubmission = function() {
  return this.getCompletionPercentage() === 100;
};

// =================== ADDITIONAL SCHEMAS ===================

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

// Auto-delete expired entries
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Enable virtual fields in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });
structureSchema.set('toJSON', { virtuals: true });
structureSchema.set('toObject', { virtuals: true });

// Create models
const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);
const Token = mongoose.model('Token', tokenSchema);

module.exports = {
  User,
  OTP,
  Token
};