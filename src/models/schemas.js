const mongoose = require('mongoose');

// User Schema
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
  }
}, {
  timestamps: true
});

// OTP Schema for email verification
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
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Structure Schema - Enhanced with floor/flat hierarchy
const structureSchema = new mongoose.Schema({
  // Structural Identity Number
  structural_identity: {
    uid: {
      type: String,
      unique: true,
      required: true
    },
    state_code: {
      type: String,
      required: true,
      length: 2
    },
    district_code: {
      type: String,
      required: true,
      length: 2
    },
    city_name: {
      type: String,
      required: true,
      maxlength: 4
    },
    location_code: {
      type: String,
      required: true,
      maxlength: 2
    },
    structure_number: {
      type: String,
      required: true,
      maxlength: 5
    },
    type_of_structure: {
      type: String,
      required: true,
      enum: ['residential', 'commercial', 'educational', 'hospital', 'industrial']
    }
  },

  // Location Details
  location: {
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    address: String,
    area_of_structure: Number
  },

  // Administration Details
  administration: {
    client_name: {
      type: String,
      required: true,
      maxlength: 50
    },
    custodian: {
      type: String,
      required: true,
      maxlength: 20
    },
    engineer_designation: {
      type: String,
      required: true,
      maxlength: 30
    },
    contact_details: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/
    },
    email_id: {
      type: String,
      required: true,
      lowercase: true,
      maxlength: 30
    }
  },

  // Geometric Details
  geometric_details: {
    number_of_floors: {
      type: Number,
      required: true,
      min: 1
    },
    structure_height: {
      type: Number,
      required: true
    },
    structure_width: {
      type: Number,
      required: true
    },
    structure_length: {
      type: Number,
      required: true
    },
    
    // Enhanced Floor Details
    floors: [{
      floor_number: {
        type: Number,
        required: true
      },
      floor_type: {
        type: String,
        enum: ['parking', 'parking_with_flats', 'flats_only', 'open_area', 'commercial', 'mixed_use'],
        required: true
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
        
        // Structured Data - Ratings
        structural_rating: {
          beams: {
            rating: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            },
            condition_comment: String,
            inspection_date: Date,
            photos: [String]
          },
          columns: {
            rating: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            },
            condition_comment: String,
            inspection_date: Date,
            photos: [String]
          },
          slab: {
            rating: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            },
            condition_comment: String,
            inspection_date: Date,
            photos: [String]
          },
          foundation: {
            rating: {
              type: Number,
              min: 1,
              max: 5,
              required: true
            },
            condition_comment: String,
            inspection_date: Date,
            photos: [String]
          }
        },
        
        // Non-Structural Rating
        non_structural_rating: {
          brick_plaster: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          doors_windows: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          flooring_tiles: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          electrical_wiring: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          sanitary_fittings: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          railings: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          water_tanks: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          plumbing: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          sewage_system: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          panel_board: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          },
          lifts: {
            rating: { type: Number, min: 1, max: 5, required: true },
            condition_comment: String,
            photos: [String]
          }
        },
        
        // Unstructured Data
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
      
      // Floor-level unstructured data
      floor_notes: String,
      common_amenities: [{
        amenity_type: String,
        condition: String,
        rating: { type: Number, min: 1, max: 5 }
      }]
    }]
  },

  // Overall Structure Metadata
  creation_info: {
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    created_date: {
      type: Date,
      default: Date.now
    },
    last_updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

// Inspection Schema
const inspectionSchema = new mongoose.Schema({
  structure_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Structure',
    required: true
  },
  inspector_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inspection_type: {
    type: String,
    enum: ['routine', 'detailed', 'emergency'],
    required: true
  },
  inspection_date: {
    type: Date,
    required: true
  },
  findings: [{
    component: String,
    issue_description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    recommended_action: String,
    photos: [String]
  }],
  overall_recommendation: String,
  next_inspection_date: Date,
  status: {
    type: String,
    enum: ['pending', 'completed', 'requires_followup'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Create indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
structureSchema.index({ 'structural_identity.uid': 1 });
structureSchema.index({ 'structural_identity.state_code': 1, 'structural_identity.district_code': 1 });
structureSchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });
inspectionSchema.index({ structure_id: 1, inspection_date: -1 });

// Export models
const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);
const Structure = mongoose.model('Structure', structureSchema);
const Inspection = mongoose.model('Inspection', inspectionSchema);

module.exports = {
  User,
  OTP,
  Structure,
  Inspection,
  userSchema,
  otpSchema,
  structureSchema,
  inspectionSchema
};