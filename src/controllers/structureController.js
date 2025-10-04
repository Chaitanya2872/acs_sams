// @ts-nocheck
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

  this.getAllStructures = this.getAllStructures.bind(this);
  this.getStructureDetails = this.getStructureDetails.bind(this);
  this.getAllImages = this.getAllImages.bind(this);
  this.getStructureImages = this.getStructureImages.bind(this);
  this.getUserImageStats = this.getUserImageStats.bind(this);
    
    // Bulk Operations
    this.saveBulkRatings = this.saveBulkRatings.bind(this);
    this.getBulkRatings = this.getBulkRatings.bind(this);
    this.updateBulkRatings = this.updateBulkRatings.bind(this);
    
    // Structure Management
    this.getStructureProgress = this.getStructureProgress.bind(this);
    this.submitStructure = this.submitStructure.bind(this);
    this.validateStructureNumber = this.validateStructureNumber.bind(this);
    this.getLocationStructureStats = this.getLocationStructureStats.bind(this);
    
    // Remarks Management
    this.addRemark = this.addRemark.bind(this);
    this.updateRemark = this.updateRemark.bind(this);
    this.getRemarks = this.getRemarks.bind(this);
    this.deleteRemark = this.deleteRemark.bind(this);
    this.deleteStructure = this.deleteStructure.bind(this);
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

  // Find structure across all users (for remarks functionality)
  async findStructureAcrossUsers(structureId) {
    const users = await User.find({ 'structures._id': structureId });
    
    for (const user of users) {
      const structure = user.structures.id(structureId);
      if (structure) {
        return { user, structure };
      }
    }
    
    throw new Error('Structure not found');
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
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const uid = `${random}${timestamp}`.substring(0, 12);
      console.log('🔑 Generated UID:', uid, 'Length:', uid.length);
      return uid;
    };

    // Create minimal structure - type and name will be set in location screen
    const newStructure = {
      structural_identity: {
        uid: generateValidUID()
        // All other fields will be set in location screen
      },
      location: {
        coordinates: {}
      },
      administration: {},
      geometric_details: {
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
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    if (error.errors) {
      console.error('❌ Validation errors:', error.errors);
    }
    sendErrorResponse(res, 'Failed to initialize structure', 500, error.message);
  }
}

  // =================== SCREEN 1: LOCATION ===================
 async saveLocationScreen(req, res) {
  try {
    const { id } = req.params;
    const { 
      structure_name, zip_code, state_code, district_code, city_name, location_code, 
      type_of_structure, commercial_subtype, longitude, latitude, address 
    } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Validate commercial subtype requirement
    if (type_of_structure === 'commercial' && !commercial_subtype) {
      return sendErrorResponse(res, 'Commercial subtype is required for commercial structures', 400);
    }
    
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
    
    // Build structural identity object
    const structuralIdentity = {
      uid: structure.structural_identity.uid,
      structure_name: structure_name || '',
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
    
    // Only add commercial_subtype if structure is commercial
    if (type_of_structure === 'commercial') {
      structuralIdentity.commercial_subtype = commercial_subtype;
    }
    
    structure.structural_identity = structuralIdentity;
    
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
      structure_name: structure.structural_identity.structure_name,
      structural_identity_number: structure.structural_identity.structural_identity_number,
      type_of_structure: structure.structural_identity.type_of_structure,
      commercial_subtype: structure.structural_identity.commercial_subtype,
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
    const { 
      number_of_floors, structure_width, structure_length, structure_height,
      has_parking_floors, number_of_parking_floors 
    } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    const structureType = structure.structural_identity?.type_of_structure;
    const commercialSubtype = structure.structural_identity?.commercial_subtype;
    
    // Apply parking logic for residential and commercial+residential structures
    const needsParkingOption = structureType === 'residential' || 
                               commercialSubtype === 'commercial_residential';
    
    structure.geometric_details = {
      ...structure.geometric_details,
      number_of_floors: parseInt(number_of_floors),
      has_parking_floors: needsParkingOption ? (has_parking_floors || false) : false,
      number_of_parking_floors: needsParkingOption && has_parking_floors ? 
                                parseInt(number_of_parking_floors || 0) : 0,
      structure_width: parseFloat(structure_width),
      structure_length: parseFloat(structure_length),
      structure_height: parseFloat(structure_height)
    };
    
    // Auto-create parking floors if specified
    if (needsParkingOption && has_parking_floors && number_of_parking_floors > 0) {
      const existingParkingFloors = structure.geometric_details.floors?.filter(
        f => f.is_parking_floor
      ) || [];
      
      const parkingFloorsToAdd = parseInt(number_of_parking_floors) - existingParkingFloors.length;
      
      if (parkingFloorsToAdd > 0) {
        for (let i = 0; i < parkingFloorsToAdd; i++) {
          const floorNumber = -(existingParkingFloors.length + i + 1); // Negative for basement parking
          const parkingFloor = {
            floor_id: this.generateFloorId(),
            floor_number: floorNumber,
            floor_type: 'parking',
            is_parking_floor: true,
            floor_label_name: `Parking Level ${Math.abs(floorNumber)}`,
            floor_height: 3, // Default parking height
            total_area_sq_mts: structure_width * structure_length,
            number_of_flats: 0,
            number_of_blocks: 0,
            flats: [],
            blocks: [],
            floor_notes: 'Auto-generated parking floor'
          };
          
          structure.geometric_details.floors = structure.geometric_details.floors || [];
          structure.geometric_details.floors.push(parkingFloor);
        }
      }
    }
    
    structure.creation_info.last_updated_date = new Date();
    structure.status = 'geometric_completed';
    await user.save();
    
    sendSuccessResponse(res, 'Geometric details saved successfully', {
      structure_id: id,
      uid: structure.structural_identity.uid,
      structure_type: structureType,
      commercial_subtype: commercialSubtype,
      geometric_details: {
        number_of_floors: structure.geometric_details.number_of_floors,
        has_parking_floors: structure.geometric_details.has_parking_floors,
        number_of_parking_floors: structure.geometric_details.number_of_parking_floors,
        structure_width: structure.geometric_details.structure_width,
        structure_length: structure.geometric_details.structure_length,
        structure_height: structure.geometric_details.structure_height,
        total_area: structure.geometric_details.structure_width * structure.geometric_details.structure_length,
        total_floors_created: structure.geometric_details.floors?.length || 0
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

  async addBlocksToFloor(req, res) {
  try {
    const { id, floorId } = req.params;
    const { blocks } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    if (structure.structural_identity?.type_of_structure !== 'industrial') {
      return sendErrorResponse(res, 'Blocks can only be added to industrial structures', 400);
    }
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }

    const createdBlocks = [];
    
    blocks.forEach((blockData, index) => {
      const blockId = this.generateBlockId();
      const newBlock = {
        block_id: blockId,
        block_number: blockData.block_number || `B${floor.floor_number}-${String(index + 1).padStart(2, '0')}`,
        block_name: blockData.block_name || `Block ${index + 1}`,
        block_type: blockData.block_type || 'manufacturing',
        area_sq_mts: blockData.area_sq_mts || null,
        // Initialize empty rating structures for industrial components
        structural_rating: {
          beams: { rating: null, condition_comment: '', photos: [] },
          columns: { rating: null, condition_comment: '', photos: [] },
          slab: { rating: null, condition_comment: '', photos: [] },
          foundation: { rating: null, condition_comment: '', photos: [] },
          roof_truss: { rating: null, condition_comment: '', photos: [] }
        },
        non_structural_rating: {
          walls_cladding: { rating: null, condition_comment: '', photos: [] },
          industrial_flooring: { rating: null, condition_comment: '', photos: [] },
          ventilation: { rating: null, condition_comment: '', photos: [] },
          electrical_system: { rating: null, condition_comment: '', photos: [] },
          fire_safety: { rating: null, condition_comment: '', photos: [] },
          drainage: { rating: null, condition_comment: '', photos: [] },
          overhead_cranes: { rating: null, condition_comment: '', photos: [] },
          loading_docks: { rating: null, condition_comment: '', photos: [] }
        },
        block_notes: blockData.block_notes || ''
      };
      
      floor.blocks = floor.blocks || [];
      floor.blocks.push(newBlock);
      createdBlocks.push({
        block_id: blockId,
        block_number: newBlock.block_number,
        block_name: newBlock.block_name,
        block_type: newBlock.block_type,
        area_sq_mts: newBlock.area_sq_mts
      });
    });
    
    structure.creation_info.last_updated_date = new Date();
    await user.save();
    
    sendCreatedResponse(res, {
      structure_id: id,
      floor_id: floorId,
      blocks_added: createdBlocks.length,
      blocks: createdBlocks
    }, `${createdBlocks.length} block(s) added successfully`);

  } catch (error) {
    console.error('❌ Add blocks error:', error);
    sendErrorResponse(res, 'Failed to add blocks', 500, error.message);
  }
}

async saveBlockRatings(req, res) {
  try {
    const { id, floorId, blockId } = req.params;
    const { structural_rating, non_structural_rating } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    if (structure.structural_identity?.type_of_structure !== 'industrial') {
      return sendErrorResponse(res, 'Block ratings are only for industrial structures', 400);
    }
    
    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) {
      return sendErrorResponse(res, 'Floor not found', 404);
    }
    
    const block = floor.blocks?.find(b => b.block_id === blockId);
    if (!block) {
      return sendErrorResponse(res, 'Block not found', 404);
    }
    
    const inspectionDate = new Date();
    
    // Update structural ratings for industrial components
    if (structural_rating) {
      block.structural_rating = {
        beams: this.createRatingComponent(structural_rating.beams, inspectionDate),
        columns: this.createRatingComponent(structural_rating.columns, inspectionDate),
        slab: this.createRatingComponent(structural_rating.slab, inspectionDate),
        foundation: this.createRatingComponent(structural_rating.foundation, inspectionDate),
        roof_truss: this.createRatingComponent(structural_rating.roof_truss, inspectionDate)
      };
      
      // Calculate block structural average
      const structuralRatings = [
        block.structural_rating.beams?.rating,
        block.structural_rating.columns?.rating,
        block.structural_rating.slab?.rating,
        block.structural_rating.foundation?.rating,
        block.structural_rating.roof_truss?.rating
      ].filter(r => r);
      
      if (structuralRatings.length > 0) {
        block.structural_rating.overall_average = this.calculateAverage(structuralRatings);
        block.structural_rating.health_status = this.getHealthStatus(block.structural_rating.overall_average);
        block.structural_rating.assessment_date = inspectionDate;
      }
    }
    
    // Update non-structural ratings for industrial components
    if (non_structural_rating) {
      block.non_structural_rating = {
        walls_cladding: this.createRatingComponent(non_structural_rating.walls_cladding, inspectionDate),
        industrial_flooring: this.createRatingComponent(non_structural_rating.industrial_flooring, inspectionDate),
        ventilation: this.createRatingComponent(non_structural_rating.ventilation, inspectionDate),
        electrical_system: this.createRatingComponent(non_structural_rating.electrical_system, inspectionDate),
        fire_safety: this.createRatingComponent(non_structural_rating.fire_safety, inspectionDate),
        drainage: this.createRatingComponent(non_structural_rating.drainage, inspectionDate),
        overhead_cranes: this.createRatingComponent(non_structural_rating.overhead_cranes, inspectionDate),
        loading_docks: this.createRatingComponent(non_structural_rating.loading_docks, inspectionDate)
      };
      
      // Calculate block non-structural average
      const nonStructuralRatings = [
        block.non_structural_rating.walls_cladding?.rating,
        block.non_structural_rating.industrial_flooring?.rating,
        block.non_structural_rating.ventilation?.rating,
        block.non_structural_rating.electrical_system?.rating,
        block.non_structural_rating.fire_safety?.rating,
        block.non_structural_rating.drainage?.rating,
        block.non_structural_rating.overhead_cranes?.rating,
        block.non_structural_rating.loading_docks?.rating
      ].filter(r => r);
      
      if (nonStructuralRatings.length > 0) {
        block.non_structural_rating.overall_average = this.calculateAverage(nonStructuralRatings);
        block.non_structural_rating.assessment_date = inspectionDate;
      }
    }
    
    // Calculate block overall rating (combination of structural + non-structural)
    if (block.structural_rating?.overall_average && block.non_structural_rating?.overall_average) {
      const structuralWeight = 0.7;
      const nonStructuralWeight = 0.3;
      
      const combinedScore = (block.structural_rating.overall_average * structuralWeight) + 
                           (block.non_structural_rating.overall_average * nonStructuralWeight);
      
      block.block_overall_rating = {
        combined_score: Math.round(combinedScore * 10) / 10,
        health_status: this.getHealthStatus(combinedScore),
        priority: this.getPriority(combinedScore),
        last_assessment_date: inspectionDate
      };
    }
    
    structure.creation_info.last_updated_date = new Date();
    structure.status = 'ratings_in_progress';
    await user.save();
    
    sendSuccessResponse(res, 'Block ratings saved successfully', {
      structure_id: id,
      floor_id: floorId,
      block_id: blockId,
      block_number: block.block_number,
      block_name: block.block_name,
      block_ratings: {
        structural_rating: block.structural_rating,
        non_structural_rating: block.non_structural_rating,
        block_overall_rating: block.block_overall_rating
      }
    });

  } catch (error) {
    console.error('❌ Save block ratings error:', error);
    sendErrorResponse(res, 'Failed to save block ratings', 500, error.message);
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

      // Indicators
      has_structural_ratings: this.hasStructuralRating(flat),
      has_non_structural_ratings: this.hasNonStructuralRating(flat),

      // Detailed ratings
      structural_rating: flat.structural_rating || this.getDefaultStructuralRating(),
      non_structural_rating: flat.non_structural_rating || this.getDefaultNonStructuralRating(),

      // Overall rating summary
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
// =================== FLAT-LEVEL RATINGS ===================
async saveFlatCombinedRatings(req, res) {
  try {
    const { id, floorId, flatId } = req.params;
    const { structural_rating, non_structural_rating } = req.body;

    const { user, structure } = await this.findUserStructure(req.user.userId, id);

    const type = structure.structural_identity?.type_of_structure;
    const subtype = structure.structural_identity?.commercial_subtype;

    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) return sendErrorResponse(res, 'Floor not found', 404);

    const flat = floor.flats?.find(fl => fl.flat_id === flatId);
    if (!flat) return sendErrorResponse(res, 'Flat not found', 404);

    // ✅ Check if flat ratings are allowed
    if (
      type === 'residential' ||
      (type === 'commercial' && subtype === 'commercial_residential' && floor.floor_type === 'residential')
    ) {
      const inspectionDate = new Date();

      // Structural ratings
      if (structural_rating) {
        flat.structural_rating = {
          beams: this.createRatingComponent(structural_rating.beams, inspectionDate),
          columns: this.createRatingComponent(structural_rating.columns, inspectionDate),
          slab: this.createRatingComponent(structural_rating.slab, inspectionDate),
          foundation: this.createRatingComponent(structural_rating.foundation, inspectionDate),
        };

        const ratings = [
          flat.structural_rating.beams?.rating,
          flat.structural_rating.columns?.rating,
          flat.structural_rating.slab?.rating,
          flat.structural_rating.foundation?.rating
        ].filter(r => r);

        if (ratings.length > 0) {
          flat.structural_rating.overall_average = this.calculateAverage(ratings);
          flat.structural_rating.health_status = this.getHealthStatus(flat.structural_rating.overall_average);
          flat.structural_rating.assessment_date = inspectionDate;
        }
      }

      // Non-structural ratings
      if (non_structural_rating) {
        flat.non_structural_rating = {
          brick_plaster: this.createRatingComponent(non_structural_rating.brick_plaster, inspectionDate),
          doors_windows: this.createRatingComponent(non_structural_rating.doors_windows, inspectionDate),
          flooring_tiles: this.createRatingComponent(non_structural_rating.flooring_tiles, inspectionDate),
          electrical_wiring: this.createRatingComponent(non_structural_rating.electrical_wiring, inspectionDate),
          sanitary_fittings: this.createRatingComponent(non_structural_rating.sanitary_fittings, inspectionDate),
        };

        const ratings = [
          flat.non_structural_rating.brick_plaster?.rating,
          flat.non_structural_rating.doors_windows?.rating,
          flat.non_structural_rating.flooring_tiles?.rating,
          flat.non_structural_rating.electrical_wiring?.rating,
          flat.non_structural_rating.sanitary_fittings?.rating
        ].filter(r => r);

        if (ratings.length > 0) {
          flat.non_structural_rating.overall_average = this.calculateAverage(ratings);
          flat.non_structural_rating.assessment_date = inspectionDate;
        }
      }

      // Combined flat rating
      if (flat.structural_rating?.overall_average && flat.non_structural_rating?.overall_average) {
        const combinedScore =
          (flat.structural_rating.overall_average * 0.7) +
          (flat.non_structural_rating.overall_average * 0.3);

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

      return sendSuccessResponse(res, 'Flat ratings saved successfully', {
        structure_id: id,
        floor_id: floorId,
        flat_id: flatId,
        flat_ratings: {
          structural_rating: flat.structural_rating,
          non_structural_rating: flat.non_structural_rating,
          flat_overall_rating: flat.flat_overall_rating
        }
      });
    }

    return sendErrorResponse(res, 'Flat ratings not allowed for this structure/floor type', 400);

  } catch (err) {
    console.error('❌ Flat ratings error:', err);
    sendErrorResponse(res, 'Failed to save flat ratings', 500, err.message);
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
      structural_rating: flat.structural_rating || this.getDefaultStructuralRating(),
      non_structural_rating: flat.non_structural_rating || this.getDefaultNonStructuralRating()
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

  /**
 * Extract images from a flat's ratings with metadata
 * @param {Object} flat - Flat document
 * @param {Object} options - Extraction options
 * @returns {Array} Array of image objects with metadata
 */
extractFlatImages(flat, options = {}) {
  const images = [];
  const {
    includeStructureInfo = false,
    includeLocationInfo = false,
    structureId = null,
    structureNumber = null,
    floorNumber = null,
    floorLabel = null,
    flatNumber = null,
    flatType = null,
    imageType = null,
    component = null
  } = options;
  
  // Process structural rating images
  if (flat.structural_rating && (!imageType || imageType === 'structural')) {
    const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
    
    structuralComponents.forEach(comp => {
      if (flat.structural_rating[comp]?.photos?.length > 0 && 
          (!component || component === comp)) {
        
        flat.structural_rating[comp].photos.forEach((photoUrl, index) => {
          const imageData = {
            image_id: `structural_${comp}_${index}_${Date.now()}`,
            image_url: photoUrl,
            rating_type: 'structural',
            component: comp,
            rating: flat.structural_rating[comp].rating,
            condition_comment: flat.structural_rating[comp].condition_comment,
            inspector_notes: flat.structural_rating[comp].inspector_notes,
            uploaded_date: flat.structural_rating[comp].inspection_date || new Date(),
            flat_id: flat.flat_id,
            flat_number: flatNumber || flat.flat_number,
            flat_type: flatType || flat.flat_type
          };
          
          if (includeLocationInfo) {
            imageData.floor_number = floorNumber;
            imageData.floor_label = floorLabel;
          }
          
          if (includeStructureInfo) {
            imageData.structure_id = structureId;
            imageData.structure_number = structureNumber;
          }
          
          images.push(imageData);
        });
      }
    });
  }
  
  // Process non-structural rating images
  if (flat.non_structural_rating && (!imageType || imageType === 'non_structural')) {
    const nonStructuralComponents = [
      'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
      'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
      'sewage_system', 'panel_board', 'lifts'
    ];
    
    nonStructuralComponents.forEach(comp => {
      if (flat.non_structural_rating[comp]?.photos?.length > 0 && 
          (!component || component === comp)) {
        
        flat.non_structural_rating[comp].photos.forEach((photoUrl, index) => {
          const imageData = {
            image_id: `non_structural_${comp}_${index}_${Date.now()}`,
            image_url: photoUrl,
            rating_type: 'non_structural',
            component: comp,
            rating: flat.non_structural_rating[comp].rating,
            condition_comment: flat.non_structural_rating[comp].condition_comment,
            inspector_notes: flat.non_structural_rating[comp].inspector_notes,
            uploaded_date: flat.non_structural_rating[comp].inspection_date || new Date(),
            flat_id: flat.flat_id,
            flat_number: flatNumber || flat.flat_number,
            flat_type: flatType || flat.flat_type
          };
          
          if (includeLocationInfo) {
            imageData.floor_number = floorNumber;
            imageData.floor_label = floorLabel;
          }
          
          if (includeStructureInfo) {
            imageData.structure_id = structureId;
            imageData.structure_number = structureNumber;
          }
          
          images.push(imageData);
        });
      }
    });
  }
  
  return images;
}


// =================== FLOOR-LEVEL RATINGS ===================
async saveFloorRatings(req, res) {
  try {
    const { id, floorId } = req.params;  // :/floors/:floorId/ratings
    const { structural_rating, non_structural_rating } = req.body;

    const { user, structure } = await this.findUserStructure(req.user.userId, id);

    const type = structure.structural_identity?.type_of_structure;
    const subtype = structure.structural_identity?.commercial_subtype;

    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) return sendErrorResponse(res, 'Floor not found', 404);

    // ✅ Check if floor ratings are allowed
    if (
      (type === 'commercial' && subtype === 'pure') ||
      (type === 'industrial') ||
      (type === 'commercial' && subtype === 'commercial_residential' && floor.floor_type === 'commercial')
    ) {
      const inspectionDate = new Date();

      // Structural ratings
      if (structural_rating) {
        floor.structural_rating = {
          beams: this.createRatingComponent(structural_rating.beams, inspectionDate),
          columns: this.createRatingComponent(structural_rating.columns, inspectionDate),
          slab: this.createRatingComponent(structural_rating.slab, inspectionDate),
          foundation: this.createRatingComponent(structural_rating.foundation, inspectionDate),
        };

        const ratings = [
          floor.structural_rating.beams?.rating,
          floor.structural_rating.columns?.rating,
          floor.structural_rating.slab?.rating,
          floor.structural_rating.foundation?.rating
        ].filter(r => r);

        if (ratings.length > 0) {
          floor.structural_rating.overall_average = this.calculateAverage(ratings);
          floor.structural_rating.health_status = this.getHealthStatus(floor.structural_rating.overall_average);
          floor.structural_rating.assessment_date = inspectionDate;
        }
      }

      // Non-structural ratings
      if (non_structural_rating) {
        floor.non_structural_rating = {
          walls: this.createRatingComponent(non_structural_rating.walls, inspectionDate),
          flooring: this.createRatingComponent(non_structural_rating.flooring, inspectionDate),
          electrical_system: this.createRatingComponent(non_structural_rating.electrical_system, inspectionDate),
          fire_safety: this.createRatingComponent(non_structural_rating.fire_safety, inspectionDate),
        };

        const ratings = [
          floor.non_structural_rating.walls?.rating,
          floor.non_structural_rating.flooring?.rating,
          floor.non_structural_rating.electrical_system?.rating,
          floor.non_structural_rating.fire_safety?.rating
        ].filter(r => r);

        if (ratings.length > 0) {
          floor.non_structural_rating.overall_average = this.calculateAverage(ratings);
          floor.non_structural_rating.assessment_date = inspectionDate;
        }
      }

      // Combined floor rating
      if (floor.structural_rating?.overall_average && floor.non_structural_rating?.overall_average) {
        const combinedScore =
          (floor.structural_rating.overall_average * 0.7) +
          (floor.non_structural_rating.overall_average * 0.3);

        floor.floor_overall_rating = {
          combined_score: Math.round(combinedScore * 10) / 10,
          health_status: this.getHealthStatus(combinedScore),
          priority: this.getPriority(combinedScore),
          last_assessment_date: inspectionDate
        };
      }

      structure.creation_info.last_updated_date = new Date();
      structure.status = 'ratings_in_progress';
      await user.save();

      return sendSuccessResponse(res, 'Floor ratings saved successfully', {
        structure_id: id,
        floor_id: floorId,
        floor_number: floor.floor_number,
        floor_ratings: {
          structural_rating: floor.structural_rating,
          non_structural_rating: floor.non_structural_rating,
          floor_overall_rating: floor.floor_overall_rating
        }
      });
    }

    return sendErrorResponse(res, 'Floor ratings not allowed for this structure/floor type', 400);

  } catch (err) {
    console.error('❌ Floor ratings error:', err);
    sendErrorResponse(res, 'Failed to save floor ratings', 500, err.message);
  }
}


async getFloorRatings(req, res) {
  try {
    const { id, floorId } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);

    const floor = structure.geometric_details?.floors?.find(f => f.floor_id === floorId);
    if (!floor) return sendErrorResponse(res, 'Floor not found', 404);

    return sendSuccessResponse(res, 'Floor ratings retrieved successfully', {
      structural_rating: floor.structural_rating || {},
      non_structural_rating: floor.non_structural_rating || {},
      floor_overall_rating: floor.floor_overall_rating || null
    });
  } catch (err) {
    console.error('❌ Get floor ratings error:', err);
    sendErrorResponse(res, 'Failed to get floor ratings', 500, err.message);
  }
}



/**
 * Generate maintenance recommendations for a structure
 * @param {Object} structure - Structure document
 * @returns {Array} Array of maintenance recommendations
 */
async generateMaintenanceRecommendations(structure) {
  const recommendations = [];
  
  if (!structure.geometric_details?.floors) {
    return recommendations;
  }
  
  structure.geometric_details.floors.forEach(floor => {
    if (floor.flats) {
      floor.flats.forEach(flat => {
        // Check structural components
        if (flat.structural_rating) {
          const structuralComponents = ['beams', 'columns', 'slab', 'foundation'];
          
          structuralComponents.forEach(component => {
            const rating = flat.structural_rating[component];
            if (rating && rating.rating <= 2) {
              recommendations.push({
                type: 'Structural',
                priority: rating.rating === 1 ? 'Critical' : 'High',
                component: component.charAt(0).toUpperCase() + component.slice(1),
                location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                issue: rating.condition_comment || `${component} needs attention`,
                rating: rating.rating,
                urgency: rating.rating === 1 ? 'Immediate' : 'Within 30 days',
                estimated_cost: this.getEstimatedCost(component, rating.rating, 'structural'),
                recommended_action: this.getRecommendedAction(component, rating.rating, 'structural')
              });
            }
          });
        }
        
        // Check non-structural components
        if (flat.non_structural_rating) {
          const nonStructuralComponents = [
            'brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring',
            'sanitary_fittings', 'railings', 'water_tanks', 'plumbing',
            'sewage_system', 'panel_board', 'lifts'
          ];
          
          nonStructuralComponents.forEach(component => {
            const rating = flat.non_structural_rating[component];
            if (rating && rating.rating <= 2) {
              recommendations.push({
                type: 'Non-Structural',
                priority: rating.rating === 1 ? 'High' : 'Medium',
                component: component.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                location: `Floor ${floor.floor_number}, Flat ${flat.flat_number}`,
                issue: rating.condition_comment || `${component.replace('_', ' ')} needs attention`,
                rating: rating.rating,
                urgency: rating.rating === 1 ? 'Within 15 days' : 'Within 60 days',
                estimated_cost: this.getEstimatedCost(component, rating.rating, 'non_structural'),
                recommended_action: this.getRecommendedAction(component, rating.rating, 'non_structural')
              });
            }
          });
        }
      });
    }
  });
  
  // Sort by priority and rating
  const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
  recommendations.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.rating - b.rating; // Lower rating = higher urgency
  });
  
  return recommendations;
}

/**
 * Get estimated cost for maintenance work
 * @param {string} component - Component name
 * @param {number} rating - Current rating
 * @param {string} type - 'structural' or 'non_structural'
 * @returns {Object} Cost estimate
 */
getEstimatedCost(component, rating, type) {
  // Base cost estimates in rupees (these should be configurable)
  const baseCosts = {
    structural: {
      beams: { 1: 50000, 2: 25000 },
      columns: { 1: 75000, 2: 35000 },
      slab: { 1: 60000, 2: 30000 },
      foundation: { 1: 100000, 2: 50000 }
    },
    non_structural: {
      brick_plaster: { 1: 15000, 2: 8000 },
      doors_windows: { 1: 25000, 2: 12000 },
      flooring_tiles: { 1: 20000, 2: 10000 },
      electrical_wiring: { 1: 30000, 2: 15000 },
      sanitary_fittings: { 1: 18000, 2: 9000 },
      railings: { 1: 12000, 2: 6000 },
      water_tanks: { 1: 40000, 2: 20000 },
      plumbing: { 1: 25000, 2: 12000 },
      sewage_system: { 1: 35000, 2: 18000 },
      panel_board: { 1: 15000, 2: 8000 },
      lifts: { 1: 200000, 2: 100000 }
    }
  };
  
  const cost = baseCosts[type]?.[component]?.[rating] || 10000;
  
  return {
    estimated_amount: cost,
    currency: 'INR',
    range: {
      min: Math.round(cost * 0.8),
      max: Math.round(cost * 1.2)
    }
  };
}

/**
 * Get recommended action for component maintenance
 * @param {string} component - Component name
 * @param {number} rating - Current rating
 * @param {string} type - 'structural' or 'non_structural'
 * @returns {string} Recommended action
 */
getRecommendedAction(component, rating, type) {
  const actions = {
    structural: {
      beams: {
        1: 'Immediate structural assessment and beam replacement/strengthening required',
        2: 'Detailed inspection and repair of cracks/deflection within 30 days'
      },
      columns: {
        1: 'Critical - Immediate structural engineer assessment required',
        2: 'Repair cracks and assess load-bearing capacity'
      },
      slab: {
        1: 'Major slab repair or replacement required immediately',
        2: 'Repair cracks and address deflection issues'
      },
      foundation: {
        1: 'Critical foundation repair required immediately',
        2: 'Foundation repair needed - address settlement issues'
      }
    },
    non_structural: {
      brick_plaster: {
        1: 'Complete replastering required',
        2: 'Repair cracks and repaint'
      },
      doors_windows: {
        1: 'Replace doors/windows completely',
        2: 'Repair hardware and improve sealing'
      },
      electrical_wiring: {
        1: 'Complete electrical system overhaul required',
        2: 'Upgrade wiring and replace faulty components'
      },
      plumbing: {
        1: 'Major plumbing renovation needed',
        2: 'Repair leaks and replace worn fixtures'
      }
    }
  };
  
  return actions[type]?.[component]?.[rating] || `${component.replace('_', ' ')} requires professional assessment`;
}

/**
 * Group structures by status for summary
 * @param {Array} structures - Array of structures
 * @returns {Object} Status counts
 */
getStructuresByStatus(structures) {
  const statusCounts = {};
  
  structures.forEach(structure => {
    const status = structure.status || 'draft';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  return statusCounts;
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
    units_added: false, // Can be flats or blocks
    ratings_completed: false,
    overall_percentage: 0
  };

const structureType = structure.structural_identity?.type_of_structure;

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
    
    if (structureType === 'industrial') {
      // Check blocks for industrial
      const hasBlocks = structure.geometric_details.floors.some(floor => floor.blocks?.length > 0);
      if (hasBlocks) {
        progress.units_added = true;
        
        // Check if all blocks have ratings
        let allBlocksRated = true;
        for (const floor of structure.geometric_details.floors) {
          if (floor.blocks?.length > 0) {
            for (const block of floor.blocks) {
              if (!block.block_overall_rating?.combined_score) {
                allBlocksRated = false;
                break;
              }
            }
          }
          if (!allBlocksRated) break;
        }
        progress.ratings_completed = allBlocksRated;
      }
    } else {
      // Check flats for residential/commercial
      const hasFlats = structure.geometric_details.floors.some(floor => floor.flats?.length > 0);
      if (hasFlats) {
        progress.units_added = true;
        
        // Check if all flats have ratings (skip parking floors)
        let allFlatsRated = true;
        for (const floor of structure.geometric_details.floors) {
          if (!floor.is_parking_floor && floor.flats?.length > 0) {
            for (const flat of floor.flats) {
              if (!flat.flat_overall_rating?.combined_score) {
                allFlatsRated = false;
                break;
              }
            }
          }
          if (!allFlatsRated) break;
        }
        progress.ratings_completed = allFlatsRated;
      }
    }
  }

  // Calculate percentage
  const completedSteps = Object.values(progress).filter(val => val === true).length;
  progress.overall_percentage = Math.round((completedSteps / 6) * 100);

  return progress;
}

// Helper methods
generateBlockId() {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  /**
 * Get all structures for the authenticated user
 * @route GET /api/structures
 */
async getAllStructures(req, res) {
  try {
    console.log('📋 Getting all structures for user:', req.user.userId);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'creation_date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    let structures = user.structures || [];
    
    // Apply filters
    if (status) {
      structures = structures.filter(structure => structure.status === status);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      structures = structures.filter(structure => 
        structure.structural_identity?.structural_identity_number?.toLowerCase().includes(searchLower) ||
        structure.structural_identity?.uid?.toLowerCase().includes(searchLower) ||
        structure.administration?.client_name?.toLowerCase().includes(searchLower) ||
        structure.structural_identity?.city_name?.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort structures
    structures.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'creation_date':
          aValue = a.creation_info?.created_date || new Date(0);
          bValue = b.creation_info?.created_date || new Date(0);
          break;
        case 'last_updated':
          aValue = a.creation_info?.last_updated_date || new Date(0);
          bValue = b.creation_info?.last_updated_date || new Date(0);
          break;
        case 'structure_number':
          aValue = a.structural_identity?.structural_identity_number || '';
          bValue = b.structural_identity?.structural_identity_number || '';
          break;
        case 'client_name':
          aValue = a.administration?.client_name || '';
          bValue = b.administration?.client_name || '';
          break;
        default:
          aValue = a.creation_info?.created_date || new Date(0);
          bValue = b.creation_info?.created_date || new Date(0);
      }
      
      if (aValue < bValue) return -1 * sortOrder;
      if (aValue > bValue) return 1 * sortOrder;
      return 0;
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStructures = structures.slice(startIndex, endIndex);
    
    // Format response data
    const structuresData = paginatedStructures.map(structure => {
      const progress = this.calculateProgress(structure);
      const totalFlats = structure.geometric_details?.floors?.reduce(
        (sum, floor) => sum + (floor.flats?.length || 0), 0
      ) || 0;
      
      // Calculate ratings summary
      let ratedFlats = 0;
      let avgStructuralRating = null;
      let avgNonStructuralRating = null;
      
      if (structure.geometric_details?.floors) {
        const allStructuralRatings = [];
        const allNonStructuralRatings = [];
        
        structure.geometric_details.floors.forEach(floor => {
          if (floor.flats) {
            floor.flats.forEach(flat => {
              if (flat.flat_overall_rating?.combined_score) {
                ratedFlats++;
              }
              if (flat.structural_rating?.overall_average) {
                allStructuralRatings.push(flat.structural_rating.overall_average);
              }
              if (flat.non_structural_rating?.overall_average) {
                allNonStructuralRatings.push(flat.non_structural_rating.overall_average);
              }
            });
          }
        });
        
        if (allStructuralRatings.length > 0) {
          avgStructuralRating = this.calculateAverage(allStructuralRatings);
        }
        if (allNonStructuralRatings.length > 0) {
          avgNonStructuralRating = this.calculateAverage(allNonStructuralRatings);
        }
      }
      
      return {
        structure_id: structure._id,
        uid: structure.structural_identity?.uid,
        structural_identity_number: structure.structural_identity?.structural_identity_number,
        client_name: structure.administration?.client_name,
        location: {
          city_name: structure.structural_identity?.city_name,
          state_code: structure.structural_identity?.state_code,
          coordinates: structure.location?.coordinates
        },
        type_of_structure: structure.structural_identity?.type_of_structure,
        dimensions: {
          width: structure.geometric_details?.structure_width,
          length: structure.geometric_details?.structure_length,
          height: structure.geometric_details?.structure_height,
          floors: structure.geometric_details?.number_of_floors
        },
        status: structure.status,
        progress: progress,
        ratings_summary: {
          total_flats: totalFlats,
          rated_flats: ratedFlats,
          completion_percentage: totalFlats > 0 ? Math.round((ratedFlats / totalFlats) * 100) : 0,
          avg_structural_rating: avgStructuralRating,
          avg_non_structural_rating: avgNonStructuralRating,
          overall_health: avgStructuralRating ? this.getHealthStatus(avgStructuralRating) : null
        },
        timestamps: {
          created_date: structure.creation_info?.created_date,
          last_updated_date: structure.creation_info?.last_updated_date
        }
      };
    });
    
    sendPaginatedResponse(res, 'Structures retrieved successfully', {
      structures: structuresData,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: structures.length,
        total_pages: Math.ceil(structures.length / limit),
        has_next_page: endIndex < structures.length,
        has_prev_page: page > 1
      },
      filters: {
        status: status || 'all',
        search: search || '',
        sort_by: sortBy,
        sort_order: sortOrder === 1 ? 'asc' : 'desc'
      },
      summary: {
        total_structures: user.structures?.length || 0,
        by_status: this.getStructuresByStatus(user.structures || [])
      }
    });

  } catch (error) {
    console.error('❌ Get all structures error:', error);
    sendErrorResponse(res, 'Failed to retrieve structures', 500, error.message);
  }
}

/**
 * Get complete structure details by ID
 * @route GET /api/structures/:id
 */
async getStructureDetails(req, res) {
  try {
    console.log('🏢 Getting structure details for ID:', req.params.id);
    
    const { id } = req.params;
    const includeImages = req.query.include_images === 'true';
    const includeRatings = req.query.include_ratings !== 'false'; // Default true
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Calculate comprehensive metrics
    const progress = this.calculateProgress(structure);
    const recommendations = await this.generateMaintenanceRecommendations(structure);
    
    // Structure basic info
    const structureDetails = {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      structural_identity: structure.structural_identity || {},
      location: structure.location || {},
      administration: structure.administration || {},
      geometric_details: {
        number_of_floors: structure.geometric_details?.number_of_floors,
        structure_width: structure.geometric_details?.structure_width,
        structure_length: structure.geometric_details?.structure_length,
        structure_height: structure.geometric_details?.structure_height,
        total_area: structure.geometric_details?.structure_width && structure.geometric_details?.structure_length ? 
          structure.geometric_details.structure_width * structure.geometric_details.structure_length : null
      },
      status: structure.status,
      progress: progress,
      creation_info: structure.creation_info,
      
      // Statistics
      statistics: {
        total_floors: structure.geometric_details?.floors?.length || 0,
        total_flats: 0,
        rated_flats: 0,
        pending_ratings: 0,
        critical_issues: 0,
        high_priority_issues: 0
      },
      
      // Health summary
      health_summary: {
        overall_health_score: null,
        structural_health: null,
        non_structural_health: null,
        priority_level: null,
        last_assessment_date: null
      },
      
      // Floors and flats data
      floors: []
    };
    
    // Process floors and flats
    if (structure.geometric_details?.floors) {
      const allStructuralRatings = [];
      const allNonStructuralRatings = [];
      let lastAssessmentDate = null;
      
      structure.geometric_details.floors.forEach(floor => {
        const floorData = {
          floor_id: floor.floor_id,
          mongodb_id: floor._id,
          floor_number: floor.floor_number,
          floor_type: floor.floor_type,
          floor_height: floor.floor_height,
          total_area_sq_mts: floor.total_area_sq_mts,
          floor_label_name: floor.floor_label_name,
          floor_notes: floor.floor_notes,
          flats: []
        };
        
        if (floor.flats) {
          structureDetails.statistics.total_flats += floor.flats.length;
          
          floor.flats.forEach(flat => {
            const flatData = {
              flat_id: flat.flat_id,
              mongodb_id: flat._id,
              flat_number: flat.flat_number,
              flat_type: flat.flat_type,
              area_sq_mts: flat.area_sq_mts,
              direction_facing: flat.direction_facing,
              occupancy_status: flat.occupancy_status,
              flat_notes: flat.flat_notes,
              has_structural_ratings: this.hasStructuralRating(flat),
              has_non_structural_ratings: this.hasNonStructuralRating(flat)
            };
            
            // Include ratings if requested
            if (includeRatings) {
              flatData.structural_rating = flat.structural_rating || this.getDefaultStructuralRating();
              flatData.non_structural_rating = flat.non_structural_rating || this.getDefaultNonStructuralRating();
              flatData.flat_overall_rating = flat.flat_overall_rating || null;
              
              // Track ratings for statistics
              if (flat.flat_overall_rating?.combined_score) {
                structureDetails.statistics.rated_flats++;
                
                if (flat.flat_overall_rating.priority === 'Critical') {
                  structureDetails.statistics.critical_issues++;
                } else if (flat.flat_overall_rating.priority === 'High') {
                  structureDetails.statistics.high_priority_issues++;
                }
              }
              
              // Collect ratings for overall calculation
              if (flat.structural_rating?.overall_average) {
                allStructuralRatings.push(flat.structural_rating.overall_average);
                if (flat.structural_rating.assessment_date && 
                    (!lastAssessmentDate || flat.structural_rating.assessment_date > lastAssessmentDate)) {
                  lastAssessmentDate = flat.structural_rating.assessment_date;
                }
              }
              if (flat.non_structural_rating?.overall_average) {
                allNonStructuralRatings.push(flat.non_structural_rating.overall_average);
                if (flat.non_structural_rating.assessment_date && 
                    (!lastAssessmentDate || flat.non_structural_rating.assessment_date > lastAssessmentDate)) {
                  lastAssessmentDate = flat.non_structural_rating.assessment_date;
                }
              }
            }
            
            // Include images if requested
            if (includeImages) {
              flatData.images = this.extractFlatImages(flat);
            }
            
            floorData.flats.push(flatData);
          });
        }
        
        structureDetails.floors.push(floorData);
      });
      
      // Calculate overall health metrics
      if (allStructuralRatings.length > 0) {
        structureDetails.health_summary.structural_health = this.calculateAverage(allStructuralRatings);
      }
      if (allNonStructuralRatings.length > 0) {
        structureDetails.health_summary.non_structural_health = this.calculateAverage(allNonStructuralRatings);
      }
      
      // Calculate overall health score (70% structural, 30% non-structural)
      if (structureDetails.health_summary.structural_health && structureDetails.health_summary.non_structural_health) {
        const overallScore = (structureDetails.health_summary.structural_health * 0.7) + 
                           (structureDetails.health_summary.non_structural_health * 0.3);
        structureDetails.health_summary.overall_health_score = Math.round(overallScore * 10) / 10;
        structureDetails.health_summary.priority_level = this.getPriority(overallScore);
      }
      
      structureDetails.health_summary.last_assessment_date = lastAssessmentDate;
      structureDetails.statistics.pending_ratings = structureDetails.statistics.total_flats - structureDetails.statistics.rated_flats;
    }
    
    // Add maintenance recommendations summary
    structureDetails.maintenance_recommendations = {
      total_recommendations: recommendations.length,
      critical: recommendations.filter(r => r.priority === 'Critical').length,
      high: recommendations.filter(r => r.priority === 'High').length,
      medium: recommendations.filter(r => r.priority === 'Medium').length,
      recent_recommendations: recommendations.slice(0, 5) // Top 5 most critical
    };
    
    // Add remarks information
    const currentUser = await User.findById(req.user.userId);
    const userRole = this.hasRole(currentUser, 'FE') ? 'FE' : this.hasRole(currentUser, 'VE') ? 'VE' : null;
    
    structureDetails.remarks = {
      fe_remarks: structure.remarks?.fe_remarks || [],
      ve_remarks: structure.remarks?.ve_remarks || [],
      total_fe_remarks: (structure.remarks?.fe_remarks || []).length,
      total_ve_remarks: (structure.remarks?.ve_remarks || []).length,
      last_updated_by: structure.remarks?.last_updated_by || {},
      user_permissions: {
        can_view_remarks: userRole !== null,
        can_add_remarks: userRole !== null,
        can_edit_own_remarks: userRole !== null,
        user_role: userRole
      }
    };
    
    sendSuccessResponse(res, 'Structure details retrieved successfully', structureDetails);

  } catch (error) {
    console.error('❌ Get structure details error:', error);
    sendErrorResponse(res, 'Failed to retrieve structure details', 500, error.message);
  }
}

// =================== IMAGE MANAGEMENT APIs ===================

/**
 * Get all images for the authenticated user across all structures
 * @route GET /api/structures/images/all
 */
async getAllImages(req, res) {
  try {
    console.log('🖼️ Getting all images for user:', req.user.userId);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const imageType = req.query.type; // 'structural' or 'non_structural'
    const component = req.query.component; // specific component filter
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const allImages = [];
    
    // Extract images from all structures
    if (user.structures) {
      user.structures.forEach(structure => {
        if (structure.geometric_details?.floors) {
          structure.geometric_details.floors.forEach(floor => {
            if (floor.flats) {
              floor.flats.forEach(flat => {
                const images = this.extractFlatImages(flat, {
                  includeStructureInfo: true,
                  structureId: structure._id,
                  structureNumber: structure.structural_identity?.structural_identity_number,
                  floorNumber: floor.floor_number,
                  flatNumber: flat.flat_number,
                  imageType,
                  component
                });
                allImages.push(...images);
              });
            }
          });
        }
      });
    }
    
    // Sort by upload date (newest first)
    allImages.sort((a, b) => new Date(b.uploaded_date) - new Date(a.uploaded_date));
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = allImages.slice(startIndex, endIndex);
    
    // Group by structure for summary
    const imagesByStructure = {};
    allImages.forEach(image => {
      if (!imagesByStructure[image.structure_id]) {
        imagesByStructure[image.structure_id] = {
          structure_number: image.structure_number,
          total_images: 0,
          structural_images: 0,
          non_structural_images: 0
        };
      }
      imagesByStructure[image.structure_id].total_images++;
      if (image.rating_type === 'structural') {
        imagesByStructure[image.structure_id].structural_images++;
      } else {
        imagesByStructure[image.structure_id].non_structural_images++;
      }
    });
    
    sendPaginatedResponse(res, 'All images retrieved successfully', {
      images: paginatedImages,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: allImages.length,
        total_pages: Math.ceil(allImages.length / limit),
        has_next_page: endIndex < allImages.length,
        has_prev_page: page > 1
      },
      summary: {
        total_images: allImages.length,
        structural_images: allImages.filter(img => img.rating_type === 'structural').length,
        non_structural_images: allImages.filter(img => img.rating_type === 'non_structural').length,
        images_by_structure: imagesByStructure
      },
      filters: {
        type: imageType || 'all',
        component: component || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Get all images error:', error);
    sendErrorResponse(res, 'Failed to retrieve images', 500, error.message);
  }
}

/**
 * Get images for a specific structure
 * @route GET /api/structures/:id/images
 */
async getStructureImages(req, res) {
  try {
    console.log('🖼️ Getting images for structure:', req.params.id);
    
    const { id } = req.params;
    const imageType = req.query.type; // 'structural' or 'non_structural'
    const component = req.query.component; // specific component filter
    const floorNumber = req.query.floor; // specific floor filter
    const groupBy = req.query.group_by || 'component'; // 'component', 'floor', 'flat', 'date'
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    const structureImages = [];
    
    // Extract images from the structure
    if (structure.geometric_details?.floors) {
      structure.geometric_details.floors.forEach(floor => {
        // Apply floor filter if specified
        if (floorNumber && floor.floor_number !== parseInt(floorNumber)) {
          return;
        }
        
        if (floor.flats) {
          floor.flats.forEach(flat => {
            const images = this.extractFlatImages(flat, {
              includeLocationInfo: true,
              floorNumber: floor.floor_number,
              floorLabel: floor.floor_label_name,
              flatNumber: flat.flat_number,
              flatType: flat.flat_type,
              imageType,
              component
            });
            structureImages.push(...images);
          });
        }
      });
    }
    
    // Group images based on groupBy parameter
    let groupedImages = {};
    
    switch (groupBy) {
      case 'floor':
        structureImages.forEach(image => {
          const key = `Floor ${image.floor_number}`;
          if (!groupedImages[key]) {
            groupedImages[key] = [];
          }
          groupedImages[key].push(image);
        });
        break;
        
      case 'flat':
        structureImages.forEach(image => {
          const key = `Floor ${image.floor_number} - Flat ${image.flat_number}`;
          if (!groupedImages[key]) {
            groupedImages[key] = [];
          }
          groupedImages[key].push(image);
        });
        break;
        
      case 'date':
        structureImages.forEach(image => {
          const date = new Date(image.uploaded_date).toISOString().split('T')[0];
          if (!groupedImages[date]) {
            groupedImages[date] = [];
          }
          groupedImages[date].push(image);
        });
        break;
        
      case 'component':
      default:
        structureImages.forEach(image => {
          const key = `${image.rating_type} - ${image.component}`;
          if (!groupedImages[key]) {
            groupedImages[key] = [];
          }
          groupedImages[key].push(image);
        });
        break;
    }
    
    // Convert to array format with metadata
    const groupedResult = Object.keys(groupedImages).map(groupKey => ({
      group_name: groupKey,
      total_images: groupedImages[groupKey].length,
      images: groupedImages[groupKey].sort((a, b) => new Date(b.uploaded_date) - new Date(a.uploaded_date))
    }));
    
    // Calculate summary statistics
    const summary = {
      total_images: structureImages.length,
      structural_images: structureImages.filter(img => img.rating_type === 'structural').length,
      non_structural_images: structureImages.filter(img => img.rating_type === 'non_structural').length,
      images_by_rating: {},
      latest_upload: structureImages.length > 0 ? Math.max(...structureImages.map(img => new Date(img.uploaded_date))) : null
    };
    
    // Group by rating levels
    [1, 2, 3, 4, 5].forEach(rating => {
      summary.images_by_rating[`rating_${rating}`] = structureImages.filter(img => img.rating === rating).length;
    });
    
    sendSuccessResponse(res, 'Structure images retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      structure_number: structure.structural_identity?.structural_identity_number,
      grouped_images: groupedResult,
      summary: summary,
      filters: {
        type: imageType || 'all',
        component: component || 'all',
        floor: floorNumber || 'all',
        grouped_by: groupBy
      }
    });

  } catch (error) {
    console.error('❌ Get structure images error:', error);
    sendErrorResponse(res, 'Failed to retrieve structure images', 500, error.message);
  }
}

/**
 * Get user-level image statistics and recent uploads
 * @route GET /api/structures/images/user-stats
 */
async getUserImageStats(req, res) {
  try {
    console.log('📊 Getting user image statistics:', req.user.userId);
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const stats = {
      total_images: 0,
      structural_images: 0,
      non_structural_images: 0,
      images_by_component: {},
      images_by_rating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      images_by_structure: {},
      recent_uploads: [],
      upload_timeline: {}
    };
    
    const allImages = [];
    
    // Process all structures
    if (user.structures) {
      user.structures.forEach(structure => {
        const structureKey = structure.structural_identity?.structural_identity_number || structure._id;
        stats.images_by_structure[structureKey] = {
          structure_id: structure._id,
          total: 0,
          structural: 0,
          non_structural: 0
        };
        
        if (structure.geometric_details?.floors) {
          structure.geometric_details.floors.forEach(floor => {
            if (floor.flats) {
              floor.flats.forEach(flat => {
                const images = this.extractFlatImages(flat, {
                  includeStructureInfo: true,
                  structureId: structure._id,
                  structureNumber: structureKey
                });
                
                images.forEach(image => {
                  stats.total_images++;
                  allImages.push(image);
                  
                  // Count by type
                  if (image.rating_type === 'structural') {
                    stats.structural_images++;
                    stats.images_by_structure[structureKey].structural++;
                  } else {
                    stats.non_structural_images++;
                    stats.images_by_structure[structureKey].non_structural++;
                  }
                  
                  stats.images_by_structure[structureKey].total++;
                  
                  // Count by component
                  if (!stats.images_by_component[image.component]) {
                    stats.images_by_component[image.component] = 0;
                  }
                  stats.images_by_component[image.component]++;
                  
                  // Count by rating
                  if (image.rating >= 1 && image.rating <= 5) {
                    stats.images_by_rating[image.rating]++;
                  }
                  
                  // Group by upload date for timeline
                  const uploadDate = new Date(image.uploaded_date).toISOString().split('T')[0];
                  if (!stats.upload_timeline[uploadDate]) {
                    stats.upload_timeline[uploadDate] = 0;
                  }
                  stats.upload_timeline[uploadDate]++;
                });
              });
            }
          });
        }
      });
    }
    
    // Get recent uploads (last 10)
    stats.recent_uploads = allImages
      .sort((a, b) => new Date(b.uploaded_date) - new Date(a.uploaded_date))
      .slice(0, 10)
      .map(image => ({
        image_url: image.image_url,
        component: image.component,
        rating_type: image.rating_type,
        rating: image.rating,
        structure_number: image.structure_number,
        location: `Floor ${image.floor_number}, Flat ${image.flat_number}`,
        uploaded_date: image.uploaded_date
      }));
    
    // Calculate percentages
    const imagePercentages = {
      structural_percentage: stats.total_images > 0 ? Math.round((stats.structural_images / stats.total_images) * 100) : 0,
      non_structural_percentage: stats.total_images > 0 ? Math.round((stats.non_structural_images / stats.total_images) * 100) : 0,
      critical_images_percentage: stats.total_images > 0 ? Math.round(((stats.images_by_rating[1] + stats.images_by_rating[2]) / stats.total_images) * 100) : 0
    };
    
    sendSuccessResponse(res, 'User image statistics retrieved successfully', {
      user_id: req.user.userId,
      username: user.username,
      total_structures: user.structures?.length || 0,
      image_statistics: stats,
      percentages: imagePercentages,
      summary: {
        most_documented_component: Object.keys(stats.images_by_component).reduce((a, b) => 
          stats.images_by_component[a] > stats.images_by_component[b] ? a : b, ''
        ),
        most_active_structure: Object.keys(stats.images_by_structure).reduce((a, b) => 
          stats.images_by_structure[a].total > stats.images_by_structure[b].total ? a : b, ''
        ),
        documentation_quality: stats.total_images > 0 ? 
          (stats.images_by_rating[4] + stats.images_by_rating[5]) / stats.total_images > 0.7 ? 'Good' :
          (stats.images_by_rating[4] + stats.images_by_rating[5]) / stats.total_images > 0.4 ? 'Fair' : 'Needs Improvement'
          : 'No Data'
      }
    });

  } catch (error) {
    console.error('❌ Get user image stats error:', error);
    sendErrorResponse(res, 'Failed to retrieve user image statistics', 500, error.message);
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

  // =================== UTILITY METHODS FOR ROLES ===================
  hasRole(user, requiredRole) {
    // Check if user has the required role in their roles array or primary role
    return user.roles?.includes(requiredRole) || user.role === requiredRole;
  }

  // Check role from request user object (which includes roles array)
  hasRoleFromRequest(req, requiredRole) {
    const userRoles = req.user.roles || [req.user.role];
    return userRoles.includes(requiredRole);
  }

  getUserFullName(user) {
    if (user.profile?.first_name || user.profile?.last_name) {
      return `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim();
    }
    return user.username;
  }

  // =================== REMARKS MANAGEMENT ===================
  
  /**
   * Add a remark to a structure
   * @route POST /api/structures/:id/remarks
   * @access Private (FE, VE roles)
   */
  async addRemark(req, res) {
    try {
      const { id } = req.params;
      const { text } = req.body;
      
      if (!text || text.trim().length === 0) {
        return sendErrorResponse(res, 'Remark text is required', 400);
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      // Check if user has FE or VE role
      const userRole = this.hasRoleFromRequest(req, 'FE') ? 'FE' : this.hasRoleFromRequest(req, 'VE') ? 'VE' : null;
      if (!userRole) {
        return sendErrorResponse(res, 'Only Field Engineers (FE) and Verification Engineers (VE) can add remarks', 403);
      }

      const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
      
      // Initialize remarks object if it doesn't exist
      if (!structure.remarks) {
        structure.remarks = {
          fe_remarks: [],
          ve_remarks: [],
          last_updated_by: {}
        };
      }

      const authorName = this.getUserFullName(user);
      const newRemark = {
        text: text.trim(),
        author_name: authorName,
        author_role: userRole,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Add remark to appropriate array based on user role
      if (userRole === 'FE') {
        structure.remarks.fe_remarks.push(newRemark);
      } else if (userRole === 'VE') {
        structure.remarks.ve_remarks.push(newRemark);
      }

      // Update last_updated_by information
      structure.remarks.last_updated_by = {
        role: userRole,
        name: authorName,
        date: new Date()
      };

      structure.creation_info.last_updated_date = new Date();
      await user.save();

      sendSuccessResponse(res, 'Remark updated successfully', {
        remark_id: updatedRemark._id,
        text: updatedRemark.text,
        updated_at: updatedRemark.updated_at,
        author_name: updatedRemark.author_name,
        author_role: updatedRemark.author_role
      });

    } catch (error) {
      console.error('❌ Update remark error:', error);
      sendErrorResponse(res, 'Failed to update remark', 500, error.message);
    }
  }

  // Add after the addRemark method in your controller:

async updateRemark(req, res) {
  try {
    const { id, remarkId } = req.params;
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return sendErrorResponse(res, 'Remark text is required', 400);
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const userRole = this.hasRoleFromRequest(req, 'FE') ? 'FE' : 
                     this.hasRoleFromRequest(req, 'VE') ? 'VE' : null;
    if (!userRole) {
      return sendErrorResponse(res, 'Only FE and VE can update remarks', 403);
    }

    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    if (!structure.remarks) {
      return sendErrorResponse(res, 'No remarks found', 404);
    }

    const authorName = this.getUserFullName(user);
    let updatedRemark = null;

    if (userRole === 'FE' && structure.remarks.fe_remarks) {
      const remark = structure.remarks.fe_remarks.id(remarkId);
      if (remark) {
        if (remark.author_name !== authorName) {
          return sendErrorResponse(res, 'You can only update your own remarks', 403);
        }
        remark.text = text.trim();
        remark.updated_at = new Date();
        updatedRemark = remark;
      }
    } else if (userRole === 'VE' && structure.remarks.ve_remarks) {
      const remark = structure.remarks.ve_remarks.id(remarkId);
      if (remark) {
        if (remark.author_name !== authorName) {
          return sendErrorResponse(res, 'You can only update your own remarks', 403);
        }
        remark.text = text.trim();
        remark.updated_at = new Date();
        updatedRemark = remark;
      }
    }

    if (!updatedRemark) {
      return sendErrorResponse(res, 'Remark not found', 404);
    }

    structure.remarks.last_updated_by = {
      role: userRole,
      name: authorName,
      date: new Date()
    };

    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();

    sendUpdatedResponse(res, {
      remark_id: updatedRemark._id,
      text: updatedRemark.text,
      updated_at: updatedRemark.updated_at
    }, 'Remark updated successfully');

  } catch (error) {
    console.error('❌ Update remark error:', error);
    sendErrorResponse(res, 'Failed to update remark', 500, error.message);
  }
}

async getRemarks(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const userRole = this.hasRoleFromRequest(req, 'FE') ? 'FE' : 
                     this.hasRoleFromRequest(req, 'VE') ? 'VE' : null;
    if (!userRole) {
      return sendErrorResponse(res, 'Only FE and VE can view remarks', 403);
    }

    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    const remarks = structure.remarks || {
      fe_remarks: [],
      ve_remarks: [],
      last_updated_by: {}
    };

    sendSuccessResponse(res, 'Remarks retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      fe_remarks: remarks.fe_remarks,
      ve_remarks: remarks.ve_remarks,
      total_fe_remarks: remarks.fe_remarks.length,
      total_ve_remarks: remarks.ve_remarks.length,
      last_updated_by: remarks.last_updated_by
    });

  } catch (error) {
    console.error('❌ Get remarks error:', error);
    sendErrorResponse(res, 'Failed to retrieve remarks', 500, error.message);
  }
}

async deleteRemark(req, res) {
  try {
    const { id, remarkId } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const userRole = this.hasRoleFromRequest(req, 'FE') ? 'FE' : 
                     this.hasRoleFromRequest(req, 'VE') ? 'VE' : null;
    if (!userRole) {
      return sendErrorResponse(res, 'Only FE and VE can delete remarks', 403);
    }

    const { user: structureOwner, structure } = await this.findStructureAcrossUsers(id);
    
    if (!structure.remarks) {
      return sendErrorResponse(res, 'No remarks found', 404);
    }

    const authorName = this.getUserFullName(user);
    let remarkFound = false;

    if (userRole === 'FE' && structure.remarks.fe_remarks) {
      const remark = structure.remarks.fe_remarks.id(remarkId);
      if (remark) {
        if (remark.author_name !== authorName) {
          return sendErrorResponse(res, 'You can only delete your own remarks', 403);
        }
        structure.remarks.fe_remarks.pull(remarkId);
        remarkFound = true;
      }
    } else if (userRole === 'VE' && structure.remarks.ve_remarks) {
      const remark = structure.remarks.ve_remarks.id(remarkId);
      if (remark) {
        if (remark.author_name !== authorName) {
          return sendErrorResponse(res, 'You can only delete your own remarks', 403);
        }
        structure.remarks.ve_remarks.pull(remarkId);
        remarkFound = true;
      }
    }

    if (!remarkFound) {
      return sendErrorResponse(res, 'Remark not found', 404);
    }

    structure.creation_info.last_updated_date = new Date();
    await structureOwner.save();

    sendSuccessResponse(res, 'Remark deleted successfully', {
      structure_id: id,
      deleted_remark_id: remarkId
    });

  } catch (error) {
    console.error('❌ Delete remark error:', error);
    sendErrorResponse(res, 'Failed to delete remark', 500, error.message);
  }
}



  /**
   * Delete a structure (soft delete or permanent removal)
   * @route DELETE /api/structures/:id
   * @access Private (Owner or Admin)
   */
  async deleteStructure(req, res) {
    try {
      const { id } = req.params;
      const { permanent = false } = req.query; // Optional: ?permanent=true for hard delete
      
      console.log(`🗑️ Deleting structure ${id} (permanent: ${permanent})`);
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      // Find the structure
      const structureIndex = user.structures.findIndex(
        s => s._id.toString() === id
      );

      if (structureIndex === -1) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }

      const structure = user.structures[structureIndex];

      // Check permissions (only owner can delete, unless admin)
      // Add admin check if needed: || req.user.role === 'admin'
      
      if (permanent === 'true' || permanent === true) {
        // Permanent deletion - completely remove from array
        const deletedStructure = user.structures[structureIndex];
        user.structures.splice(structureIndex, 1);
        
        console.log(`✅ Structure ${id} permanently deleted`);
        
        await user.save();
        
        return sendSuccessResponse(res, 'Structure permanently deleted', {
          structure_id: id,
          uid: deletedStructure.structural_identity?.uid,
          structure_number: deletedStructure.structural_identity?.structural_identity_number,
          deletion_type: 'permanent',
          deleted_at: new Date()
        });
      } else {
        // Soft delete - mark as deleted but keep in database
        structure.status = 'deleted';
        structure.creation_info.last_updated_date = new Date();
        
        // Add deletion metadata
        if (!structure.deletion_info) {
          structure.deletion_info = {};
        }
        structure.deletion_info.deleted_at = new Date();
        structure.deletion_info.deleted_by = req.user.userId;
        
        console.log(`✅ Structure ${id} soft deleted (can be restored)`);
        
        await user.save();
        
        return sendSuccessResponse(res, 'Structure deleted successfully', {
          structure_id: id,
          uid: structure.structural_identity?.uid,
          structure_number: structure.structural_identity?.structural_identity_number,
          deletion_type: 'soft',
          deleted_at: structure.deletion_info.deleted_at,
          note: 'Structure marked as deleted. Use permanent=true query param to delete permanently.'
        });
      }

    } catch (error) {
      console.error('❌ Delete structure error:', error);
      sendErrorResponse(res, 'Failed to delete structure', 500, error.message);
    }
  }


  // =================== END OF CLASS ===================
}

module.exports = new StructureController();