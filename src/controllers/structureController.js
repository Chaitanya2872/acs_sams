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
    
    // Location Screen
    this.saveLocationScreen = this.saveLocationScreen.bind(this);
    this.getLocationScreen = this.getLocationScreen.bind(this);
    this.updateLocationScreen = this.updateLocationScreen.bind(this);
    
    // Administrative Screen
    this.saveAdministrativeScreen = this.saveAdministrativeScreen.bind(this);
    this.getAdministrativeScreen = this.getAdministrativeScreen.bind(this);
    this.updateAdministrativeScreen = this.updateAdministrativeScreen.bind(this);

    // Geometric Details
    this.saveGeometricDetails = this.saveGeometricDetails.bind(this);
    this.getGeometricDetails = this.getGeometricDetails.bind(this);
    this.updateGeometricDetails = this.updateGeometricDetails.bind(this);
    
    // Floors Management
    this.addFloors = this.addFloors.bind(this);
    this.getFloors = this.getFloors.bind(this);
    this.getFloorById = this.getFloorById.bind(this);
    this.updateFloor = this.updateFloor.bind(this);
    this.deleteFloor = this.deleteFloor.bind(this);
    
    // Flats Management
    this.addFlatsToFloor = this.addFlatsToFloor.bind(this);
    this.getFlatsInFloor = this.getFlatsInFloor.bind(this);
    this.getFlatById = this.getFlatById.bind(this);
    this.updateFlat = this.updateFlat.bind(this);
    this.deleteFlat = this.deleteFlat.bind(this);
    
    // Flat Ratings (ONLY flat-level ratings)
    this.saveFlatCombinedRatings = this.saveFlatCombinedRatings.bind(this);
    this.getFlatCombinedRatings = this.getFlatCombinedRatings.bind(this);
    this.updateFlatCombinedRatings = this.updateFlatCombinedRatings.bind(this);
    
    // Legacy individual ratings (kept for backward compatibility)
    this.saveFlatStructuralRating = this.saveFlatStructuralRating.bind(this);
    this.getFlatStructuralRating = this.getFlatStructuralRating.bind(this);
    this.updateFlatStructuralRating = this.updateFlatStructuralRating.bind(this);
    this.saveFlatNonStructuralRating = this.saveFlatNonStructuralRating.bind(this);
    this.getFlatNonStructuralRating = this.getFlatNonStructuralRating.bind(this);
    this.updateFlatNonStructuralRating = this.updateFlatNonStructuralRating.bind(this);
    
    // Bulk Operations
    this.saveBulkRatings = this.saveBulkRatings.bind(this);
    this.getBulkRatings = this.getBulkRatings.bind(this);
    this.updateBulkRatings = this.updateBulkRatings.bind(this);
    
    // Structure Management
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
  async initializeStructure(req, res) {
    try {
      console.log('🚀 Initializing new structure...');
      console.log('👤 User:', req.user.userId, req.user.email);
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      console.log('👤 User found, current structures:', user.structures.length);

      // Generate a simple UID
      const generateValidUID = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const uid = `${random}${timestamp}`.substring(0, 12);
        console.log('🔑 Generated UID:', uid, 'Length:', uid.length);
        return uid;
      };

      // Create simple structure without complex validation
      const newStructure = {
        structural_identity: {
          uid: generateValidUID(),
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
      
      // Update structural identity
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
      structure.status = 'location_completed';
      await user.save();
      
      console.log(`✅ Generated Structure Number: ${generatedNumbers.structural_identity_number}`);
      
      sendSuccessResponse(res, 'Location details saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        structural_identity_number: structure.structural_identity.structural_identity_number,
        location: structure.location,
        formatted_display: generatedNumbers.formatted_display,
        status: structure.status
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
      structure.status = 'admin_completed';
      await user.save();
      
      sendSuccessResponse(res, 'Administrative details saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        administration: structure.administration,
        status: structure.status
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

  // =================== SCREEN 3: GEOMETRIC DETAILS ===================
  async saveGeometricDetails(req, res) {
    try {
      const { id } = req.params;
      const { number_of_floors, structure_width, structure_length, structure_height } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      structure.geometric_details = {
        ...structure.geometric_details,
        number_of_floors: parseInt(number_of_floors),
        structure_width: parseFloat(structure_width),
        structure_length: parseFloat(structure_length),
        structure_height: parseFloat(structure_height)
      };
      
      structure.creation_info.last_updated_date = new Date();
      structure.status = 'geometric_completed';
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
        },
        status: structure.status
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

  // =================== FLOORS MANAGEMENT ===================
  async addFloors(req, res) {
    try {
      const { id } = req.params;
      const { floors } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      if (!structure.geometric_details) {
        return sendErrorResponse(res, 'Please save geometric details first', 400);
      }

      const createdFloors = [];
      
      floors.forEach((floorData, index) => {
        const floorId = this.generateFloorId();
        const newFloor = {
          floor_id: floorId,
          floor_number: floorData.floor_number || (index + 1),
          floor_type: floorData.floor_type || 'residential',
          floor_height: floorData.floor_height || null,
          total_area_sq_mts: floorData.total_area_sq_mts || null,
          floor_label_name: floorData.floor_label_name || `Floor ${floorData.floor_number || (index + 1)}`,
          number_of_flats: floorData.number_of_flats || 0,
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
        floor_id: floor.floor_id,
        mongodb_id: floor._id,
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
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
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

  // =================== FLATS MANAGEMENT ===================
  async addFlatsToFloor(req, res) {
    try {
      const { id, floorId } = req.params;
      const { flats } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }

      const createdFlats = [];
      
      flats.forEach((flatData, index) => {
        const flatId = this.generateFlatId();
        const newFlat = {
          flat_id: flatId,
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
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flatsData = floor.flats.map(flat => ({
        flat_id: flat.flat_id,
        mongodb_id: flat._id,
        flat_number: flat.flat_number,
        flat_type: flat.flat_type,
        area_sq_mts: flat.area_sq_mts,
        direction_facing: flat.direction_facing,
        occupancy_status: flat.occupancy_status,
        flat_notes: flat.flat_notes,
        has_structural_ratings: this.hasStructuralRating(flat),
        has_non_structural_ratings: this.hasNonStructuralRating(flat),
        flat_overall_rating: flat.flat_overall_rating || null,
        health_status: flat.flat_overall_rating?.health_status || null,
        priority: flat.flat_overall_rating?.priority || null,
        combined_score: flat.flat_overall_rating?.combined_score || null
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
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
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
          non_structural_rating: flat.non_structural_rating || {},
          flat_overall_rating: flat.flat_overall_rating || null
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
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
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
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
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

  // =================== FLAT RATINGS (ONLY flat-level) ===================
  async saveFlatCombinedRatings(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { structural_rating, non_structural_rating } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      const inspectionDate = new Date();
      
      // Update structural ratings
      if (structural_rating) {
        flat.structural_rating = {
          beams: this.createRatingComponent(structural_rating.beams, inspectionDate),
          columns: this.createRatingComponent(structural_rating.columns, inspectionDate),
          slab: this.createRatingComponent(structural_rating.slab, inspectionDate),
          foundation: this.createRatingComponent(structural_rating.foundation, inspectionDate)
        };
        
        // Calculate flat structural average
        const structuralRatings = [
          flat.structural_rating.beams?.rating,
          flat.structural_rating.columns?.rating,
          flat.structural_rating.slab?.rating,
          flat.structural_rating.foundation?.rating
        ].filter(r => r);
        
        if (structuralRatings.length > 0) {
          flat.structural_rating.overall_average = this.calculateAverage(structuralRatings);
          flat.structural_rating.health_status = this.getHealthStatus(flat.structural_rating.overall_average);
          flat.structural_rating.assessment_date = inspectionDate;
        }
      }
      
      // Update non-structural ratings
      if (non_structural_rating) {
        flat.non_structural_rating = {
          brick_plaster: this.createRatingComponent(non_structural_rating.brick_plaster, inspectionDate),
          doors_windows: this.createRatingComponent(non_structural_rating.doors_windows, inspectionDate),
          flooring_tiles: this.createRatingComponent(non_structural_rating.flooring_tiles, inspectionDate),
          electrical_wiring: this.createRatingComponent(non_structural_rating.electrical_wiring, inspectionDate),
          sanitary_fittings: this.createRatingComponent(non_structural_rating.sanitary_fittings, inspectionDate),
          railings: this.createRatingComponent(non_structural_rating.railings, inspectionDate),
          water_tanks: this.createRatingComponent(non_structural_rating.water_tanks, inspectionDate),
          plumbing: this.createRatingComponent(non_structural_rating.plumbing, inspectionDate),
          sewage_system: this.createRatingComponent(non_structural_rating.sewage_system, inspectionDate),
          panel_board: this.createRatingComponent(non_structural_rating.panel_board, inspectionDate),
          lifts: this.createRatingComponent(non_structural_rating.lifts, inspectionDate)
        };
        
        // Calculate flat non-structural average
        const nonStructuralRatings = [
          flat.non_structural_rating.brick_plaster?.rating,
          flat.non_structural_rating.doors_windows?.rating,
          flat.non_structural_rating.flooring_tiles?.rating,
          flat.non_structural_rating.electrical_wiring?.rating,
          flat.non_structural_rating.sanitary_fittings?.rating,
          flat.non_structural_rating.railings?.rating,
          flat.non_structural_rating.water_tanks?.rating,
          flat.non_structural_rating.plumbing?.rating,
          flat.non_structural_rating.sewage_system?.rating,
          flat.non_structural_rating.panel_board?.rating,
          flat.non_structural_rating.lifts?.rating
        ].filter(r => r);
        
        if (nonStructuralRatings.length > 0) {
          flat.non_structural_rating.overall_average = this.calculateAverage(nonStructuralRatings);
          flat.non_structural_rating.assessment_date = inspectionDate;
        }
      }
      
      // Calculate flat overall rating (combination of structural + non-structural)
      if (flat.structural_rating?.overall_average && flat.non_structural_rating?.overall_average) {
        const structuralWeight = 0.7;
        const nonStructuralWeight = 0.3;
        
        const combinedScore = (flat.structural_rating.overall_average * structuralWeight) + 
                             (flat.non_structural_rating.overall_average * nonStructuralWeight);
        
        flat.flat_overall_rating = {
          combined_score: Math.round(combinedScore * 10) / 10,
          health_status: this.getHealthStatus(combinedScore),
          priority: this.getPriority(combinedScore),
          last_assessment_date: inspectionDate
        };
      }
      
      structure.creation_info.last_updated_date = new Date();
      structure.status = 'ratings_in_progress';
      await user.save();
      
      sendSuccessResponse(res, 'Flat ratings saved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        flat_number: flat.flat_number,
        flat_ratings: {
          structural_rating: flat.structural_rating,
          non_structural_rating: flat.non_structural_rating,
          flat_overall_rating: flat.flat_overall_rating
        }
      });

    } catch (error) {
      console.error('❌ Save flat combined ratings error:', error);
      sendErrorResponse(res, 'Failed to save flat ratings', 500, error.message);
    }
  }

  async getFlatCombinedRatings(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      sendSuccessResponse(res, 'Flat ratings retrieved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        flat_number: flat.flat_number,
        flat_type: flat.flat_type,
        structural_rating: flat.structural_rating || this.getDefaultStructuralRating(),
        non_structural_rating: flat.non_structural_rating || this.getDefaultNonStructuralRating(),
        flat_overall_rating: flat.flat_overall_rating || null
      });

    } catch (error) {
      console.error('❌ Get flat combined ratings error:', error);
      sendErrorResponse(res, 'Failed to get flat ratings', 500, error.message);
    }
  }

  async updateFlatCombinedRatings(req, res) {
    return this.saveFlatCombinedRatings(req, res);
  }

  // =================== LEGACY INDIVIDUAL RATINGS ===================
  async saveFlatStructuralRating(req, res) {
    try {
      const { id, floorId, flatId } = req.params;
      const { beams, columns, slab, foundation } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      const inspectionDate = new Date();
      
      flat.structural_rating = {
        beams: this.createRatingComponent(beams, inspectionDate),
        columns: this.createRatingComponent(columns, inspectionDate),
        slab: this.createRatingComponent(slab, inspectionDate),
        foundation: this.createRatingComponent(foundation, inspectionDate)
      };
      
      // Calculate average
      const ratings = [beams.rating, columns.rating, slab.rating, foundation.rating].filter(r => r);
      if (ratings.length > 0) {
        flat.structural_rating.overall_average = this.calculateAverage(ratings);
        flat.structural_rating.health_status = this.getHealthStatus(flat.structural_rating.overall_average);
        flat.structural_rating.assessment_date = inspectionDate;
      }
      
      // Update combined rating if non-structural exists
      this.updateFlatCombinedRating(flat);
      
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
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
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
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flat = floor.flats.find(f => f.flat_id === flatId);
      if (!flat) {
        return sendErrorResponse(res, 'Flat not found', 404);
      }
      
      const inspectionDate = new Date();
      
      flat.non_structural_rating = {
        brick_plaster: this.createRatingComponent(brick_plaster, inspectionDate),
        doors_windows: this.createRatingComponent(doors_windows, inspectionDate),
        flooring_tiles: this.createRatingComponent(flooring_tiles, inspectionDate),
        electrical_wiring: this.createRatingComponent(electrical_wiring, inspectionDate),
        sanitary_fittings: this.createRatingComponent(sanitary_fittings, inspectionDate),
        railings: this.createRatingComponent(railings, inspectionDate),
        water_tanks: this.createRatingComponent(water_tanks, inspectionDate),
        plumbing: this.createRatingComponent(plumbing, inspectionDate),
        sewage_system: this.createRatingComponent(sewage_system, inspectionDate),
        panel_board: this.createRatingComponent(panel_board, inspectionDate),
        lifts: this.createRatingComponent(lifts, inspectionDate)
      };
      
      // Calculate average
      const ratings = [
        brick_plaster.rating, doors_windows.rating, flooring_tiles.rating, electrical_wiring.rating,
        sanitary_fittings.rating, railings.rating, water_tanks.rating, plumbing.rating,
        sewage_system.rating, panel_board.rating, lifts.rating
      ].filter(r => r);
      
      if (ratings.length > 0) {
        flat.non_structural_rating.overall_average = this.calculateAverage(ratings);
        flat.non_structural_rating.assessment_date = inspectionDate;
      }
      
      // Update combined rating if structural exists
      this.updateFlatCombinedRating(flat);
      
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
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
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

  // =================== BULK OPERATIONS ===================
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
          
          // Update flat combined rating
          this.updateFlatCombinedRating(existingFlat);
          
          updatedFlats++;
        }
        
        updatedFloors++;
      }
      
      // Save the structure
      structure.creation_info.last_updated_date = new Date();
      structure.status = 'ratings_in_progress';
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
          flat_overall_rating: flat.flat_overall_rating || null,
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

  async updateBulkRatings(req, res) {
    return this.saveBulkRatings(req, res);
  }

  // =================== HELPER METHODS ===================
  createRatingComponent(ratingData, inspectionDate) {
    if (!ratingData || !ratingData.rating) return null;
    
    return {
      rating: parseInt(ratingData.rating),
      condition_comment: ratingData.condition_comment || '',
      inspection_date: inspectionDate,
      photos: Array.isArray(ratingData.photos) ? ratingData.photos : [],
      inspector_notes: ratingData.inspector_notes || ''
    };
  }
  
  calculateAverage(ratings) {
    const validRatings = ratings.filter(r => r && !isNaN(r));
    if (validRatings.length === 0) return null;
    
    const average = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
    return Math.round(average * 10) / 10;
  }
  
  getHealthStatus(average) {
    if (!average || isNaN(average)) return null;
    if (average >= 4) return 'Good';
    if (average >= 3) return 'Fair';
    if (average >= 2) return 'Poor';
    return 'Critical';
  }
  
  getPriority(average) {
    if (!average || isNaN(average)) return null;
    if (average >= 4) return 'Low';
    if (average >= 3) return 'Medium';
    if (average >= 2) return 'High';
    return 'Critical';
  }

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

    // Calculate averages for the rating type
    if (ratingType === 'structural_rating') {
      const structuralRatings = ['beams', 'columns', 'slab', 'foundation']
        .map(comp => flat.structural_rating[comp]?.rating)
        .filter(r => r);
      if (structuralRatings.length > 0) {
        flat.structural_rating.overall_average = this.calculateAverage(structuralRatings);
        flat.structural_rating.health_status = this.getHealthStatus(flat.structural_rating.overall_average);
        flat.structural_rating.assessment_date = inspectionDate;
      }
    } else if (ratingType === 'non_structural_rating') {
      const nonStructuralComponents = [
        'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
        'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
        'sewage_system', 'panel_board', 'lifts'
      ];
      const nonStructuralRatings = nonStructuralComponents
        .map(comp => flat.non_structural_rating[comp]?.rating)
        .filter(r => r);
      if (nonStructuralRatings.length > 0) {
        flat.non_structural_rating.overall_average = this.calculateAverage(nonStructuralRatings);
        flat.non_structural_rating.assessment_date = inspectionDate;
      }
    }
  }

  updateFlatCombinedRating(flat) {
    if (flat.structural_rating?.overall_average && flat.non_structural_rating?.overall_average) {
      const structuralWeight = 0.7;
      const nonStructuralWeight = 0.3;
      
      const combinedScore = (flat.structural_rating.overall_average * structuralWeight) + 
                           (flat.non_structural_rating.overall_average * nonStructuralWeight);
      
      flat.flat_overall_rating = {
        combined_score: Math.round(combinedScore * 10) / 10,
        health_status: this.getHealthStatus(combinedScore),
        priority: this.getPriority(combinedScore),
        last_assessment_date: new Date()
      };
    }
  }

  getDefaultStructuralRating() {
    const defaultRating = { rating: null, condition_comment: '', photos: [], inspection_date: null };
    return {
      beams: defaultRating,
      columns: defaultRating,
      slab: defaultRating,
      foundation: defaultRating
    };
  }

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

  // =================== STRUCTURE MANAGEMENT ===================
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
              if (!flat.flat_overall_rating?.combined_score) {
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

    // Calculate percentage
    const completedSteps = Object.values(progress).filter(val => val === true).length;
    progress.overall_percentage = Math.round((completedSteps / 6) * 100);

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