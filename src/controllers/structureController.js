const { User } = require('../models/schemas');
const StructureNumberGenerator = require('../utils/StructureNumberGenerator');
const {
  sendSuccessResponse,
  sendErrorResponse,
  sendCreatedResponse,
  sendUpdatedResponse,
  sendPaginatedResponse
} = require('../utils/responseHandler');
const { MESSAGES, PAGINATION } = require('../utils/constants');

class StructureController {
  constructor() {
    this.structureNumberGenerator = new StructureNumberGenerator();
    
    // Bind all methods to maintain 'this' context
    this.initializeStructure = this.initializeStructure.bind(this);
    this.saveLocationScreen = this.saveLocationScreen.bind(this);
    this.getLocationScreen = this.getLocationScreen.bind(this);
    this.updateLocationScreen = this.updateLocationScreen.bind(this);
    this.saveAdministrativeScreen = this.saveAdministrativeScreen.bind(this);
    this.getAdministrativeScreen = this.getAdministrativeScreen.bind(this);
    this.updateAdministrativeScreen = this.updateAdministrativeScreen.bind(this);

    this.saveBulkRatings = this.saveBulkRatings.bind(this);
    this.getBulkRatings = this.getBulkRatings.bind(this);
    this.updateBulkRatings = this.updateBulkRatings.bind(this)
    
    // NEW GRANULAR METHODS
    this.saveGeometricDetails = this.saveGeometricDetails.bind(this);
    this.getGeometricDetails = this.getGeometricDetails.bind(this);
    this.updateGeometricDetails = this.updateGeometricDetails.bind(this);
    
    this.addFloors = this.addFloors.bind(this);
    this.getFloors = this.getFloors.bind(this);
    this.getFloorById = this.getFloorById.bind(this);
    this.updateFloor = this.updateFloor.bind(this);
    this.deleteFloor = this.deleteFloor.bind(this);
    
    this.addFlatsToFloor = this.addFlatsToFloor.bind(this);
    this.getFlatsInFloor = this.getFlatsInFloor.bind(this);
    this.getFlatById = this.getFlatById.bind(this);
    this.updateFlat = this.updateFlat.bind(this);
    this.deleteFlat = this.deleteFlat.bind(this);
    
    this.saveFlatStructuralRating = this.saveFlatStructuralRating.bind(this);
    this.getFlatStructuralRating = this.getFlatStructuralRating.bind(this);
    this.updateFlatStructuralRating = this.updateFlatStructuralRating.bind(this);
    
    this.saveFlatNonStructuralRating = this.saveFlatNonStructuralRating.bind(this);
    this.getFlatNonStructuralRating = this.getFlatNonStructuralRating.bind(this);
    this.updateFlatNonStructuralRating = this.updateFlatNonStructuralRating.bind(this);
    
    this.saveOverallStructuralRating = this.saveOverallStructuralRating.bind(this);
    this.getOverallStructuralRating = this.getOverallStructuralRating.bind(this);
    this.updateOverallStructuralRating = this.updateOverallStructuralRating.bind(this);
    
    this.saveOverallNonStructuralRating = this.saveOverallNonStructuralRating.bind(this);
    this.getOverallNonStructuralRating = this.getOverallNonStructuralRating.bind(this);
    this.updateOverallNonStructuralRating = this.updateOverallNonStructuralRating.bind(this);
    
    // Keep existing methods
    this.getStructureProgress = this.getStructureProgress.bind(this);
    this.submitStructure = this.submitStructure.bind(this);
    this.validateStructureNumber = this.validateStructureNumber.bind(this);
    this.getLocationStructureStats = this.getLocationStructureStats.bind(this);
  }

  // =================== UTILITY METHODS ===================

  async findUserStructure(userId, structureId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const structure = user.structures.id(structureId);
    if (!structure) {
      throw new Error('Structure not found');
    }
    
    return { user, structure };
  }

  generateFloorId() {
    return `floor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateFlatId() {
    return `flat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // =================== STRUCTURE INITIALIZATION ===================

  // FIXED: Replace the initializeStructure method in your structureController.js

async initializeStructure(req, res) {
  try {
    console.log('🚀 Initializing new structure...');
    console.log('👤 User:', req.user.userId, req.user.email);
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    console.log('👤 User found, current structures:', user.structures.length);

    // FIXED: Generate a proper UID that meets validation (8-12 alphanumeric)
    const generateValidUID = () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const uid = `${random}${timestamp}`.substring(0, 12); // Ensure max 12 chars
      console.log('🔑 Generated UID:', uid, 'Length:', uid.length);
      return uid;
    };

    // FIXED: Create structure WITHOUT rating objects to avoid validation issues
    const newStructure = {
      structural_identity: {
        uid: generateValidUID(), // ← FIXED: Proper UID generation
        structural_identity_number: '',
        zip_code: '',
        state_code: '',
        district_code: '',
        city_name: '',
        location_code: '',
        structure_number: '',
        type_of_structure: 'residential',
        type_code: '01'
      },
      location: {
        coordinates: {
          latitude: null,
          longitude: null
        }
      },
      administration: {},
      geometric_details: {
        number_of_floors: 1,
        structure_height: null,
        structure_width: null,
        structure_length: null,
        floors: []
      },
      // REMOVED: Don't include rating objects during initialization
      // overall_structural_rating: {},
      // overall_non_structural_rating: {},
      creation_info: {
        created_date: new Date(),
        last_updated_date: new Date(),
        version: 1
      },
      status: 'draft'
    };

    console.log('📝 Structure object created, adding to user...');

    user.structures.push(newStructure);
    
    console.log('💾 Saving user with new structure...');
    await user.save();

    const createdStructure = user.structures[user.structures.length - 1];
    
    console.log('✅ Structure initialized successfully:', {
      id: createdStructure._id,
      uid: createdStructure.structural_identity.uid,
      status: createdStructure.status
    });
    
    sendCreatedResponse(res, {
      structure_id: createdStructure._id,
      uid: createdStructure.structural_identity.uid,
      status: createdStructure.status,
      total_structures: user.structures.length
    }, 'Structure initialized successfully');

  } catch (error) {
    console.error('❌ Structure initialization error:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    if (error.name === 'ValidationError') {
      console.error('❌ Validation errors:', Object.keys(error.errors));
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Structure validation failed',
        errors: validationErrors
      });
    }
    
    sendErrorResponse(res, 'Failed to initialize structure', 500, error.message);
  }
}

  // =================== SCREEN 1: LOCATION ===================

  async saveLocationScreen(req, res) {
    try {
      const { id } = req.params;
      const { 
        zip_code, state_code, district_code, city_name, location_code, type_of_structure,
        longitude, latitude, address 
      } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      // Get next sequence number for this location
      const nextSequence = await this.getNextSequenceForLocation(
        state_code, district_code, city_name, location_code
      );
      
      // Generate structural identity number and components
      const generatedNumbers = this.structureNumberGenerator.generateStructureNumber({
        state_code,
        district_code, 
        city_name,
        location_code,
        type_of_structure
      }, nextSequence);
      
      // Update structural identity with generated numbers + zip code
      structure.structural_identity = {
        uid: structure.structural_identity.uid,
        structural_identity_number: generatedNumbers.structural_identity_number,
        zip_code: zip_code,
        state_code: generatedNumbers.components.state_code,
        district_code: generatedNumbers.components.district_code,
        city_name: generatedNumbers.components.city_code,
        location_code: generatedNumbers.components.location_code,
        structure_number: generatedNumbers.components.structure_sequence,
        type_of_structure: type_of_structure,
        type_code: generatedNumbers.components.type_code
      };
      
      // Update location coordinates
      structure.location = {
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        address: address || ''
      };
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      console.log(`✅ Generated Structure Number: ${generatedNumbers.structural_identity_number}`);
      
      sendSuccessResponse(res, 'Location details saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        structural_identity_number: structure.structural_identity.structural_identity_number,
        location: structure.location,
        formatted_display: generatedNumbers.formatted_display
      });

    } catch (error) {
      console.error('❌ Location save error:', error);
      sendErrorResponse(res, 'Failed to save location details', 500, error.message);
    }
  }

  async getLocationScreen(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      sendSuccessResponse(res, 'Location details retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        structural_identity: structure.structural_identity || {},
        location: structure.location || { coordinates: {} }
      });

    } catch (error) {
      console.error('❌ Location get error:', error);
      sendErrorResponse(res, 'Failed to get location details', 500, error.message);
    }
  }

  async updateLocationScreen(req, res) {
    return this.saveLocationScreen(req, res);
  }

  // =================== SCREEN 2: ADMINISTRATIVE ===================

  async saveAdministrativeScreen(req, res) {
    try {
      const { id } = req.params;
      const { client_name, custodian, engineer_designation, contact_details, email_id } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      structure.administration = {
        client_name,
        custodian,
        engineer_designation,
        contact_details,
        email_id
      };
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendSuccessResponse(res, 'Administrative details saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        administration: structure.administration
      });

    } catch (error) {
      console.error('❌ Administrative save error:', error);
      sendErrorResponse(res, 'Failed to save administrative details', 500, error.message);
    }
  }

  async getAdministrativeScreen(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      sendSuccessResponse(res, 'Administrative details retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        administration: structure.administration || {}
      });

    } catch (error) {
      console.error('❌ Administrative get error:', error);
      sendErrorResponse(res, 'Failed to get administrative details', 500, error.message);
    }
  }

  async updateAdministrativeScreen(req, res) {
    return this.saveAdministrativeScreen(req, res);
  }

  // =================== NEW: GEOMETRIC DETAILS (Building Dimensions Only) ===================

  async saveGeometricDetails(req, res) {
    try {
      const { id } = req.params;
      const { number_of_floors, structure_width, structure_length, structure_height } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      // Update only geometric details, not floors
      structure.geometric_details = {
        ...structure.geometric_details,
        number_of_floors: parseInt(number_of_floors),
        structure_width: parseFloat(structure_width),
        structure_length: parseFloat(structure_length),
        structure_height: parseFloat(structure_height)
      };
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendSuccessResponse(res, 'Geometric details saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        geometric_details: {
          number_of_floors: structure.geometric_details.number_of_floors,
          structure_width: structure.geometric_details.structure_width,
          structure_length: structure.geometric_details.structure_length,
          structure_height: structure.geometric_details.structure_height,
          total_area: structure.geometric_details.structure_width * structure.geometric_details.structure_length
        }
      });

    } catch (error) {
      console.error('❌ Geometric details save error:', error);
      sendErrorResponse(res, 'Failed to save geometric details', 500, error.message);
    }
  }

  async getGeometricDetails(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const geometricData = structure.geometric_details || {};
      
      sendSuccessResponse(res, 'Geometric details retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        geometric_details: {
          number_of_floors: geometricData.number_of_floors,
          structure_width: geometricData.structure_width,
          structure_length: geometricData.structure_length,
          structure_height: geometricData.structure_height,
          total_area: geometricData.structure_width && geometricData.structure_length ? 
            geometricData.structure_width * geometricData.structure_length : null
        }
      });

    } catch (error) {
      console.error('❌ Geometric details get error:', error);
      sendErrorResponse(res, 'Failed to get geometric details', 500, error.message);
    }
  }

  async updateGeometricDetails(req, res) {
    return this.saveGeometricDetails(req, res);
  }

  // =================== NEW: FLOORS MANAGEMENT ===================

// =================== FIXED: FLOORS MANAGEMENT ===================

async addFloors(req, res) {
  try {
    const { id } = req.params;
    const { floors } = req.body; // Array of floor objects
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    if (!structure.geometric_details) {
      return sendErrorResponse(res, 'Please save geometric details first', 400);
    }

    const createdFloors = [];
    
    floors.forEach((floorData, index) => {
      const floorId = this.generateFloorId();
      const newFloor = {
        // DON'T set _id manually - let MongoDB handle it
        floor_id: floorId, // Custom ID stored in separate field
        floor_number: floorData.floor_number || (index + 1),
        floor_type: floorData.floor_type || 'residential',
        floor_height: floorData.floor_height || null,
        total_area_sq_mts: floorData.total_area_sq_mts || null,
        floor_label_name: floorData.floor_label_name || `Floor ${floorData.floor_number || (index + 1)}`,
        number_of_flats: floorData.number_of_flats || 0, // Allow 0 flats for parking floors
        flats: [],
        floor_notes: floorData.floor_notes || ''
      };
      
      structure.geometric_details.floors.push(newFloor);
      createdFloors.push({
        floor_id: floorId,
        floor_number: newFloor.floor_number,
        floor_type: newFloor.floor_type,
        floor_label_name: newFloor.floor_label_name
      });
    });
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendCreatedResponse(res, {
      structure_id: id,
      floors_added: createdFloors.length,
      floors: createdFloors
    }, `${createdFloors.length} floor(s) added successfully`);

  } catch (error) {
    console.error('❌ Add floors error:', error);
    sendErrorResponse(res, 'Failed to add floors', 500, error.message);
  }
}

async getFloors(req, res) {
  try {
    const { id } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    const floors = structure.geometric_details?.floors || [];
    const floorsData = floors.map(floor => ({
      floor_id: floor.floor_id, // Use custom floor_id field
      mongodb_id: floor._id, // Include MongoDB ID if needed
      floor_number: floor.floor_number,
      floor_type: floor.floor_type,
      floor_height: floor.floor_height,
      total_area_sq_mts: floor.total_area_sq_mts,
      floor_label_name: floor.floor_label_name,
      number_of_flats: floor.flats ? floor.flats.length : 0,
      floor_notes: floor.floor_notes
    }));
    
    sendSuccessResponse(res, 'Floors retrieved successfully', {
      structure_id: id,
      total_floors: floorsData.length,
      floors: floorsData
    });

  } catch (error) {
    console.error('❌ Get floors error:', error);
    sendErrorResponse(res, 'Failed to get floors', 500, error.message);
  }
}

async getFloorById(req, res) {
  try {
    const { id, floorId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    sendSuccessResponse(res, 'Floor details retrieved successfully', {
      structure_id: id,
      floor: {
        floor_id: floor.floor_id,
        mongodb_id: floor._id,
        floor_number: floor.floor_number,
        floor_type: floor.floor_type,
        floor_height: floor.floor_height,
        total_area_sq_mts: floor.total_area_sq_mts,
        floor_label_name: floor.floor_label_name,
        number_of_flats: floor.flats ? floor.flats.length : 0,
        floor_notes: floor.floor_notes,
        flats: floor.flats || []
      }
    });

  } catch (error) {
    console.error('❌ Get floor error:', error);
    sendErrorResponse(res, 'Failed to get floor details', 500, error.message);
  }
}

async updateFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const updateData = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Update floor properties
    Object.keys(updateData).forEach(key => {
      if (key !== 'flats' && updateData[key] !== undefined) {
        floor[key] = updateData[key];
      }
    });
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendUpdatedResponse(res, {
      structure_id: id,
      floor_id: floorId,
      updated_floor: {
        floor_id: floor.floor_id,
        floor_number: floor.floor_number,
        floor_type: floor.floor_type,
        floor_label_name: floor.floor_label_name
      }
    }, 'Floor updated successfully');

  } catch (error) {
    console.error('❌ Update floor error:', error);
    sendErrorResponse(res, 'Failed to update floor', 500, error.message);
  }
}

async deleteFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor index by custom floor_id field
    const floorIndex = structure.geometric_details?.floors?.findIndex(
      floor => floor.floor_id === floorId
    );
    
    if (floorIndex === -1) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    structure.geometric_details.floors.splice(floorIndex, 1);
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Floor deleted successfully', {
      structure_id: id,
      deleted_floor_id: floorId
    });

  } catch (error) {
    console.error('❌ Delete floor error:', error);
    sendErrorResponse(res, 'Failed to delete floor', 500, error.message);
  }
}

// =================== FIXED: FLATS MANAGEMENT ===================

async addFlatsToFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const { flats } = req.body; // Array of flat objects
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }

    const createdFlats = [];
    
    flats.forEach((flatData, index) => {
      const flatId = this.generateFlatId();
      const newFlat = {
        // DON'T set _id manually - let MongoDB handle it
        flat_id: flatId, // Custom ID stored in separate field
        flat_number: flatData.flat_number || `F${floor.floor_number}-${String(index + 1).padStart(2, '0')}`,
        flat_type: flatData.flat_type || '2bhk',
        area_sq_mts: flatData.area_sq_mts || null,
        direction_facing: flatData.direction_facing || 'north',
        occupancy_status: flatData.occupancy_status || 'occupied',
        // Initialize empty rating structures
        structural_rating: {
          beams: { rating: null, condition_comment: '', photos: [] },
          columns: { rating: null, condition_comment: '', photos: [] },
          slab: { rating: null, condition_comment: '', photos: [] },
          foundation: { rating: null, condition_comment: '', photos: [] }
        },
        non_structural_rating: {
          brick_plaster: { rating: null, condition_comment: '', photos: [] },
          doors_windows: { rating: null, condition_comment: '', photos: [] },
          flooring_tiles: { rating: null, condition_comment: '', photos: [] },
          electrical_wiring: { rating: null, condition_comment: '', photos: [] },
          sanitary_fittings: { rating: null, condition_comment: '', photos: [] },
          railings: { rating: null, condition_comment: '', photos: [] },
          water_tanks: { rating: null, condition_comment: '', photos: [] },
          plumbing: { rating: null, condition_comment: '', photos: [] },
          sewage_system: { rating: null, condition_comment: '', photos: [] },
          panel_board: { rating: null, condition_comment: '', photos: [] },
          lifts: { rating: null, condition_comment: '', photos: [] }
        },
        flat_notes: flatData.flat_notes || ''
      };
      
      floor.flats.push(newFlat);
      createdFlats.push({
        flat_id: flatId,
        flat_number: newFlat.flat_number,
        flat_type: newFlat.flat_type,
        area_sq_mts: newFlat.area_sq_mts
      });
    });
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendCreatedResponse(res, {
      structure_id: id,
      floor_id: floorId,
      flats_added: createdFlats.length,
      flats: createdFlats
    }, `${createdFlats.length} flat(s) added successfully`);

  } catch (error) {
    console.error('❌ Add flats error:', error);
    sendErrorResponse(res, 'Failed to add flats', 500, error.message);
  }
}

async getFlatsInFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const flatsData = floor.flats.map(flat => ({
      flat_id: flat.flat_id, // Use custom flat_id field
      mongodb_id: flat._id, // Include MongoDB ID if needed
      flat_number: flat.flat_number,
      flat_type: flat.flat_type,
      area_sq_mts: flat.area_sq_mts,
      direction_facing: flat.direction_facing,
      occupancy_status: flat.occupancy_status,
      flat_notes: flat.flat_notes,
      has_structural_ratings: this.hasStructuralRating(flat),
      has_non_structural_ratings: this.hasNonStructuralRating(flat)
    }));
    
    sendSuccessResponse(res, 'Flats retrieved successfully', {
      structure_id: id,
      floor_id: floorId,
      floor_number: floor.floor_number,
      total_flats: flatsData.length,
      flats: flatsData
    });

  } catch (error) {
    console.error('❌ Get flats error:', error);
    sendErrorResponse(res, 'Failed to get flats', 500, error.message);
  }
}

async getFlatById(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Find flat by custom flat_id field
    const flat = floor.flats.find(f => f.flat_id === flatId);
    if (!flat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    sendSuccessResponse(res, 'Flat details retrieved successfully', {
      structure_id: id,
      floor_id: floorId,
      flat: {
        flat_id: flat.flat_id,
        mongodb_id: flat._id,
        flat_number: flat.flat_number,
        flat_type: flat.flat_type,
        area_sq_mts: flat.area_sq_mts,
        direction_facing: flat.direction_facing,
        occupancy_status: flat.occupancy_status,
        flat_notes: flat.flat_notes,
        structural_rating: flat.structural_rating || {},
        non_structural_rating: flat.non_structural_rating || {}
      }
    });

  } catch (error) {
    console.error('❌ Get flat error:', error);
    sendErrorResponse(res, 'Failed to get flat details', 500, error.message);
  }
}

async updateFlat(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const updateData = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Find flat by custom flat_id field
    const flat = floor.flats.find(f => f.flat_id === flatId);
    if (!flat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Update flat properties (excluding ratings)
    Object.keys(updateData).forEach(key => {
      if (!['structural_rating', 'non_structural_rating'].includes(key) && updateData[key] !== undefined) {
        flat[key] = updateData[key];
      }
    });
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendUpdatedResponse(res, {
      structure_id: id,
      floor_id: floorId,
      flat_id: flatId,
      updated_flat: {
        flat_id: flat.flat_id,
        flat_number: flat.flat_number,
        flat_type: flat.flat_type
      }
    }, 'Flat updated successfully');

  } catch (error) {
    console.error('❌ Update flat error:', error);
    sendErrorResponse(res, 'Failed to update flat', 500, error.message);
  }
}

async deleteFlat(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Find flat index by custom flat_id field
    const flatIndex = floor.flats.findIndex(flat => flat.flat_id === flatId);
    if (flatIndex === -1) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    floor.flats.splice(flatIndex, 1);
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Flat deleted successfully', {
      structure_id: id,
      floor_id: floorId,
      deleted_flat_id: flatId
    });

  } catch (error) {
    console.error('❌ Delete flat error:', error);
    sendErrorResponse(res, 'Failed to delete flat', 500, error.message);
  }
}

// =================== FIXED: FLAT RATING METHODS ===================

async saveFlatStructuralRating(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { beams, columns, slab, foundation } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Find flat by custom flat_id field
    const flat = floor.flats.find(f => f.flat_id === flatId);
    if (!flat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Update structural ratings
    flat.structural_rating = {
      beams: {
        rating: parseInt(beams.rating),
        condition_comment: beams.condition_comment || '',
        inspection_date: new Date(),
        photos: beams.photos || []
      },
      columns: {
        rating: parseInt(columns.rating),
        condition_comment: columns.condition_comment || '',
        inspection_date: new Date(),
        photos: columns.photos || []
      },
      slab: {
        rating: parseInt(slab.rating),
        condition_comment: slab.condition_comment || '',
        inspection_date: new Date(),
        photos: slab.photos || []
      },
      foundation: {
        rating: parseInt(foundation.rating),
        condition_comment: foundation.condition_comment || '',
        inspection_date: new Date(),
        photos: foundation.photos || []
      }
    };
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Flat structural ratings saved successfully', {
      structure_id: id,
      floor_id: floorId,
      flat_id: flatId,
      flat_number: flat.flat_number,
      structural_rating: flat.structural_rating
    });

  } catch (error) {
    console.error('❌ Save flat structural rating error:', error);
    sendErrorResponse(res, 'Failed to save flat structural ratings', 500, error.message);
  }
}

async getFlatStructuralRating(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Find flat by custom flat_id field
    const flat = floor.flats.find(f => f.flat_id === flatId);
    if (!flat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    const defaultRating = { rating: null, condition_comment: '', photos: [] };
    
    sendSuccessResponse(res, 'Flat structural ratings retrieved successfully', {
      structure_id: id,
      floor_id: floorId,
      flat_id: flatId,
      flat_number: flat.flat_number,
      structural_rating: flat.structural_rating || {
        beams: defaultRating,
        columns: defaultRating,
        slab: defaultRating,
        foundation: defaultRating
      }
    });

  } catch (error) {
    console.error('❌ Get flat structural rating error:', error);
    sendErrorResponse(res, 'Failed to get flat structural ratings', 500, error.message);
  }
}

async updateFlatStructuralRating(req, res) {
  return this.saveFlatStructuralRating(req, res);
}

async saveFlatNonStructuralRating(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { 
      brick_plaster, doors_windows, flooring_tiles, electrical_wiring,
      sanitary_fittings, railings, water_tanks, plumbing,
      sewage_system, panel_board, lifts 
    } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Find flat by custom flat_id field
    const flat = floor.flats.find(f => f.flat_id === flatId);
    if (!flat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    // Update non-structural ratings
    flat.non_structural_rating = {
      brick_plaster: {
        rating: parseInt(brick_plaster.rating),
        condition_comment: brick_plaster.condition_comment || '',
        photos: brick_plaster.photos || []
      },
      doors_windows: {
        rating: parseInt(doors_windows.rating),
        condition_comment: doors_windows.condition_comment || '',
        photos: doors_windows.photos || []
      },
      flooring_tiles: {
        rating: parseInt(flooring_tiles.rating),
        condition_comment: flooring_tiles.condition_comment || '',
        photos: flooring_tiles.photos || []
      },
      electrical_wiring: {
        rating: parseInt(electrical_wiring.rating),
        condition_comment: electrical_wiring.condition_comment || '',
        photos: electrical_wiring.photos || []
      },
      sanitary_fittings: {
        rating: parseInt(sanitary_fittings.rating),
        condition_comment: sanitary_fittings.condition_comment || '',
        photos: sanitary_fittings.photos || []
      },
      railings: {
        rating: parseInt(railings.rating),
        condition_comment: railings.condition_comment || '',
        photos: railings.photos || []
      },
      water_tanks: {
        rating: parseInt(water_tanks.rating),
        condition_comment: water_tanks.condition_comment || '',
        photos: water_tanks.photos || []
      },
      plumbing: {
        rating: parseInt(plumbing.rating),
        condition_comment: plumbing.condition_comment || '',
        photos: plumbing.photos || []
      },
      sewage_system: {
        rating: parseInt(sewage_system.rating),
        condition_comment: sewage_system.condition_comment || '',
        photos: sewage_system.photos || []
      },
      panel_board: {
        rating: parseInt(panel_board.rating),
        condition_comment: panel_board.condition_comment || '',
        photos: panel_board.photos || []
      },
      lifts: {
        rating: parseInt(lifts.rating),
        condition_comment: lifts.condition_comment || '',
        photos: lifts.photos || []
      }
    };
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendSuccessResponse(res, 'Flat non-structural ratings saved successfully', {
      structure_id: id,
      floor_id: floorId,
      flat_id: flatId,
      flat_number: flat.flat_number,
      non_structural_rating: flat.non_structural_rating
    });

  } catch (error) {
    console.error('❌ Save flat non-structural rating error:', error);
    sendErrorResponse(res, 'Failed to save flat non-structural ratings', 500, error.message);
  }
}

async getFlatNonStructuralRating(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Find floor by custom floor_id field
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    // Find flat by custom flat_id field
    const flat = floor.flats.find(f => f.flat_id === flatId);
    if (!flat) {
      return sendErrorResponse(res, 'Flat not found', 404);
    }
    
    const defaultRating = { rating: null, condition_comment: '', photos: [] };
    
    sendSuccessResponse(res, 'Flat non-structural ratings retrieved successfully', {
      structure_id: id,
      floor_id: floorId,
      flat_id: flatId,
      flat_number: flat.flat_number,
      non_structural_rating: flat.non_structural_rating || {
        brick_plaster: defaultRating,
        doors_windows: defaultRating,
        flooring_tiles: defaultRating,
        electrical_wiring: defaultRating,
        sanitary_fittings: defaultRating,
        railings: defaultRating,
        water_tanks: defaultRating,
        plumbing: defaultRating,
        sewage_system: defaultRating,
        panel_board: defaultRating,
        lifts: defaultRating
      }
    });

  } catch (error) {
    console.error('❌ Get flat non-structural rating error:', error);
    sendErrorResponse(res, 'Failed to get flat non-structural ratings', 500, error.message);
  }
}

async updateFlatNonStructuralRating(req, res) {
  return this.saveFlatNonStructuralRating(req, res);
}

  // =================== NEW: OVERALL STRUCTURE RATINGS ===================

  async saveOverallStructuralRating(req, res) {
    try {
      const { id } = req.params;
      const { beams, columns, slab, foundation } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      // Update overall structural ratings
      structure.overall_structural_rating = {
        beams: {
          rating: parseInt(beams.rating),
          condition_comment: beams.condition_comment || '',
          inspection_date: new Date(),
          photos: beams.photos || []
        },
        columns: {
          rating: parseInt(columns.rating),
          condition_comment: columns.condition_comment || '',
          inspection_date: new Date(),
          photos: columns.photos || []
        },
        slab: {
          rating: parseInt(slab.rating),
          condition_comment: slab.condition_comment || '',
          inspection_date: new Date(),
          photos: slab.photos || []
        },
        foundation: {
          rating: parseInt(foundation.rating),
          condition_comment: foundation.condition_comment || '',
          inspection_date: new Date(),
          photos: foundation.photos || []
        }
      };
      
      // Calculate overall average and health status
      const ratings = [
        structure.overall_structural_rating.beams.rating,
        structure.overall_structural_rating.columns.rating,
        structure.overall_structural_rating.slab.rating,
        structure.overall_structural_rating.foundation.rating
      ];
      
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      structure.overall_structural_rating.overall_average = Math.round(average * 10) / 10;
      
      // Determine health status
      if (average >= 4) {
        structure.overall_structural_rating.health_status = 'Good';
        structure.overall_structural_rating.priority = 'Low';
      } else if (average >= 3) {
        structure.overall_structural_rating.health_status = 'Fair';
        structure.overall_structural_rating.priority = 'Medium';
      } else if (average >= 2) {
        structure.overall_structural_rating.health_status = 'Poor';
        structure.overall_structural_rating.priority = 'High';
      } else {
        structure.overall_structural_rating.health_status = 'Critical';
        structure.overall_structural_rating.priority = 'Critical';
      }
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendSuccessResponse(res, 'Overall structural ratings saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        overall_structural_rating: structure.overall_structural_rating
      });

    } catch (error) {
      console.error('❌ Save overall structural rating error:', error);
      sendErrorResponse(res, 'Failed to save overall structural ratings', 500, error.message);
    }
  }

  async getOverallStructuralRating(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const defaultRating = { rating: null, condition_comment: '', photos: [] };
      
      sendSuccessResponse(res, 'Overall structural ratings retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        overall_structural_rating: structure.overall_structural_rating || {
          beams: defaultRating,
          columns: defaultRating,
          slab: defaultRating,
          foundation: defaultRating,
          overall_average: null,
          health_status: null,
          priority: null
        }
      });

    } catch (error) {
      console.error('❌ Get overall structural rating error:', error);
      sendErrorResponse(res, 'Failed to get overall structural ratings', 500, error.message);
    }
  }


  // Add these methods to your structureController.js

/**
 * Save bulk ratings for multiple floors and flats in a single request
 * @route POST /api/structures/:id/ratings
 * @desc Save ratings for multiple floors/flats at once
 * @access Private
 */
async saveBulkRatings(req, res) {
  try {
    const { id } = req.params;
    const { floors } = req.body;
    
    if (!floors || !Array.isArray(floors) || floors.length === 0) {
      return sendErrorResponse(res, 'Floors data is required and must be an array', 400);
    }
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    let updatedFloors = 0;
    let updatedFlats = 0;
    let errors = [];
    
    // Process each floor in the request
    for (const floorData of floors) {
      const { floor_number, flats } = floorData;
      
      if (!floor_number || !flats || !Array.isArray(flats)) {
        errors.push(`Invalid data for floor ${floor_number || 'unknown'}`);
        continue;
      }
      
      // Find the floor in the structure
      const existingFloor = structure.geometric_details?.floors?.find(
        f => f.floor_number === floor_number
      );
      
      if (!existingFloor) {
        errors.push(`Floor ${floor_number} not found in structure`);
        continue;
      }
      
      // Process each flat in the floor
      for (const flatData of flats) {
        const { flat_number, structural_rating, non_structural_rating } = flatData;
        
        if (!flat_number) {
          errors.push(`Flat number missing for floor ${floor_number}`);
          continue;
        }
        
        // Find the flat in the floor
        const existingFlat = existingFloor.flats?.find(
          f => f.flat_number === flat_number
        );
        
        if (!existingFlat) {
          errors.push(`Flat ${flat_number} not found in floor ${floor_number}`);
          continue;
        }
        
        // Update structural ratings if provided
        if (structural_rating) {
          try {
            this.updateFlatRatings(existingFlat, 'structural_rating', structural_rating);
            console.log(`✅ Updated structural ratings for ${flat_number}`);
          } catch (error) {
            errors.push(`Error updating structural ratings for ${flat_number}: ${error.message}`);
          }
        }
        
        // Update non-structural ratings if provided
        if (non_structural_rating) {
          try {
            this.updateFlatRatings(existingFlat, 'non_structural_rating', non_structural_rating);
            console.log(`✅ Updated non-structural ratings for ${flat_number}`);
          } catch (error) {
            errors.push(`Error updating non-structural ratings for ${flat_number}: ${error.message}`);
          }
        }
        
        updatedFlats++;
      }
      
      updatedFloors++;
    }
    
    // Save the structure
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    // Calculate progress after updates
    const progress = this.calculateProgress(structure);
    
    const response = {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      updated_floors: updatedFloors,
      updated_flats: updatedFlats,
      progress: progress,
      errors: errors.length > 0 ? errors : undefined
    };
    
    if (errors.length > 0) {
      console.warn(`⚠️ Bulk ratings completed with ${errors.length} errors`);
      return sendSuccessResponse(res, 
        `Bulk ratings saved with ${errors.length} errors. Updated ${updatedFlats} flats across ${updatedFloors} floors.`, 
        response
      );
    }
    
    sendSuccessResponse(res, 
      `Bulk ratings saved successfully. Updated ${updatedFlats} flats across ${updatedFloors} floors.`, 
      response
    );

  } catch (error) {
    console.error('❌ Bulk ratings save error:', error);
    sendErrorResponse(res, 'Failed to save bulk ratings', 500, error.message);
  }
}

/**
 * Get bulk ratings for all floors and flats
 * @route GET /api/structures/:id/ratings
 * @desc Get ratings for all floors/flats in the structure
 * @access Private
 */
async getBulkRatings(req, res) {
  try {
    const { id } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    if (!structure.geometric_details?.floors || structure.geometric_details.floors.length === 0) {
      return sendSuccessResponse(res, 'No floors found in structure', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        floors: []
      });
    }
    
    const floorsWithRatings = structure.geometric_details.floors.map(floor => ({
      floor_number: floor.floor_number,
      floor_type: floor.floor_type,
      floor_label_name: floor.floor_label_name,
      total_flats: floor.flats ? floor.flats.length : 0,
      flats: floor.flats ? floor.flats.map(flat => ({
        flat_number: flat.flat_number,
        flat_type: flat.flat_type,
        area_sq_mts: flat.area_sq_mts,
        direction_facing: flat.direction_facing,
        occupancy_status: flat.occupancy_status,
        structural_rating: flat.structural_rating || this.getDefaultStructuralRating(),
        non_structural_rating: flat.non_structural_rating || this.getDefaultNonStructuralRating(),
        has_structural_ratings: this.hasStructuralRating(flat),
        has_non_structural_ratings: this.hasNonStructuralRating(flat),
        flat_notes: flat.flat_notes
      })) : []
    }));
    
    sendSuccessResponse(res, 'Bulk ratings retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      total_floors: floorsWithRatings.length,
      total_flats: floorsWithRatings.reduce((sum, floor) => sum + floor.total_flats, 0),
      floors: floorsWithRatings
    });

  } catch (error) {
    console.error('❌ Bulk ratings get error:', error);
    sendErrorResponse(res, 'Failed to get bulk ratings', 500, error.message);
  }
}

/**
 * Update bulk ratings for multiple floors and flats
 * @route PUT /api/structures/:id/ratings
 * @desc Update ratings for multiple floors/flats at once
 * @access Private
 */
async updateBulkRatings(req, res) {
  return this.saveBulkRatings(req, res);
}

// =================== HELPER METHODS ===================

/**
 * Helper method to update flat ratings
 * @param {Object} flat - The flat object to update
 * @param {String} ratingType - 'structural_rating' or 'non_structural_rating'
 * @param {Object} ratingsData - The ratings data to apply
 */
updateFlatRatings(flat, ratingType, ratingsData) {
  if (!flat[ratingType]) {
    flat[ratingType] = {};
  }
  
  const inspectionDate = new Date();
  
  // Update each component rating
  Object.keys(ratingsData).forEach(component => {
    const componentData = ratingsData[component];
    
    if (componentData && typeof componentData === 'object' && componentData.rating) {
      flat[ratingType][component] = {
        rating: parseInt(componentData.rating),
        condition_comment: componentData.condition_comment || '',
        inspection_date: inspectionDate,
        photos: Array.isArray(componentData.photos) ? componentData.photos : [],
        inspector_notes: componentData.inspector_notes || ''
      };
    }
  });
}


/**
 * Save bulk ratings for multiple floors and flats in a single request
 * @route POST /api/structures/:id/ratings
 * @desc Save ratings for multiple floors/flats at once
 * @access Private
 */
async saveBulkRatings(req, res) {
  try {
    console.log('🚀 Starting bulk ratings save...');
    const { id } = req.params;
    const { floors } = req.body;
    
    console.log(`📊 Processing ${floors?.length || 0} floors for structure ${id}`);
    
    if (!floors || !Array.isArray(floors) || floors.length === 0) {
      return sendErrorResponse(res, 'Floors data is required and must be an array', 400);
    }
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    console.log(`👤 Found user: ${user.username}, structure: ${structure.structural_identity?.uid}`);
    
    let updatedFloors = 0;
    let updatedFlats = 0;
    let errors = [];
    
    // Process each floor in the request
    for (const floorData of floors) {
      const { floor_number, flats } = floorData;
      console.log(`🏢 Processing floor ${floor_number} with ${flats?.length || 0} flats`);
      
      if (!floor_number || !flats || !Array.isArray(flats)) {
        const error = `Invalid data for floor ${floor_number || 'unknown'}`;
        console.error(`❌ ${error}`);
        errors.push(error);
        continue;
      }
      
      // Find the floor in the structure
      const existingFloor = structure.geometric_details?.floors?.find(
        f => f.floor_number === floor_number
      );
      
      if (!existingFloor) {
        const error = `Floor ${floor_number} not found in structure`;
        console.error(`❌ ${error}`);
        errors.push(error);
        continue;
      }
      
      console.log(`✅ Found floor ${floor_number} with ${existingFloor.flats?.length || 0} existing flats`);
      
      // Process each flat in the floor
      for (const flatData of flats) {
        const { flat_number, structural_rating, non_structural_rating } = flatData;
        console.log(`🏠 Processing flat ${flat_number}`);
        
        if (!flat_number) {
          const error = `Flat number missing for floor ${floor_number}`;
          console.error(`❌ ${error}`);
          errors.push(error);
          continue;
        }
        
        // Find the flat in the floor
        const existingFlat = existingFloor.flats?.find(
          f => f.flat_number === flat_number
        );
        
        if (!existingFlat) {
          const error = `Flat ${flat_number} not found in floor ${floor_number}`;
          console.error(`❌ ${error}`);
          errors.push(error);
          continue;
        }
        
        console.log(`✅ Found flat ${flat_number}`);
        
        // Update structural ratings if provided
        if (structural_rating) {
          try {
            this.updateFlatRatings(existingFlat, 'structural_rating', structural_rating);
            console.log(`✅ Updated structural ratings for ${flat_number}`);
          } catch (error) {
            const errorMsg = `Error updating structural ratings for ${flat_number}: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
        
        // Update non-structural ratings if provided
        if (non_structural_rating) {
          try {
            this.updateFlatRatings(existingFlat, 'non_structural_rating', non_structural_rating);
            console.log(`✅ Updated non-structural ratings for ${flat_number}`);
          } catch (error) {
            const errorMsg = `Error updating non-structural ratings for ${flat_number}: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
        
        updatedFlats++;
      }
      
      updatedFloors++;
    }
    
    // Save the structure
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    console.log('💾 Structure saved successfully');
    
    // Calculate progress after updates
    const progress = this.calculateProgress(structure);
    
    const response = {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      updated_floors: updatedFloors,
      updated_flats: updatedFlats,
      progress: progress,
      errors: errors.length > 0 ? errors : undefined
    };
    
    if (errors.length > 0) {
      console.warn(`⚠️ Bulk ratings completed with ${errors.length} errors`);
      return sendSuccessResponse(res, 
        `Bulk ratings saved with ${errors.length} errors. Updated ${updatedFlats} flats across ${updatedFloors} floors.`, 
        response
      );
    }
    
    sendSuccessResponse(res, 
      `Bulk ratings saved successfully. Updated ${updatedFlats} flats across ${updatedFloors} floors.`, 
      response
    );

  } catch (error) {
    console.error('❌ Bulk ratings save error:', error);
    console.error('❌ Error stack:', error.stack);
    sendErrorResponse(res, 'Failed to save bulk ratings', 500, error.message);
  }
}

/**
 * Get bulk ratings for all floors and flats
 * @route GET /api/structures/:id/ratings
 * @desc Get ratings for all floors/flats in the structure
 * @access Private
 */
async getBulkRatings(req, res) {
  try {
    console.log('📊 Getting bulk ratings...');
    const { id } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    if (!structure.geometric_details?.floors || structure.geometric_details.floors.length === 0) {
      return sendSuccessResponse(res, 'No floors found in structure', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        floors: []
      });
    }
    
    const floorsWithRatings = structure.geometric_details.floors.map(floor => ({
      floor_number: floor.floor_number,
      floor_type: floor.floor_type,
      floor_label_name: floor.floor_label_name,
      total_flats: floor.flats ? floor.flats.length : 0,
      flats: floor.flats ? floor.flats.map(flat => ({
        flat_number: flat.flat_number,
        flat_type: flat.flat_type,
        area_sq_mts: flat.area_sq_mts,
        direction_facing: flat.direction_facing,
        occupancy_status: flat.occupancy_status,
        structural_rating: flat.structural_rating || this.getDefaultStructuralRating(),
        non_structural_rating: flat.non_structural_rating || this.getDefaultNonStructuralRating(),
        has_structural_ratings: this.hasStructuralRating(flat),
        has_non_structural_ratings: this.hasNonStructuralRating(flat),
        flat_notes: flat.flat_notes
      })) : []
    }));
    
    sendSuccessResponse(res, 'Bulk ratings retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      total_floors: floorsWithRatings.length,
      total_flats: floorsWithRatings.reduce((sum, floor) => sum + floor.total_flats, 0),
      floors: floorsWithRatings
    });

  } catch (error) {
    console.error('❌ Bulk ratings get error:', error);
    sendErrorResponse(res, 'Failed to get bulk ratings', 500, error.message);
  }
}

/**
 * Update bulk ratings for multiple floors and flats
 * @route PUT /api/structures/:id/ratings
 * @desc Update ratings for multiple floors/flats at once
 * @access Private
 */
async updateBulkRatings(req, res) {
  return this.saveBulkRatings(req, res);
}

// =================== HELPER METHODS ===================

/**
 * Helper method to update flat ratings
 * @param {Object} flat - The flat object to update
 * @param {String} ratingType - 'structural_rating' or 'non_structural_rating'
 * @param {Object} ratingsData - The ratings data to apply
 */
updateFlatRatings(flat, ratingType, ratingsData) {
  if (!flat[ratingType]) {
    flat[ratingType] = {};
  }
  
  const inspectionDate = new Date();
  console.log(`🔧 Updating ${ratingType} with ${Object.keys(ratingsData).length} components`);
  
  // Update each component rating
  Object.keys(ratingsData).forEach(component => {
    const componentData = ratingsData[component];
    
    if (componentData && typeof componentData === 'object' && componentData.rating) {
      flat[ratingType][component] = {
        rating: parseInt(componentData.rating),
        condition_comment: componentData.condition_comment || '',
        inspection_date: inspectionDate,
        photos: Array.isArray(componentData.photos) ? componentData.photos : [],
        inspector_notes: componentData.inspector_notes || ''
      };
      console.log(`  ✅ Updated ${component}: rating ${componentData.rating}`);
    }
  });
}

/**
 * Get default structural rating structure
 */
getDefaultStructuralRating() {
  const defaultRating = { rating: null, condition_comment: '', photos: [], inspection_date: null };
  return {
    beams: { ...defaultRating },
    columns: { ...defaultRating },
    slab: { ...defaultRating },
    foundation: { ...defaultRating }
  };
}

/**
 * Get default non-structural rating structure
 */
getDefaultNonStructuralRating() {
  const defaultRating = { rating: null, condition_comment: '', photos: [], inspection_date: null };
  return {
    brick_plaster: { ...defaultRating },
    doors_windows: { ...defaultRating },
    flooring_tiles: { ...defaultRating },
    electrical_wiring: { ...defaultRating },
    sanitary_fittings: { ...defaultRating },
    railings: { ...defaultRating },
    water_tanks: { ...defaultRating },
    plumbing: { ...defaultRating },
    sewage_system: { ...defaultRating },
    panel_board: { ...defaultRating },
    lifts: { ...defaultRating }
  };
}

/**
 * Get default structural rating structure
 */
getDefaultStructuralRating() {
  const defaultRating = { rating: null, condition_comment: '', photos: [], inspection_date: null };
  return {
    beams: defaultRating,
    columns: defaultRating,
    slab: defaultRating,
    foundation: defaultRating
  };
}

/**
 * Get default non-structural rating structure
 */
getDefaultNonStructuralRating() {
  const defaultRating = { rating: null, condition_comment: '', photos: [], inspection_date: null };
  return {
    brick_plaster: defaultRating,
    doors_windows: defaultRating,
    flooring_tiles: defaultRating,
    electrical_wiring: defaultRating,
    sanitary_fittings: defaultRating,
    railings: defaultRating,
    water_tanks: defaultRating,
    plumbing: defaultRating,
    sewage_system: defaultRating,
    panel_board: defaultRating,
    lifts: defaultRating
  };
}

/**
 * Validate bulk ratings data structure
 * @param {Object} requestBody - The request body to validate
 * @returns {Array} Array of validation errors
 */
validateBulkRatingsData(requestBody) {
  const errors = [];
  const { floors } = requestBody;
  
  if (!floors || !Array.isArray(floors)) {
    errors.push('Floors must be an array');
    return errors;
  }
  
  floors.forEach((floor, floorIndex) => {
    if (!floor.floor_number) {
      errors.push(`Floor ${floorIndex + 1}: floor_number is required`);
    }
    
    if (!floor.flats || !Array.isArray(floor.flats)) {
      errors.push(`Floor ${floor.floor_number || floorIndex + 1}: flats must be an array`);
      return;
    }
    
    floor.flats.forEach((flat, flatIndex) => {
      if (!flat.flat_number) {
        errors.push(`Floor ${floor.floor_number}, Flat ${flatIndex + 1}: flat_number is required`);
      }
      
      // Validate structural ratings if provided
      if (flat.structural_rating) {
        const structuralErrors = this.validateRatingComponents(
          flat.structural_rating, 
          ['beams', 'columns', 'slab', 'foundation'],
          `Floor ${floor.floor_number}, Flat ${flat.flat_number}, Structural`
        );
        errors.push(...structuralErrors);
      }
      
      // Validate non-structural ratings if provided
      if (flat.non_structural_rating) {
        const nonStructuralErrors = this.validateRatingComponents(
          flat.non_structural_rating,
          ['brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
           'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
           'sewage_system', 'panel_board', 'lifts'],
          `Floor ${floor.floor_number}, Flat ${flat.flat_number}, Non-Structural`
        );
        errors.push(...nonStructuralErrors);
      }
    });
  });
  
  return errors;
}

/**
 * Validate rating components
 * @param {Object} ratings - Rating object to validate
 * @param {Array} requiredComponents - Array of required component names
 * @param {String} context - Context for error messages
 * @returns {Array} Array of validation errors
 */
validateRatingComponents(ratings, requiredComponents, context) {
  const errors = [];
  
  requiredComponents.forEach(component => {
    const rating = ratings[component];
    if (rating) {
      if (!rating.rating || rating.rating < 1 || rating.rating > 5) {
        errors.push(`${context} - ${component}: rating must be between 1 and 5`);
      }
      
      // Check if photos are required for low ratings
      if (rating.rating < 3 && (!rating.photos || rating.photos.length === 0)) {
        errors.push(`${context} - ${component}: photos are required when rating is below 3`);
      }
      
      if (rating.condition_comment && rating.condition_comment.length > 1000) {
        errors.push(`${context} - ${component}: condition comment cannot exceed 1000 characters`);
      }
    }
  });
  
  return errors;
}

  async updateOverallStructuralRating(req, res) {
    return this.saveOverallStructuralRating(req, res);
  }

  async saveOverallNonStructuralRating(req, res) {
    try {
      const { id } = req.params;
      const { 
        brick_plaster, doors_windows, flooring_tiles, electrical_wiring,
        sanitary_fittings, railings, water_tanks, plumbing,
        sewage_system, panel_board, lifts 
      } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      // Update overall non-structural ratings
      structure.overall_non_structural_rating = {
        brick_plaster: {
          rating: parseInt(brick_plaster.rating),
          condition_comment: brick_plaster.condition_comment || '',
          photos: brick_plaster.photos || []
        },
        doors_windows: {
          rating: parseInt(doors_windows.rating),
          condition_comment: doors_windows.condition_comment || '',
          photos: doors_windows.photos || []
        },
        flooring_tiles: {
          rating: parseInt(flooring_tiles.rating),
          condition_comment: flooring_tiles.condition_comment || '',
          photos: flooring_tiles.photos || []
        },
        electrical_wiring: {
          rating: parseInt(electrical_wiring.rating),
          condition_comment: electrical_wiring.condition_comment || '',
          photos: electrical_wiring.photos || []
        },
        sanitary_fittings: {
          rating: parseInt(sanitary_fittings.rating),
          condition_comment: sanitary_fittings.condition_comment || '',
          photos: sanitary_fittings.photos || []
        },
        railings: {
          rating: parseInt(railings.rating),
          condition_comment: railings.condition_comment || '',
          photos: railings.photos || []
        },
        water_tanks: {
          rating: parseInt(water_tanks.rating),
          condition_comment: water_tanks.condition_comment || '',
          photos: water_tanks.photos || []
        },
        plumbing: {
          rating: parseInt(plumbing.rating),
          condition_comment: plumbing.condition_comment || '',
          photos: plumbing.photos || []
        },
        sewage_system: {
          rating: parseInt(sewage_system.rating),
          condition_comment: sewage_system.condition_comment || '',
          photos: sewage_system.photos || []
        },
        panel_board: {
          rating: parseInt(panel_board.rating),
          condition_comment: panel_board.condition_comment || '',
          photos: panel_board.photos || []
        },
        lifts: {
          rating: parseInt(lifts.rating),
          condition_comment: lifts.condition_comment || '',
          photos: lifts.photos || []
        }
      };
      
      // Calculate overall average
      const ratings = [
        structure.overall_non_structural_rating.brick_plaster.rating,
        structure.overall_non_structural_rating.doors_windows.rating,
        structure.overall_non_structural_rating.flooring_tiles.rating,
        structure.overall_non_structural_rating.electrical_wiring.rating,
        structure.overall_non_structural_rating.sanitary_fittings.rating,
        structure.overall_non_structural_rating.railings.rating,
        structure.overall_non_structural_rating.water_tanks.rating,
        structure.overall_non_structural_rating.plumbing.rating,
        structure.overall_non_structural_rating.sewage_system.rating,
        structure.overall_non_structural_rating.panel_board.rating,
        structure.overall_non_structural_rating.lifts.rating
      ];
      
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      structure.overall_non_structural_rating.overall_average = Math.round(average * 10) / 10;
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      sendSuccessResponse(res, 'Overall non-structural ratings saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        overall_non_structural_rating: structure.overall_non_structural_rating
      });

    } catch (error) {
      console.error('❌ Save overall non-structural rating error:', error);
      sendErrorResponse(res, 'Failed to save overall non-structural ratings', 500, error.message);
    }
  }

  async getOverallNonStructuralRating(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const defaultRating = { rating: null, condition_comment: '', photos: [] };
      
      sendSuccessResponse(res, 'Overall non-structural ratings retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        overall_non_structural_rating: structure.overall_non_structural_rating || {
          brick_plaster: defaultRating,
          doors_windows: defaultRating,
          flooring_tiles: defaultRating,
          electrical_wiring: defaultRating,
          sanitary_fittings: defaultRating,
          railings: defaultRating,
          water_tanks: defaultRating,
          plumbing: defaultRating,
          sewage_system: defaultRating,
          panel_board: defaultRating,
          lifts: defaultRating,
          overall_average: null
        }
      });

    } catch (error) {
      console.error('❌ Get overall non-structural rating error:', error);
      sendErrorResponse(res, 'Failed to get overall non-structural ratings', 500, error.message);
    }
  }

  async updateOverallNonStructuralRating(req, res) {
    return this.saveOverallNonStructuralRating(req, res);
  }

  // =================== HELPER METHODS ===================

  hasStructuralRating(flat) {
    return flat.structural_rating && 
           flat.structural_rating.beams?.rating &&
           flat.structural_rating.columns?.rating &&
           flat.structural_rating.slab?.rating &&
           flat.structural_rating.foundation?.rating;
  }

  hasNonStructuralRating(flat) {
    return flat.non_structural_rating &&
           flat.non_structural_rating.brick_plaster?.rating &&
           flat.non_structural_rating.doors_windows?.rating &&
           flat.non_structural_rating.flooring_tiles?.rating &&
           flat.non_structural_rating.electrical_wiring?.rating &&
           flat.non_structural_rating.sanitary_fittings?.rating &&
           flat.non_structural_rating.railings?.rating &&
           flat.non_structural_rating.water_tanks?.rating &&
           flat.non_structural_rating.plumbing?.rating &&
           flat.non_structural_rating.sewage_system?.rating &&
           flat.non_structural_rating.panel_board?.rating &&
           flat.non_structural_rating.lifts?.rating;
  }

  // =================== EXISTING METHODS (Structure Management) ===================

  async getStructureProgress(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const progress = this.calculateProgress(structure);
      
      sendSuccessResponse(res, 'Structure progress retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        status: structure.status,
        progress
      });

    } catch (error) {
      console.error('❌ Structure progress error:', error);
      sendErrorResponse(res, 'Failed to get structure progress', 500, error.message);
    }
  }

  calculateProgress(structure) {
    let progress = {
      location: false,
      administrative: false,
      geometric_details: false,
      floors_added: false,
      flats_added: false,
      flat_ratings_completed: false,
      overall_structural_completed: false,
      overall_non_structural_completed: false,
      overall_percentage: 0
    };

    // Check location
    if (structure.structural_identity?.structural_identity_number && structure.location?.coordinates?.latitude) {
      progress.location = true;
    }

    // Check administrative
    if (structure.administration?.client_name && structure.administration?.email_id) {
      progress.administrative = true;
    }

    // Check geometric details
    if (structure.geometric_details?.structure_width && structure.geometric_details?.structure_height) {
      progress.geometric_details = true;
    }

    // Check floors
    if (structure.geometric_details?.floors?.length > 0) {
      progress.floors_added = true;
      
      // Check flats
      const hasFlats = structure.geometric_details.floors.some(floor => floor.flats?.length > 0);
      if (hasFlats) {
        progress.flats_added = true;
        
        // Check if all flats have ratings
        let allFlatsRated = true;
        for (const floor of structure.geometric_details.floors) {
          if (floor.flats?.length > 0) {
            for (const flat of floor.flats) {
              if (!this.hasStructuralRating(flat) || !this.hasNonStructuralRating(flat)) {
                allFlatsRated = false;
                break;
              }
            }
          }
          if (!allFlatsRated) break;
        }
        progress.flat_ratings_completed = allFlatsRated;
      }
    }

    // Check overall ratings
    if (structure.overall_structural_rating?.beams?.rating) {
      progress.overall_structural_completed = true;
    }

    if (structure.overall_non_structural_rating?.brick_plaster?.rating) {
      progress.overall_non_structural_completed = true;
    }

    // Calculate percentage
    const completedSteps = Object.values(progress).filter(val => val === true).length;
    progress.overall_percentage = Math.round((completedSteps / 8) * 100);

    return progress;
  }

  async submitStructure(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const progress = this.calculateProgress(structure);
      
      if (progress.overall_percentage < 100) {
        return sendErrorResponse(res, 'Cannot submit incomplete structure', 400);
      }
      
      structure.status = 'submitted';
      structure.creation_info.last_updated_date = new Date();
      
      await user.save();
      
      sendSuccessResponse(res, 'Structure submitted successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        status: structure.status,
        submitted_at: structure.creation_info.last_updated_date
      });

    } catch (error) {
      console.error('❌ Structure submission error:', error);
      sendErrorResponse(res, 'Failed to submit structure', 500, error.message);
    }
  }

  // =================== UTILITY METHODS FOR LEGACY SUPPORT ===================

  async getNextSequenceForLocation(stateCode, districtCode, cityName, locationCode) {
    try {
      const locationPrefix = this.structureNumberGenerator.getLocationPrefix(
        stateCode, districtCode, cityName, locationCode
      );
      
      const pipeline = [
        { $unwind: '$structures' },
        {
          $match: {
            'structures.structural_identity.structural_identity_number': { 
              $regex: `^${locationPrefix}` 
            }
          }
        },
        {
          $project: {
            sequence: { 
              $substr: ['$structures.structural_identity.structural_identity_number', 10, 5] 
            }
          }
        },
        {
          $group: {
            _id: null,
            maxSequence: { 
              $max: { $toInt: '$sequence' } 
            }
          }
        }
      ];
      
      const result = await User.aggregate(pipeline);
      const maxSequence = result.length > 0 ? result[0].maxSequence : 0;
      
      const nextSequence = maxSequence + 1;
      return this.structureNumberGenerator.formatSequenceNumber(nextSequence);
      
    } catch (error) {
      console.error('Error getting next sequence:', error);
      return this.structureNumberGenerator.generateTimestampSequence();
    }
  }

  async validateStructureNumber(req, res) {
    try {
      const { structural_identity_number } = req.body;
      
      if (!structural_identity_number || structural_identity_number.length !== 17) {
        return sendErrorResponse(res, 'Invalid structure number format', 400);
      }
      
      const parsed = this.structureNumberGenerator.parseStructuralIdentityNumber(structural_identity_number);
      const isDuplicate = await this.checkDuplicateStructureNumber(structural_identity_number);
      
      sendSuccessResponse(res, 'Structure number validation completed', {
        is_valid: true,
        is_duplicate: isDuplicate,
        parsed_components: parsed,
        formatted_display: `${parsed.state_code}-${parsed.district_code}-${parsed.city_code}-${parsed.location_code}-${parsed.structure_sequence}-${parsed.type_code}`
      });
      
    } catch (error) {
      console.error('❌ Structure number validation error:', error);
      sendErrorResponse(res, 'Structure number validation failed', 400, error.message);
    }
  }

  async checkDuplicateStructureNumber(structuralIdentityNumber) {
    try {
      const existingUser = await User.findOne({
        'structures.structural_identity.structural_identity_number': structuralIdentityNumber
      });
      
      return existingUser ? true : false;
    } catch (error) {
      console.error('Error checking duplicate structure number:', error);
      return false;
    }
  }

  async getLocationStructureStats(req, res) {
    try {
      const { state_code, district_code, city_name, location_code } = req.query;
      
      if (!state_code || !district_code) {
        return sendErrorResponse(res, 'State code and district code are required', 400);
      }
      
      let locationPrefix = this.structureNumberGenerator.getLocationPrefix(
        state_code, 
        district_code, 
        city_name || 'XXXX', 
        location_code || 'XX'
      );
      
      if (!city_name && !location_code) {
        locationPrefix = `${state_code.toUpperCase().padEnd(2, 'X')}${district_code.padStart(2, '0')}`;
      } else if (!location_code) {
        locationPrefix = locationPrefix.substring(0, 8);
      }
      
      const stats = await User.aggregate([
        { $unwind: '$structures' },
        {
          $match: {
            'structures.structural_identity.structural_identity_number': {
              $regex: `^${locationPrefix}`
            }
          }
        },
        {
          $group: {
            _id: null,
            total_structures: { $sum: 1 },
            by_type: {
              $push: '$structures.structural_identity.type_of_structure'
            },
            by_status: {
              $push: '$structures.status'
            }
          }
        }
      ]);
      
      const result = stats[0] || { total_structures: 0, by_type: [], by_status: [] };
      
      const typeCounts = {};
      const statusCounts = {};
      
      result.by_type.forEach(type => {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      result.by_status.forEach(status => {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      let nextSequenceNumber = '00001';
      if (city_name && location_code) {
        nextSequenceNumber = await this.getNextSequenceForLocation(
          state_code, district_code, city_name, location_code
        );
      }
      
      sendSuccessResponse(res, 'Location structure statistics retrieved', {
        location: {
          state_code: state_code.toUpperCase(),
          district_code: district_code.padStart(2, '0'),
          city_code: city_name ? city_name.toUpperCase().padEnd(4, 'X').substring(0, 4) : 'ALL',
          location_code: location_code ? location_code.toUpperCase().padEnd(2, 'X').substring(0, 2) : 'ALL'
        },
        total_structures: result.total_structures,
        by_type: typeCounts,
        by_status: statusCounts,
        next_sequence_number: nextSequenceNumber
      });
      
    } catch (error) {
      console.error('❌ Location stats error:', error);
      sendErrorResponse(res, 'Failed to get location statistics', 500, error.message);
    }
  }
}

module.exports = new StructureController();