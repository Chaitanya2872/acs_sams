const mongoose = require('mongoose');

const coordinatesSchema = new mongoose.Schema({
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
});

const structuralRatingSchema = new mongoose.Schema({
  elementType: {
    type: String,
    required: true,
    enum: ['beam', 'column', 'slab', 'foundation']
  },
  pillarNumber: Number,
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  conditionComment: String,
  images: [String]
});

const nonStructuralRatingSchema = new mongoose.Schema({
  elementType: {
    type: String,
    required: true,
    enum: [
      'brick_plaster',
      'doors_windows',
      'flooring_bathroom_tiles',
      'electrical_wiring',
      'fittings_sanitary',
      'railings',
      'water_tanks',
      'plumbing',
      'sewage_system',
      'panel_board_transformer',
      'lifts'
    ]
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  conditionComment: String,
  images: [String]
});

const floorDetailsSchema = new mongoose.Schema({
  floorNumber: {
    type: Number,
    required: true
  },
  floorType: {
    type: String,
    required: true
  },
  totalAreaInSqMts: {
    type: Number,
    required: true
  },
  numberOfFlats: {
    type: Number,
    default: 0
  },
  floorLabelName: String,
  structuralRating: [structuralRatingSchema],
  nonStructuralRating: [nonStructuralRatingSchema]
});

const structureSchema = new mongoose.Schema({
  // Structure Identity - FIXED: Made optional since it's auto-generated
  structuralIdentityNumber: {
    type: String,
    unique: true,
    // REMOVED required: true - will be auto-generated
  },
  stateCode: {
    type: String,
    required: true,
    length: 2
  },
  districtCode: {
    type: String,
    required: true,
    length: 2
  },
  cityName: {
    type: String,
    required: true,
    trim: true
  },
  locationCode: {
    type: String,
    required: true
  },
  structureNumber: {
    type: String,
    required: true
  },
  typeOfStructure: {
    type: String,
    required: true,
    enum: ['residential', 'commercial', 'educational', 'hospital', 'industrial']
  },
  
  // Location Details
  coordinates: {
    type: coordinatesSchema,
    required: true
  },
  
  // Administration Details
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  custodian: {
    type: String,
    required: true,
    trim: true
  },
  engineerDesignation: {
    type: String,
    required: true,
    trim: true
  },
  contactDetails: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  emailId: {
    type: String,
    required: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  
  // Geometric Details
  numberOfFloors: {
    type: Number,
    required: true,
    min: 1
  },
  structureWidth: {
    type: Number,
    required: true,
    min: 0
  },
  structureLength: {
    type: Number,
    required: true,
    min: 0
  },
  totalHeight: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Floor Details
  floorDetails: [floorDetailsSchema],
  
  // Overall Ratings
  overallStructuralRating: {
    beams: { type: Number, min: 1, max: 5 },
    columns: { type: Number, min: 1, max: 5 },
    slabs: { type: Number, min: 1, max: 5 },
    foundation: { type: Number, min: 1, max: 5 }
  },
  
  // Additional Information
  additionalImages: [String],
  
  // Inspection Details
  inspectionStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'requires_reinspection'],
    default: 'pending'
  },
  inspectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastInspectionDate: Date,
  nextInspectionDate: Date,
  
  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// FIXED: Enhanced pre-save hook with better error handling and logic
structureSchema.pre('save', async function(next) {
  try {
    // Only generate if it's a new document and doesn't already have an identity number
    if (this.isNew && !this.structuralIdentityNumber) {
      console.log('🔢 Generating structural identity number...');
      
      // Get count of existing structures for sequential numbering
      const count = await this.constructor.countDocuments();
      const sequentialNumber = String(count + 1).padStart(4, '0');
      
      // Extract first 4 characters of city name, convert to uppercase
      const cityCode = this.cityName.substring(0, 4).toUpperCase();
      
      // Generate the identity number: StateCode + DistrictCode + CityCode + SequentialNumber
      this.structuralIdentityNumber = `${this.stateCode}${this.districtCode}${cityCode}${sequentialNumber}`;
      
      console.log(`✅ Generated ID: ${this.structuralIdentityNumber}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error generating structural identity number:', error);
    next(error);
  }
});

// Index for efficient queries
structureSchema.index({ stateCode: 1, districtCode: 1, cityName: 1 });
structureSchema.index({ createdBy: 1 });
structureSchema.index({ inspectionStatus: 1 });
structureSchema.index({ structuralIdentityNumber: 1 }); // Added index for identity number

module.exports = mongoose.model('Structure', structureSchema);