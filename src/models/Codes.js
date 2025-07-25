const mongoose = require('mongoose');

// State Codes Schema
const stateCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 2,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    maxlength: [100, 'State name cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// District Codes Schema  
const districtCodeSchema = new mongoose.Schema({
  stateCode: {
    type: String,
    required: true,
    length: 2,
    uppercase: true
  },
  code: {
    type: String,
    required: true,
    length: 2
  },
  name: {
    type: String,
    required: true,
    maxlength: [100, 'District name cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Structure Types Schema
const structureTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    maxlength: [10, 'Structure type code cannot exceed 10 characters']
  },
  name: {
    type: String,
    required: true,
    maxlength: [100, 'Structure type name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['residential', 'commercial', 'educational', 'hospital', 'industrial', 'other'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Structural Forms Schema
const structuralFormSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 2
  },
  name: {
    type: String,
    required: true,
    maxlength: [100, 'Structural form name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Materials of Construction Schema
const materialConstructionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    length: 1
  },
  name: {
    type: String,
    required: true,
    maxlength: [50, 'Material name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Rating Descriptions Schema
const ratingDescriptionSchema = new mongoose.Schema({
  elementType: {
    type: String,
    required: true,
    enum: ['beams', 'columns', 'slab', 'foundation', 'brick_plaster', 'doors_windows', 'flooring_bathroom_tiles', 'electrical_wiring', 'fittings_sanitary', 'railings', 'water_tanks', 'plumbing', 'sewage_system', 'panel_board_transformer', 'lifts']
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  condition: {
    type: String,
    required: true,
    enum: ['excellent', 'good', 'fair', 'poor', 'very_poor', 'failure']
  },
  description: {
    type: String,
    required: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  recommendedAction: {
    type: String,
    maxlength: [500, 'Recommended action cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Create individual models
const StateCode = mongoose.model('StateCode', stateCodeSchema);
const DistrictCode = mongoose.model('DistrictCode', districtCodeSchema);
const StructureType = mongoose.model('StructureType', structureTypeSchema);
const StructuralForm = mongoose.model('StructuralForm', structuralFormSchema);
const MaterialConstruction = mongoose.model('MaterialConstruction', materialConstructionSchema);
const RatingDescription = mongoose.model('RatingDescription', ratingDescriptionSchema);

// Seed default data function
const seedDefaultData = async () => {
  try {
    // Seed State Codes (Indian states as per RTO codes)
    const stateCodesData = [
      { code: 'AN', name: 'Andaman & Nicobar Islands' },
      { code: 'AP', name: 'Andhra Pradesh' },
      { code: 'AR', name: 'Arunachal Pradesh' },
      { code: 'AS', name: 'Assam' },
      { code: 'BR', name: 'Bihar' },
      { code: 'CH', name: 'Chandigarh' },
      { code: 'CG', name: 'Chhattisgarh' },
      { code: 'DD', name: 'Daman and Diu' },
      { code: 'DL', name: 'New Delhi' },
      { code: 'DN', name: 'Dadra and Nagar Haveli' },
      { code: 'GA', name: 'Goa' },
      { code: 'GJ', name: 'Gujarat' },
      { code: 'HP', name: 'Himachal Pradesh' },
      { code: 'HR', name: 'Haryana' },
      { code: 'JH', name: 'Jharkhand' },
      { code: 'JK', name: 'Jammu & Kashmir' },
      { code: 'KA', name: 'Karnataka' },
      { code: 'KL', name: 'Kerala' },
      { code: 'LD', name: 'Lakshadweep' },
      { code: 'MH', name: 'Maharashtra' },
      { code: 'ML', name: 'Meghalaya' },
      { code: 'MN', name: 'Manipur' },
      { code: 'MP', name: 'Madhya Pradesh' },
      { code: 'MZ', name: 'Mizoram' },
      { code: 'NL', name: 'Nagaland' },
      { code: 'OD', name: 'Odisha' },
      { code: 'PB', name: 'Punjab' },
      { code: 'PY', name: 'Puducherry' },
      { code: 'RJ', name: 'Rajasthan' },
      { code: 'SK', name: 'Sikkim' },
      { code: 'TN', name: 'Tamil Nadu' },
      { code: 'TS', name: 'Telangana' },
      { code: 'TR', name: 'Tripura' },
      { code: 'UK', name: 'Uttarakhand' },
      { code: 'UP', name: 'Uttar Pradesh' },
      { code: 'WB', name: 'West Bengal' }
    ];

    const existingStates = await StateCode.countDocuments();
    if (existingStates === 0) {
      await StateCode.insertMany(stateCodesData);
      console.log('State codes seeded successfully');
    }

    // Seed Structure Types
    const structureTypesData = [
      { code: 'RES', name: 'Residential Buildings', category: 'residential' },
      { code: 'COM', name: 'Commercial Buildings', category: 'commercial' },
      { code: 'EDU', name: 'Educational Buildings', category: 'educational' },
      { code: 'HOS', name: 'Hospital Buildings', category: 'hospital' },
      { code: 'IND', name: 'Industrial Structures', category: 'industrial' },
      { code: 'OTH', name: 'Other Structures', category: 'other' }
    ];

    const existingStructureTypes = await StructureType.countDocuments();
    if (existingStructureTypes === 0) {
      await StructureType.insertMany(structureTypesData);
      console.log('Structure types seeded successfully');
    }

    // Seed Structural Forms
    const structuralFormsData = [
      { code: '01', name: 'RCC Framed Structures' },
      { code: '02', name: 'Load Bearing Structures' },
      { code: '03', name: 'Steel Column Truss' },
      { code: '04', name: 'RCC Column Truss' },
      { code: '05', name: 'Steel Framed Structure' },
      { code: '06', name: 'Others' }
    ];

    const existingStructuralForms = await StructuralForm.countDocuments();
    if (existingStructuralForms === 0) {
      await StructuralForm.insertMany(structuralFormsData);
      console.log('Structural forms seeded successfully');
    }

    // Seed Materials of Construction
    const materialsData = [
      { code: '1', name: 'Concrete' },
      { code: '2', name: 'Steel' },
      { code: '3', name: 'Masonry' },
      { code: '4', name: 'Other' }
    ];

    const existingMaterials = await MaterialConstruction.countDocuments();
    if (existingMaterials === 0) {
      await MaterialConstruction.insertMany(materialsData);
      console.log('Materials of construction seeded successfully');
    }

  } catch (error) {
    console.error('Error seeding default data:', error);
  }
};

module.exports = {
  StateCode,
  DistrictCode,
  StructureType,
  StructuralForm,
  MaterialConstruction,
  RatingDescription,
  seedDefaultData
};