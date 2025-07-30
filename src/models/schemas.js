const mongoose = require('mongoose');

// Structure Schema - Will be embedded in User
const structureSubSchema = new mongoose.Schema({
  // Structural Identity Number
  structural_identity: {
    uid: {
      type: String,
      required: true // Always required - generated during initialization
    },
    structural_identity_number: {
      type: String,
      required: false // Generated during location screen
    },
    state_code: {
      type: String,
      required: false, // Will be required during location screen validation
      length: 2
    },
    district_code: {
      type: String,
      required: false, // Will be required during location screen validation
      length: 2
    },
    city_name: {
      type: String,
      required: false, // Will be required during location screen validation
      maxlength: 4
    },
    location_code: {
      type: String,
      required: false, // Will be required during location screen validation
      maxlength: 2
    },
    structure_number: {
      type: String,
      required: false, // Auto-generated during location screen
      maxlength: 5
    },
    type_of_structure: {
      type: String,
      required: false, // Will be required during location screen validation
      enum: ['residential', 'commercial', 'educational', 'hospital', 'industrial'],
      default: 'residential'
    },
    type_code: {
      type: String,
      required: false, // Auto-generated during location screen
      maxlength: 2
    }
  },

  // Location Details
  location: {
    coordinates: {
      latitude: {
        type: Number,
        required: false, // Will be required during location screen validation
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: false, // Will be required during location screen validation
        min: -180,
        max: 180
      }
    },
    address: {
      type: String,
      required: false
    },
    area_of_structure: {
      type: Number,
      required: false
    }
  },

  // Administration Details
  administration: {
    client_name: {
      type: String,
      required: false, // Will be required during administrative screen validation
      maxlength: 50
    },
    custodian: {
      type: String,
      required: false, // Will be required during administrative screen validation
      maxlength: 20
    },
    engineer_designation: {
      type: String,
      required: false, // Will be required during administrative screen validation
      maxlength: 30
    },
    contact_details: {
      type: String,
      required: false, // Will be required during administrative screen validation
      match: /^[0-9]{10}$/
    },
    email_id: {
      type: String,
      required: false, // Will be required during administrative screen validation
      lowercase: true,
      maxlength: 30
    }
  },

  // Geometric Details with Enhanced Multiple Floors Support
  geometric_details: {
    number_of_floors: {
      type: Number,
      required: false, // Will be required during geometric screen validation
      min: 1,
      default: 1
    },
    structure_height: {
      type: Number,
      required: false // Will be required during geometric screen validation
    },
    structure_width: {
      type: Number,
      required: false // Will be required during geometric screen validation
    },
    structure_length: {
      type: Number,
      required: false // Will be required during geometric screen validation
    },
    
    // Enhanced Floor Details - Multiple floors support
    floors: [{
      floor_number: {
        type: Number,
        required: false
      },
      floor_type: {
        type: String,
        enum: ['parking', 'residential', 'commercial', 'common_area', 'mixed_use', 'other'],
        required: false,
        default: 'residential'
      },
      floor_height: Number,
      total_area_sq_mts: Number,
      floor_label_name: String,
      directions: {
        north: String,
        south: String,
        east: String,
        west: String
      },
      
      // Flats within each floor
      flats: [{
        flat_number: String,
        flat_type: {
          type: String,
          enum: ['1bhk', '2bhk', '3bhk', '4bhk', 'studio', 'duplex', 'penthouse', 'shop', 'office', 'parking_slot']
        },
        area_sq_mts: Number,
        direction_facing: {
          type: String,
          enum: ['north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west']
        },
        occupancy_status: {
          type: String,
          enum: ['occupied', 'vacant', 'under_maintenance'],
          default: 'occupied'
        },
        
        // Structural Rating with Image Requirements
        structural_rating: {
          beams: {
            rating: {
              type: Number,
              min: 1,
              max: 5,
              required: false // Will be validated in ratings screen
            },
            condition_comment: String,
            inspection_date: Date,
            photos: {
              type: [String],
              default: []
            }
          },
          columns: {
            rating: {
              type: Number,
              min: 1,
              max: 5,
              required: false // Will be validated in ratings screen
            },
            condition_comment: String,
            inspection_date: Date,
            photos: {
              type: [String],
              default: []
            }
          },
          slab: {
            rating: {
              type: Number,
              min: 1,
              max: 5,
              required: false // Will be validated in ratings screen
            },
            condition_comment: String,
            inspection_date: Date,
            photos: {
              type: [String],
              default: []
            }
          },
          foundation: {
            rating: {
              type: Number,
              min: 1,
              max: 5,
              required: false // Will be validated in ratings screen
            },
            condition_comment: String,
            inspection_date: Date,
            photos: {
              type: [String],
              default: []
            }
          }
        },
        
        // Non-Structural Rating with Image Requirements
        non_structural_rating: {
          brick_plaster: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          doors_windows: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          flooring_tiles: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          electrical_wiring: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          sanitary_fittings: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          railings: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          water_tanks: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          plumbing: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          sewage_system: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          panel_board: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          },
          lifts: {
            rating: { type: Number, min: 1, max: 5, required: false },
            condition_comment: String,
            photos: { type: [String], default: [] }
          }
        },
        
        // Additional flat data
        additional_notes: String,
        maintenance_history: [{
          date: Date,
          description: String,
          cost: Number,
          performed_by: String
        }],
        inspection_schedule: {
          next_inspection_date: Date,
          inspection_frequency: {
            type: String,
            enum: ['monthly', 'quarterly', 'half_yearly', 'yearly'],
            default: 'yearly'
          }
        }
      }],
      
      // Floor-level data
      floor_notes: String,
      common_amenities: [{
        amenity_type: String,
        condition: String,
        rating: { type: Number, min: 1, max: 5 }
      }]
    }]
  },

  // Creation info
  creation_info: {
    created_date: {
      type: Date,
      default: Date.now
    },
    last_updated_date: Date
  },

  // Structure Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'requires_inspection', 'maintenance_needed'],
    default: 'draft'
  },
  
  // Additional Information
  additional_photos: [String],
  documents: [String],
  overall_condition_summary: String
}, {
  timestamps: true
});

// Enhanced User Schema with Embedded Structures
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'engineer', 'inspector', 'viewer'],
    default: 'engineer'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  
  // EMBEDDED STRUCTURES ARRAY
  structures: [structureSubSchema]
}, {
  timestamps: true
});

// OTP Schema (unchanged)
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset', 'login'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000)
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'structures.structural_identity.uid': 1 });
userSchema.index({ 'structures.structural_identity.structural_identity_number': 1 });
userSchema.index({ 'structures.structural_identity.state_code': 1, 'structures.structural_identity.district_code': 1 });
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Export models
const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);

module.exports = {
  User,
  OTP,
  userSchema,
  otpSchema,
  structureSubSchema
};