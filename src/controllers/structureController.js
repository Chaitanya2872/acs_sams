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
    this.saveGeometricScreen = this.saveGeometricScreen.bind(this);
    this.getGeometricScreen = this.getGeometricScreen.bind(this);
    this.updateGeometricScreen = this.updateGeometricScreen.bind(this);
    this.saveRatingsScreen = this.saveRatingsScreen.bind(this);
    this.getRatingsScreen = this.getRatingsScreen.bind(this);
    this.updateRatingsScreen = this.updateRatingsScreen.bind(this);
    this.getStructureProgress = this.getStructureProgress.bind(this);
    this.submitStructure = this.submitStructure.bind(this);
    this.validateStructureNumber = this.validateStructureNumber.bind(this);
    this.getLocationStructureStats = this.getLocationStructureStats.bind(this);
    
    // Keep existing methods
    this.getStructures = this.getStructures.bind(this);
    this.getStructuresByUserId = this.getStructuresByUserId.bind(this);
    this.getStructureById = this.getStructureById.bind(this);
    this.getStructureByUID = this.getStructureByUID.bind(this);
    this.getStructureFloors = this.getStructureFloors.bind(this);
    this.getFloorFlats = this.getFloorFlats.bind(this);
    this.deleteStructure = this.deleteStructure.bind(this);
    this.getStructureStats = this.getStructureStats.bind(this);
    this.getStructuresRequiringInspection = this.getStructuresRequiringInspection.bind(this);
    this.getMaintenanceRecommendations = this.getMaintenanceRecommendations.bind(this);
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

  checkScreenCompletion(structure) {
    const completion = {
      location: false,       // Screen 1: Structure Identification + GPS Location
      administrative: false, // Screen 2: Admin Details
      geometric: false,      // Screen 3: Building Dimensions + Floors/Flats
      ratings: false,        // Screen 4: Flat-wise Ratings
      overall: 0
    };

    // Check Location Screen (Structure Identification + GPS + Zip Code)
    if (structure.structural_identity && 
        structure.structural_identity.zip_code &&
        structure.structural_identity.state_code &&
        structure.structural_identity.district_code &&
        structure.structural_identity.city_name &&
        structure.structural_identity.location_code &&
        structure.structural_identity.structure_number &&
        structure.structural_identity.type_of_structure &&
        structure.location && 
        structure.location.coordinates &&
        structure.location.coordinates.latitude &&
        structure.location.coordinates.longitude) {
      completion.location = true;
    }

    // Check Administrative Screen
    if (structure.administration &&
        structure.administration.client_name &&
        structure.administration.custodian &&
        structure.administration.engineer_designation &&
        structure.administration.contact_details &&
        structure.administration.email_id) {
      completion.administrative = true;
    }

    // Check Geometric Screen (includes floors and flats setup)
    if (structure.geometric_details &&
        structure.geometric_details.number_of_floors &&
        structure.geometric_details.structure_width &&
        structure.geometric_details.structure_length &&
        structure.geometric_details.structure_height &&
        structure.geometric_details.floors &&
        structure.geometric_details.floors.length > 0) {
      
      // Check if all floors have at least one flat
      const allFloorsHaveFlats = structure.geometric_details.floors.every(floor => 
        floor.flats && floor.flats.length > 0
      );
      
      if (allFloorsHaveFlats) {
        completion.geometric = true;
      }
    }

    // Check Ratings Screen (All flats must have both structural and non-structural ratings)
    if (structure.geometric_details && 
        structure.geometric_details.floors && 
        structure.geometric_details.floors.length > 0) {
      
      let allFlatsHaveRatings = true;
      
      for (const floor of structure.geometric_details.floors) {
        if (!floor.flats || floor.flats.length === 0) {
          allFlatsHaveRatings = false;
          break;
        }
        
        for (const flat of floor.flats) {
          // Check structural ratings
          const hasStructuralRatings = flat.structural_rating &&
            flat.structural_rating.beams && flat.structural_rating.beams.rating &&
            flat.structural_rating.columns && flat.structural_rating.columns.rating &&
            flat.structural_rating.slab && flat.structural_rating.slab.rating &&
            flat.structural_rating.foundation && flat.structural_rating.foundation.rating;
          
          // Check non-structural ratings
          const hasNonStructuralRatings = flat.non_structural_rating &&
            flat.non_structural_rating.brick_plaster && flat.non_structural_rating.brick_plaster.rating &&
            flat.non_structural_rating.doors_windows && flat.non_structural_rating.doors_windows.rating &&
            flat.non_structural_rating.flooring_tiles && flat.non_structural_rating.flooring_tiles.rating &&
            flat.non_structural_rating.electrical_wiring && flat.non_structural_rating.electrical_wiring.rating &&
            flat.non_structural_rating.sanitary_fittings && flat.non_structural_rating.sanitary_fittings.rating &&
            flat.non_structural_rating.railings && flat.non_structural_rating.railings.rating &&
            flat.non_structural_rating.water_tanks && flat.non_structural_rating.water_tanks.rating &&
            flat.non_structural_rating.plumbing && flat.non_structural_rating.plumbing.rating &&
            flat.non_structural_rating.sewage_system && flat.non_structural_rating.sewage_system.rating &&
            flat.non_structural_rating.panel_board && flat.non_structural_rating.panel_board.rating &&
            flat.non_structural_rating.lifts && flat.non_structural_rating.lifts.rating;
          
          if (!hasStructuralRatings || !hasNonStructuralRatings) {
            allFlatsHaveRatings = false;
            break;
          }
        }
        
        if (!allFlatsHaveRatings) break;
      }
      
      completion.ratings = allFlatsHaveRatings;
    }

    // Calculate overall completion percentage
    const completedScreens = Object.values(completion).filter(value => value === true).length;
    completion.overall = Math.round((completedScreens / 4) * 100);

    return completion;
  }

  // =================== STRUCTURE INITIALIZATION ===================

  async initializeStructure(req, res) {
    try {
      console.log('🚀 Initializing new structure...');
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      // Create basic structure with UID
      const newStructure = {
        structural_identity: {
          uid: this.structureNumberGenerator.generateUID(),
          structural_identity_number: '',
          zip_code: '',
          state_code: '',
          district_code: '',
          city_name: '',
          location_code: '',
          structure_number: '',
          type_of_structure: 'residential', // default
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
          created_date: new Date()
        },
        status: 'draft'
      };

      user.structures.push(newStructure);
      await user.save();

      const createdStructure = user.structures[user.structures.length - 1];
      
      console.log('✅ Structure initialized with UID:', createdStructure.structural_identity.uid);
      
      sendCreatedResponse(res, {
        _id: createdStructure._id,
        uid: createdStructure.structural_identity.uid,
        status: createdStructure.status,
        progress: this.checkScreenCompletion(createdStructure)
      }, 'Structure initialized successfully');

    } catch (error) {
      console.error('❌ Structure initialization error:', error);
      sendErrorResponse(res, 'Failed to initialize structure', 500, error.message);
    }
  }

  // =================== SCREEN 1: LOCATION (Structure Identification + GPS + Zip Code) ===================

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
        uid: structure.structural_identity.uid, // Keep existing UID
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
      
      const progress = this.checkScreenCompletion(structure);
      
      console.log(`✅ Generated Structure Number: ${generatedNumbers.structural_identity_number}`);
      console.log(`📋 Display Format: ${generatedNumbers.formatted_display}`);
      
      sendSuccessResponse(res, 'Location screen data saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        screen: 'location',
        data: {
          structural_identity: structure.structural_identity,
          location: structure.location,
          generated_numbers: generatedNumbers,
          formatted_display: generatedNumbers.formatted_display
        },
        progress
      });

    } catch (error) {
      console.error('❌ Location screen save error:', error);
      
      if (error.message.includes('State code') || 
          error.message.includes('District code') ||
          error.message.includes('City name') ||
          error.message.includes('Location code') ||
          error.message.includes('Invalid structure type')) {
        return sendErrorResponse(res, error.message, 400);
      }
      
      sendErrorResponse(res, 'Failed to save location screen data', 500, error.message);
    }
  }

  async getLocationScreen(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      // Include formatted display if structure number exists
      let responseData = {
        structural_identity: structure.structural_identity || {},
        location: structure.location || { coordinates: {} }
      };
      
      if (structure.structural_identity?.structural_identity_number) {
        try {
          const parsed = this.structureNumberGenerator.parseStructuralIdentityNumber(
            structure.structural_identity.structural_identity_number
          );
          responseData.formatted_display = `${parsed.state_code}-${parsed.district_code}-${parsed.city_code}-${parsed.location_code}-${parsed.structure_sequence}-${parsed.type_code}`;
          responseData.parsed_components = parsed;
        } catch (parseError) {
          console.warn('Could not parse existing structure number:', parseError.message);
        }
      }
      
      sendSuccessResponse(res, 'Location screen data retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        screen: 'location',
        data: responseData
      });

    } catch (error) {
      console.error('❌ Location screen get error:', error);
      sendErrorResponse(res, 'Failed to get location screen data', 500, error.message);
    }
  }

  async updateLocationScreen(req, res) {
    return this.saveLocationScreen(req, res);
  }

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

  // =================== SCREEN 2: ADMINISTRATIVE ===================

  async saveAdministrativeScreen(req, res) {
    try {
      const { id } = req.params;
      const { client_name, custodian, engineer_designation, contact_details, email_id } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      // Update administration details
      structure.administration = {
        client_name,
        custodian,
        engineer_designation,
        contact_details,
        email_id
      };
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      const progress = this.checkScreenCompletion(structure);
      
      sendSuccessResponse(res, 'Administrative screen data saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        screen: 'administrative',
        data: structure.administration,
        progress
      });

    } catch (error) {
      console.error('❌ Administrative screen save error:', error);
      sendErrorResponse(res, 'Failed to save administrative screen data', 500, error.message);
    }
  }

  async getAdministrativeScreen(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      sendSuccessResponse(res, 'Administrative screen data retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        screen: 'administrative',
        data: structure.administration || {}
      });

    } catch (error) {
      console.error('❌ Administrative screen get error:', error);
      sendErrorResponse(res, 'Failed to get administrative screen data', 500, error.message);
    }
  }

  async updateAdministrativeScreen(req, res) {
    return this.saveAdministrativeScreen(req, res);
  }

  // =================== SCREEN 3: GEOMETRIC (Building Dimensions + Floors/Flats Setup) ===================

  async saveGeometricScreen(req, res) {
    try {
      const { id } = req.params;
      const { number_of_floors, structure_width, structure_length, structure_height, floors } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      // Update geometric details
      structure.geometric_details = {
        ...structure.geometric_details,
        number_of_floors: parseInt(number_of_floors),
        structure_width: parseFloat(structure_width),
        structure_length: parseFloat(structure_length),
        structure_height: parseFloat(structure_height)
      };
      
      // Process floors and flats setup
      if (floors && Array.isArray(floors)) {
        structure.geometric_details.floors = floors.map(floorData => ({
          floor_number: floorData.floor_number || 1,
          floor_type: floorData.floor_type || 'residential',
          floor_height: floorData.floor_height || null,
          total_area_sq_mts: floorData.total_area_sq_mts || null,
          floor_label_name: floorData.floor_label_name || `Floor ${floorData.floor_number}`,
          number_of_flats: floorData.number_of_flats || 1,
          flats: floorData.flats ? floorData.flats.map(flatData => ({
            flat_number: flatData.flat_number || `F${floorData.floor_number}-01`,
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
            }
          })) : [{
            flat_number: `F${floorData.floor_number}-01`,
            flat_type: '2bhk',
            area_sq_mts: null,
            direction_facing: 'north',
            occupancy_status: 'occupied',
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
            }
          }],
          floor_notes: floorData.floor_notes || ''
        }));
      } else {
        // Default setup - create floors with single flat each
        structure.geometric_details.floors = [];
        for (let i = 1; i <= number_of_floors; i++) {
          structure.geometric_details.floors.push({
            floor_number: i,
            floor_type: 'residential',
            floor_height: null,
            total_area_sq_mts: null,
            floor_label_name: `Floor ${i}`,
            number_of_flats: 1,
            flats: [{
              flat_number: `F${i}-01`,
              flat_type: '2bhk',
              area_sq_mts: null,
              direction_facing: 'north',
              occupancy_status: 'occupied',
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
              }
            }],
            floor_notes: ''
          });
        }
      }
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      const progress = this.checkScreenCompletion(structure);
      
      // Calculate summary
      const totalFlats = structure.geometric_details.floors.reduce((sum, floor) => 
        sum + (floor.flats ? floor.flats.length : 0), 0
      );
      
      sendSuccessResponse(res, 'Geometric screen data saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        screen: 'geometric',
        data: {
          number_of_floors: structure.geometric_details.number_of_floors,
          structure_width: structure.geometric_details.structure_width,
          structure_length: structure.geometric_details.structure_length,
          structure_height: structure.geometric_details.structure_height,
          floors_count: structure.geometric_details.floors.length,
          total_flats: totalFlats,
          total_area: structure.geometric_details.structure_width * structure.geometric_details.structure_length,
          floors: structure.geometric_details.floors.map(floor => ({
            floor_number: floor.floor_number,
            floor_type: floor.floor_type,
            flats_count: floor.flats ? floor.flats.length : 0,
            flats: floor.flats ? floor.flats.map(flat => ({
              flat_number: flat.flat_number,
              flat_type: flat.flat_type,
              area_sq_mts: flat.area_sq_mts,
              direction_facing: flat.direction_facing,
              occupancy_status: flat.occupancy_status
            })) : []
          }))
        },
        progress
      });

    } catch (error) {
      console.error('❌ Geometric screen save error:', error);
      sendErrorResponse(res, 'Failed to save geometric screen data', 500, error.message);
    }
  }

  async getGeometricScreen(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const geometricData = structure.geometric_details || {};
      const totalFlats = geometricData.floors ? geometricData.floors.reduce((sum, floor) => 
        sum + (floor.flats ? floor.flats.length : 0), 0
      ) : 0;
      
      sendSuccessResponse(res, 'Geometric screen data retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        screen: 'geometric',
        data: {
          number_of_floors: geometricData.number_of_floors,
          structure_width: geometricData.structure_width,
          structure_length: geometricData.structure_length,
          structure_height: geometricData.structure_height,
          floors: geometricData.floors || [],
          floors_count: geometricData.floors ? geometricData.floors.length : 0,
          total_flats: totalFlats,
          total_area: geometricData.structure_width && geometricData.structure_length ? 
            geometricData.structure_width * geometricData.structure_length : null
        }
      });

    } catch (error) {
      console.error('❌ Geometric screen get error:', error);
      sendErrorResponse(res, 'Failed to get geometric screen data', 500, error.message);
    }
  }

  async updateGeometricScreen(req, res) {
    return this.saveGeometricScreen(req, res);
  }

  // =================== SCREEN 4: FLAT-WISE RATINGS (Structural + Non-Structural for each flat) ===================

  async saveRatingsScreen(req, res) {
    try {
      const { id } = req.params;
      const { floors } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      if (!structure.geometric_details.floors || structure.geometric_details.floors.length === 0) {
        return sendErrorResponse(res, 'Please complete Geometric screen first', 400);
      }
      
      // Update ratings for each flat in each floor
      floors.forEach(floorData => {
        const existingFloor = structure.geometric_details.floors.find(f => 
          f.floor_number === floorData.floor_number
        );
        
        if (existingFloor && floorData.flats) {
          floorData.flats.forEach(flatData => {
            const existingFlat = existingFloor.flats.find(f => 
              f.flat_number === flatData.flat_number
            );
            
            if (existingFlat) {
              // Update structural ratings
              if (flatData.structural_rating) {
                existingFlat.structural_rating = {
                  beams: {
                    rating: parseInt(flatData.structural_rating.beams.rating),
                    condition_comment: flatData.structural_rating.beams.condition_comment || '',
                    inspection_date: new Date(),
                    photos: flatData.structural_rating.beams.photos || []
                  },
                  columns: {
                    rating: parseInt(flatData.structural_rating.columns.rating),
                    condition_comment: flatData.structural_rating.columns.condition_comment || '',
                    inspection_date: new Date(),
                    photos: flatData.structural_rating.columns.photos || []
                  },
                  slab: {
                    rating: parseInt(flatData.structural_rating.slab.rating),
                    condition_comment: flatData.structural_rating.slab.condition_comment || '',
                    inspection_date: new Date(),
                    photos: flatData.structural_rating.slab.photos || []
                  },
                  foundation: {
                    rating: parseInt(flatData.structural_rating.foundation.rating),
                    condition_comment: flatData.structural_rating.foundation.condition_comment || '',
                    inspection_date: new Date(),
                    photos: flatData.structural_rating.foundation.photos || []
                  }
                };
              }

              // Update non-structural ratings
              if (flatData.non_structural_rating) {
                existingFlat.non_structural_rating = {
                  brick_plaster: {
                    rating: parseInt(flatData.non_structural_rating.brick_plaster.rating),
                    condition_comment: flatData.non_structural_rating.brick_plaster.condition_comment || '',
                    photos: flatData.non_structural_rating.brick_plaster.photos || []
                  },
                  doors_windows: {
                    rating: parseInt(flatData.non_structural_rating.doors_windows.rating),
                    condition_comment: flatData.non_structural_rating.doors_windows.condition_comment || '',
                    photos: flatData.non_structural_rating.doors_windows.photos || []
                  },
                  flooring_tiles: {
                    rating: parseInt(flatData.non_structural_rating.flooring_tiles.rating),
                    condition_comment: flatData.non_structural_rating.flooring_tiles.condition_comment || '',
                    photos: flatData.non_structural_rating.flooring_tiles.photos || []
                  },
                  electrical_wiring: {
                    rating: parseInt(flatData.non_structural_rating.electrical_wiring.rating),
                    condition_comment: flatData.non_structural_rating.electrical_wiring.condition_comment || '',
                    photos: flatData.non_structural_rating.electrical_wiring.photos || []
                  },
                  sanitary_fittings: {
                    rating: parseInt(flatData.non_structural_rating.sanitary_fittings.rating),
                    condition_comment: flatData.non_structural_rating.sanitary_fittings.condition_comment || '',
                    photos: flatData.non_structural_rating.sanitary_fittings.photos || []
                  },
                  railings: {
                    rating: parseInt(flatData.non_structural_rating.railings.rating),
                    condition_comment: flatData.non_structural_rating.railings.condition_comment || '',
                    photos: flatData.non_structural_rating.railings.photos || []
                  },
                  water_tanks: {
                    rating: parseInt(flatData.non_structural_rating.water_tanks.rating),
                    condition_comment: flatData.non_structural_rating.water_tanks.condition_comment || '',
                    photos: flatData.non_structural_rating.water_tanks.photos || []
                  },
                  plumbing: {
                    rating: parseInt(flatData.non_structural_rating.plumbing.rating),
                    condition_comment: flatData.non_structural_rating.plumbing.condition_comment || '',
                    photos: flatData.non_structural_rating.plumbing.photos || []
                  },
                  sewage_system: {
                    rating: parseInt(flatData.non_structural_rating.sewage_system.rating),
                    condition_comment: flatData.non_structural_rating.sewage_system.condition_comment || '',
                    photos: flatData.non_structural_rating.sewage_system.photos || []
                  },
                  panel_board: {
                    rating: parseInt(flatData.non_structural_rating.panel_board.rating),
                    condition_comment: flatData.non_structural_rating.panel_board.condition_comment || '',
                    photos: flatData.non_structural_rating.panel_board.photos || []
                  },
                  lifts: {
                    rating: parseInt(flatData.non_structural_rating.lifts.rating),
                    condition_comment: flatData.non_structural_rating.lifts.condition_comment || '',
                    photos: flatData.non_structural_rating.lifts.photos || []
                  }
                };
              }
            }
          });
        }
      });
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      const progress = this.checkScreenCompletion(structure);
      
      // Calculate overall ratings summary
      const overallRatings = this.calculateOverallRatings(structure);
      
      sendSuccessResponse(res, 'Ratings screen data saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        screen: 'ratings',
        data: {
          floors_processed: floors.length,
          total_flats_rated: floors.reduce((sum, floor) => sum + (floor.flats ? floor.flats.length : 0), 0),
          overall_ratings: overallRatings
        },
        progress
      });

    } catch (error) {
      console.error('❌ Ratings screen save error:', error);
      sendErrorResponse(res, 'Failed to save ratings screen data', 500, error.message);
    }
  }

  async getRatingsScreen(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      if (!structure.geometric_details?.floors) {
        return sendErrorResponse(res, 'No floors found. Complete geometric screen first.', 400);
      }

      // Return all floors with their flats and current ratings
      const floorsData = structure.geometric_details.floors.map(floor => ({
        floor_number: floor.floor_number,
        floor_type: floor.floor_type,
        floor_label_name: floor.floor_label_name,
        flats: floor.flats.map(flat => ({
          flat_number: flat.flat_number,
          flat_type: flat.flat_type,
          area_sq_mts: flat.area_sq_mts,
          direction_facing: flat.direction_facing,
          occupancy_status: flat.occupancy_status,
          structural_rating: flat.structural_rating || {
            beams: { rating: null, condition_comment: '', photos: [] },
            columns: { rating: null, condition_comment: '', photos: [] },
            slab: { rating: null, condition_comment: '', photos: [] },
            foundation: { rating: null, condition_comment: '', photos: [] }
          },
          non_structural_rating: flat.non_structural_rating || {
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
          }
        }))
      }));
      
      // Calculate overall ratings if data exists
      const overallRatings = this.calculateOverallRatings(structure);
      
      sendSuccessResponse(res, 'Ratings screen data retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        screen: 'ratings',
        data: {
          floors: floorsData,
          overall_ratings: overallRatings,
          total_floors: floorsData.length,
          total_flats: floorsData.reduce((sum, floor) => sum + floor.flats.length, 0)
        }
      });

    } catch (error) {
      console.error('❌ Ratings screen get error:', error);
      sendErrorResponse(res, 'Failed to get ratings screen data', 500, error.message);
    }
  }


  async saveOverallStructuralScreen(req, res) {
  try {
    const { id } = req.params;
    const { beams_rating, columns_rating, slab_rating, foundation_rating } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Ensure geometric screen is completed first
    if (!structure.geometric_details?.floors || structure.geometric_details.floors.length === 0) {
      return sendErrorResponse(res, 'Please complete all previous screens first', 400);
    }
    
    // Update overall structural ratings
    structure.overall_structural_rating = {
      beams: {
        rating: parseInt(beams_rating.rating),
        condition_comment: beams_rating.condition_comment || '',
        inspection_date: new Date(),
        photos: beams_rating.photos || []
      },
      columns: {
        rating: parseInt(columns_rating.rating),
        condition_comment: columns_rating.condition_comment || '',
        inspection_date: new Date(),
        photos: columns_rating.photos || []
      },
      slab: {
        rating: parseInt(slab_rating.rating),
        condition_comment: slab_rating.condition_comment || '',
        inspection_date: new Date(),
        photos: slab_rating.photos || []
      },
      foundation: {
        rating: parseInt(foundation_rating.rating),
        condition_comment: foundation_rating.condition_comment || '',
        inspection_date: new Date(),
        photos: foundation_rating.photos || []
      }
    };
    
    // Calculate overall structural average
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
    
    const progress = this.checkScreenCompletion(structure);
    
    sendSuccessResponse(res, 'Overall structural ratings saved successfully', {
      structure_id: id,
      uid: structure.structural_identity.uid,
      screen: 'overall_structural',
      data: structure.overall_structural_rating,
      progress
    });

  } catch (error) {
    console.error('❌ Overall structural rating save error:', error);
    sendErrorResponse(res, 'Failed to save overall structural ratings', 500, error.message);
  }
}

/**
 * GET /api/structures/:id/overall-structural
 * Get Overall Structural Ratings
 */
async getOverallStructuralScreen(req, res) {
  try {
    const { id } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    const defaultRating = { rating: null, condition_comment: '', photos: [] };
    
    sendSuccessResponse(res, 'Overall structural ratings retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      screen: 'overall_structural',
      data: structure.overall_structural_rating || {
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
    console.error('❌ Overall structural rating get error:', error);
    sendErrorResponse(res, 'Failed to get overall structural ratings', 500, error.message);
  }
}


// Add these methods to your StructureController class

async updateOverallStructuralScreen(req, res) {
  return this.saveOverallStructuralScreen(req, res);
}

async updateOverallNonStructuralScreen(req, res) {
  return this.saveOverallNonStructuralScreen(req, res);
}
// =================== SCREEN 6: OVERALL NON-STRUCTURAL RATING ===================

/**
 * POST /api/structures/:id/overall-non-structural
 * Save Overall Non-Structural Ratings for entire structure
 */
async saveOverallNonStructuralScreen(req, res) {
  try {
    const { id } = req.params;
    const { 
      brick_plaster, doors_windows, flooring_tiles, electrical_wiring,
      sanitary_fittings, railings, water_tanks, plumbing,
      sewage_system, panel_board, lifts 
    } = req.body;
    
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    // Ensure previous screens are completed
    if (!structure.overall_structural_rating) {
      return sendErrorResponse(res, 'Please complete overall structural rating first', 400);
    }
    
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
    
    // Calculate overall non-structural average
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
    
    const progress = this.checkScreenCompletion(structure);
    
    sendSuccessResponse(res, 'Overall non-structural ratings saved successfully', {
      structure_id: id,
      uid: structure.structural_identity.uid,
      screen: 'overall_non_structural',
      data: structure.overall_non_structural_rating,
      progress
    });

  } catch (error) {
    console.error('❌ Overall non-structural rating save error:', error);
    sendErrorResponse(res, 'Failed to save overall non-structural ratings', 500, error.message);
  }
}

/**
 * GET /api/structures/:id/overall-non-structural
 * Get Overall Non-Structural Ratings
 */
async getOverallNonStructuralScreen(req, res) {
  try {
    const { id } = req.params;
    const { user, structure } = await this.findUserStructure(req.user.userId, id);
    
    const defaultRating = { rating: null, condition_comment: '', photos: [] };
    
    sendSuccessResponse(res, 'Overall non-structural ratings retrieved successfully', {
      structure_id: id,
      uid: structure.structural_identity?.uid,
      screen: 'overall_non_structural',
      data: structure.overall_non_structural_rating || {
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
    console.error('❌ Overall non-structural rating get error:', error);
    sendErrorResponse(res, 'Failed to get overall non-structural ratings', 500, error.message);
  }
}

// =================== UPDATED SCREEN COMPLETION CHECK ===================

checkScreenCompletion(structure) {
  const completion = {
    location: false,           // Screen 1: Structure Identification + GPS Location
    administrative: false,     // Screen 2: Admin Details
    geometric: false,          // Screen 3: Building Dimensions + Floors/Flats
    ratings: false,            // Screen 4: Flat-wise Ratings
    overall_structural: false, // Screen 5: Overall Structural Rating
    overall_non_structural: false, // Screen 6: Overall Non-Structural Rating
    overall: 0
  };

  // Screen 1: Location Check
  if (structure.structural_identity && 
      structure.structural_identity.zip_code &&
      structure.structural_identity.state_code &&
      structure.structural_identity.district_code &&
      structure.structural_identity.city_name &&
      structure.structural_identity.location_code &&
      structure.structural_identity.structure_number &&
      structure.structural_identity.type_of_structure &&
      structure.location && 
      structure.location.coordinates &&
      structure.location.coordinates.latitude &&
      structure.location.coordinates.longitude) {
    completion.location = true;
  }

  // Screen 2: Administrative Check
  if (structure.administration &&
      structure.administration.client_name &&
      structure.administration.custodian &&
      structure.administration.engineer_designation &&
      structure.administration.contact_details &&
      structure.administration.email_id) {
    completion.administrative = true;
  }

  // Screen 3: Geometric Check
  if (structure.geometric_details &&
      structure.geometric_details.number_of_floors &&
      structure.geometric_details.structure_width &&
      structure.geometric_details.structure_length &&
      structure.geometric_details.structure_height &&
      structure.geometric_details.floors &&
      structure.geometric_details.floors.length > 0) {
    
    const allFloorsHaveFlats = structure.geometric_details.floors.every(floor => 
      floor.flats && floor.flats.length > 0
    );
    
    if (allFloorsHaveFlats) {
      completion.geometric = true;
    }
  }

  // Screen 4: Flat-wise Ratings Check
  if (structure.geometric_details && 
      structure.geometric_details.floors && 
      structure.geometric_details.floors.length > 0) {
    
    let allFlatsHaveRatings = true;
    
    for (const floor of structure.geometric_details.floors) {
      if (!floor.flats || floor.flats.length === 0) {
        allFlatsHaveRatings = false;
        break;
      }
      
      for (const flat of floor.flats) {
        const hasStructuralRatings = flat.structural_rating &&
          flat.structural_rating.beams && flat.structural_rating.beams.rating &&
          flat.structural_rating.columns && flat.structural_rating.columns.rating &&
          flat.structural_rating.slab && flat.structural_rating.slab.rating &&
          flat.structural_rating.foundation && flat.structural_rating.foundation.rating;
        
        const hasNonStructuralRatings = flat.non_structural_rating &&
          flat.non_structural_rating.brick_plaster && flat.non_structural_rating.brick_plaster.rating &&
          flat.non_structural_rating.doors_windows && flat.non_structural_rating.doors_windows.rating &&
          flat.non_structural_rating.flooring_tiles && flat.non_structural_rating.flooring_tiles.rating &&
          flat.non_structural_rating.electrical_wiring && flat.non_structural_rating.electrical_wiring.rating &&
          flat.non_structural_rating.sanitary_fittings && flat.non_structural_rating.sanitary_fittings.rating &&
          flat.non_structural_rating.railings && flat.non_structural_rating.railings.rating &&
          flat.non_structural_rating.water_tanks && flat.non_structural_rating.water_tanks.rating &&
          flat.non_structural_rating.plumbing && flat.non_structural_rating.plumbing.rating &&
          flat.non_structural_rating.sewage_system && flat.non_structural_rating.sewage_system.rating &&
          flat.non_structural_rating.panel_board && flat.non_structural_rating.panel_board.rating &&
          flat.non_structural_rating.lifts && flat.non_structural_rating.lifts.rating;
        
        if (!hasStructuralRatings || !hasNonStructuralRatings) {
          allFlatsHaveRatings = false;
          break;
        }
      }
      
      if (!allFlatsHaveRatings) break;
    }
    
    completion.ratings = allFlatsHaveRatings;
  }

  // Screen 5: Overall Structural Rating Check
  if (structure.overall_structural_rating &&
      structure.overall_structural_rating.beams && structure.overall_structural_rating.beams.rating &&
      structure.overall_structural_rating.columns && structure.overall_structural_rating.columns.rating &&
      structure.overall_structural_rating.slab && structure.overall_structural_rating.slab.rating &&
      structure.overall_structural_rating.foundation && structure.overall_structural_rating.foundation.rating) {
    completion.overall_structural = true;
  }

  // Screen 6: Overall Non-Structural Rating Check
  if (structure.overall_non_structural_rating &&
      structure.overall_non_structural_rating.brick_plaster && structure.overall_non_structural_rating.brick_plaster.rating &&
      structure.overall_non_structural_rating.doors_windows && structure.overall_non_structural_rating.doors_windows.rating &&
      structure.overall_non_structural_rating.flooring_tiles && structure.overall_non_structural_rating.flooring_tiles.rating &&
      structure.overall_non_structural_rating.electrical_wiring && structure.overall_non_structural_rating.electrical_wiring.rating &&
      structure.overall_non_structural_rating.sanitary_fittings && structure.overall_non_structural_rating.sanitary_fittings.rating &&
      structure.overall_non_structural_rating.railings && structure.overall_non_structural_rating.railings.rating &&
      structure.overall_non_structural_rating.water_tanks && structure.overall_non_structural_rating.water_tanks.rating &&
      structure.overall_non_structural_rating.plumbing && structure.overall_non_structural_rating.plumbing.rating &&
      structure.overall_non_structural_rating.sewage_system && structure.overall_non_structural_rating.sewage_system.rating &&
      structure.overall_non_structural_rating.panel_board && structure.overall_non_structural_rating.panel_board.rating &&
      structure.overall_non_structural_rating.lifts && structure.overall_non_structural_rating.lifts.rating) {
    completion.overall_non_structural = true;
  }

  // Calculate overall completion percentage (now 6 screens instead of 4)
  const completedScreens = Object.values(completion).filter(value => value === true).length;
  completion.overall = Math.round((completedScreens / 6) * 100);

  return completion;
}

  async updateRatingsScreen(req, res) {
    return this.saveRatingsScreen(req, res);
  }

  // =================== STRUCTURE MANAGEMENT ===================

  async getStructureProgress(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const progress = this.checkScreenCompletion(structure);
      
      // Calculate detailed progress info
      const totalFlats = structure.geometric_details?.floors ? 
        structure.geometric_details.floors.reduce((sum, floor) => sum + (floor.flats ? floor.flats.length : 0), 0) : 0;
      
      let ratedFlats = 0;
      if (structure.geometric_details?.floors) {
        structure.geometric_details.floors.forEach(floor => {
          floor.flats?.forEach(flat => {
            const hasStructuralRatings = flat.structural_rating?.beams?.rating && 
              flat.structural_rating?.columns?.rating && 
              flat.structural_rating?.slab?.rating && 
              flat.structural_rating?.foundation?.rating;
            
            const hasNonStructuralRatings = flat.non_structural_rating?.brick_plaster?.rating &&
              flat.non_structural_rating?.doors_windows?.rating &&
              flat.non_structural_rating?.flooring_tiles?.rating &&
              flat.non_structural_rating?.electrical_wiring?.rating &&
              flat.non_structural_rating?.sanitary_fittings?.rating &&
              flat.non_structural_rating?.railings?.rating &&
              flat.non_structural_rating?.water_tanks?.rating &&
              flat.non_structural_rating?.plumbing?.rating &&
              flat.non_structural_rating?.sewage_system?.rating &&
              flat.non_structural_rating?.panel_board?.rating &&
              flat.non_structural_rating?.lifts?.rating;
            
            if (hasStructuralRatings && hasNonStructuralRatings) {
              ratedFlats++;
            }
          });
        });
      }
      
      sendSuccessResponse(res, 'Structure progress retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        status: structure.status,
        progress,
        can_submit: progress.overall === 100,
        screens: {
          location: progress.location,
          administrative: progress.administrative,
          geometric: progress.geometric,
          ratings: progress.ratings
        },
        details: {
          total_floors: structure.geometric_details?.floors?.length || 0,
          total_flats: totalFlats,
          rated_flats: ratedFlats,
          pending_flats: totalFlats - ratedFlats
        }
      });

    } catch (error) {
      console.error('❌ Structure progress error:', error);
      sendErrorResponse(res, 'Failed to get structure progress', 500, error.message);
    }
  }

  async submitStructure(req, res) {
    try {
      const { id } = req.params;
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      const progress = this.checkScreenCompletion(structure);
      
      if (progress.overall < 100) {
        return sendErrorResponse(res, 'Cannot submit incomplete structure. Please complete all screens and rate all flats.', 400);
      }
      
      structure.status = 'submitted';
      structure.creation_info.last_updated_date = new Date();
      
      await user.save();
      
      sendSuccessResponse(res, 'Structure submitted successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        structural_identity_number: structure.structural_identity?.structural_identity_number,
        status: structure.status,
        submitted_at: structure.creation_info.last_updated_date,
        overall_ratings: this.calculateOverallRatings(structure)
      });

    } catch (error) {
      console.error('❌ Structure submission error:', error);
      sendErrorResponse(res, 'Failed to submit structure', 500, error.message);
    }
  }

  // =================== STRUCTURE NUMBER UTILITIES ===================

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

  // =================== UTILITY: CALCULATE OVERALL RATINGS ===================
  
  calculateOverallRatings(structure) {
    if (!structure.geometric_details?.floors || structure.geometric_details.floors.length === 0) {
      return null;
    }

    const allRatings = {
      structural: { beams: [], columns: [], slab: [], foundation: [] },
      nonStructural: {
        brick_plaster: [], doors_windows: [], flooring_tiles: [], electrical_wiring: [],
        sanitary_fittings: [], railings: [], water_tanks: [], plumbing: [],
        sewage_system: [], panel_board: [], lifts: []
      }
    };

    // Collect all ratings from all flats
    structure.geometric_details.floors.forEach(floor => {
      if (floor.flats && floor.flats.length > 0) {
        floor.flats.forEach(flat => {
          // Structural ratings
          if (flat.structural_rating) {
            Object.keys(allRatings.structural).forEach(component => {
              if (flat.structural_rating[component]?.rating) {
                allRatings.structural[component].push(flat.structural_rating[component].rating);
              }
            });
          }

          // Non-structural ratings
          if (flat.non_structural_rating) {
            Object.keys(allRatings.nonStructural).forEach(component => {
              if (flat.non_structural_rating[component]?.rating) {
                allRatings.nonStructural[component].push(flat.non_structural_rating[component].rating);
              }
            });
          }
        });
      }
    });

    // Calculate averages
    const overallRating = { structural: {}, nonStructural: {} };
    let structuralTotal = 0, structuralCount = 0;
    let nonStructuralTotal = 0, nonStructuralCount = 0;

    // Structural averages
    Object.entries(allRatings.structural).forEach(([component, ratings]) => {
      if (ratings.length > 0) {
        const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        overallRating.structural[component] = Math.round(average * 10) / 10;
        structuralTotal += average;
        structuralCount++;
      }
    });

    // Non-structural averages
    Object.entries(allRatings.nonStructural).forEach(([component, ratings]) => {
      if (ratings.length > 0) {
        const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        overallRating.nonStructural[component] = Math.round(average * 10) / 10;
        nonStructuralTotal += average;
        nonStructuralCount++;
      }
    });

    // Overall averages
    overallRating.structural.overall = structuralCount > 0 ? 
      Math.round((structuralTotal / structuralCount) * 10) / 10 : 0;
    overallRating.nonStructural.overall = nonStructuralCount > 0 ? 
      Math.round((nonStructuralTotal / nonStructuralCount) * 10) / 10 : 0;

    // Health status based on structural rating
    const structuralAvg = overallRating.structural.overall;
    if (structuralAvg >= 4) {
      overallRating.healthStatus = 'Good';
      overallRating.priority = 'Low';
    } else if (structuralAvg >= 3) {
      overallRating.healthStatus = 'Fair';
      overallRating.priority = 'Medium';
    } else if (structuralAvg >= 2) {
      overallRating.healthStatus = 'Poor';
      overallRating.priority = 'High';
    } else {
      overallRating.healthStatus = 'Critical';
      overallRating.priority = 'Critical';
    }

    return overallRating;
  }

  // ... Keep all existing methods for backward compatibility
  // (Previous implementation preserved - getStructures, getStructureById, etc.)

  async getStructures(req, res) {
    // ... (keep existing implementation)
  }

  async getStructuresByUserId(req, res) {
    // ... (keep existing implementation)  
  }

  async getStructureById(req, res) {
    // ... (keep existing implementation)
  }

  async getStructureByUID(req, res) {
    // ... (keep existing implementation)
  }

  async getStructureFloors(req, res) {
    // ... (keep existing implementation)
  }

  async getFloorFlats(req, res) {
    // ... (keep existing implementation)
  }

  async deleteStructure(req, res) {
    // ... (keep existing implementation)
  }

  async getStructureStats(req, res) {
    // ... (keep existing implementation)
  }

  async getStructuresRequiringInspection(req, res) {
    // ... (keep existing implementation)
  }

  async getMaintenanceRecommendations(req, res) {
    // ... (keep existing implementation)
  }

  getStructuralRecommendation(component, rating) {
    // ... (keep existing implementation)
  }

  getNonStructuralRecommendation(component, rating) {
    // ... (keep existing implementation)
  }
}



module.exports = new StructureController();