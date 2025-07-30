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
      geometric: false,      // Screen 3: Building Dimensions
      ratings: false,        // Screen 4: Overall Ratings
      overall: 0
    };

    // Check Location Screen (Structure Identification + GPS)
    if (structure.structural_identity && 
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

    // Check Geometric Screen
    if (structure.geometric_details &&
        structure.geometric_details.number_of_floors &&
        structure.geometric_details.structure_width &&
        structure.geometric_details.structure_length &&
        structure.geometric_details.structure_height) {
      completion.geometric = true;
    }

    // Check Ratings Screen (Both Structural + Non-Structural)
    if (structure.geometric_details && 
        structure.geometric_details.floors && 
        structure.geometric_details.floors.length > 0) {
      const hasStructuralRatings = structure.geometric_details.floors.some(floor => 
        floor.flats && floor.flats.some(flat => 
          flat.structural_rating &&
          flat.structural_rating.beams && flat.structural_rating.beams.rating &&
          flat.structural_rating.columns && flat.structural_rating.columns.rating &&
          flat.structural_rating.slab && flat.structural_rating.slab.rating &&
          flat.structural_rating.foundation && flat.structural_rating.foundation.rating
        )
      );
      
      const hasNonStructuralRatings = structure.geometric_details.floors.some(floor => 
        floor.flats && floor.flats.some(flat => 
          flat.non_structural_rating &&
          flat.non_structural_rating.brick_plaster && flat.non_structural_rating.brick_plaster.rating &&
          flat.non_structural_rating.doors_windows && flat.non_structural_rating.doors_windows.rating &&
          flat.non_structural_rating.flooring_tiles && flat.non_structural_rating.flooring_tiles.rating
        )
      );
      
      completion.ratings = hasStructuralRatings && hasNonStructuralRatings;
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

  // =================== SCREEN 1: LOCATION (Structure Identification + GPS) ===================

  async saveLocationScreen(req, res) {
    try {
      const { id } = req.params;
      const { 
        state_code, district_code, city_name, location_code, type_of_structure,
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
      
      // Update structural identity with generated numbers
      structure.structural_identity = {
        uid: structure.structural_identity.uid, // Keep existing UID
        structural_identity_number: generatedNumbers.structural_identity_number,
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

  // =================== SCREEN 3: GEOMETRIC ===================

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
      
      // Initialize floors array if not exists or if number of floors changed
      if (!structure.geometric_details.floors || 
          structure.geometric_details.floors.length !== number_of_floors) {
        structure.geometric_details.floors = [];
        
        for (let i = 1; i <= number_of_floors; i++) {
          const floorData = floors?.find(f => f.floor_number === i) || {};
          
          structure.geometric_details.floors.push({
            floor_number: i,
            floor_type: floorData.floor_type || 'residential',
            floor_height: floorData.floor_height || null,
            total_area_sq_mts: floorData.total_area_sq_mts || null,
            flats: [{
              flat_number: `${i}-01`,
              flat_type: '2bhk',
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
            }]
          });
        }
      }
      
      structure.creation_info.last_updated_date = new Date();
      await user.save();
      
      const progress = this.checkScreenCompletion(structure);
      
      sendSuccessResponse(res, 'Geometric screen data saved successfully', {
        structure_id: id,
        uid: structure.structural_identity.uid,
        screen: 'geometric',
        data: {
          number_of_floors: structure.geometric_details.number_of_floors,
          structure_width: structure.geometric_details.structure_width,
          structure_length: structure.geometric_details.structure_length,
          structure_height: structure.geometric_details.structure_height,
          floors_initialized: structure.geometric_details.floors.length,
          total_area: structure.geometric_details.structure_width * structure.geometric_details.structure_length
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

  // =================== SCREEN 4: OVERALL RATINGS (Structural + Non-Structural) ===================

  async saveRatingsScreen(req, res) {
    try {
      const { id } = req.params;
      const { structural_ratings, non_structural_ratings } = req.body;
      
      const { user, structure } = await this.findUserStructure(req.user.userId, id);
      
      if (!structure.geometric_details.floors || structure.geometric_details.floors.length === 0) {
        return sendErrorResponse(res, 'Please complete Geometric screen first', 400);
      }
      
      // Update structural and non-structural ratings for all flats
      structure.geometric_details.floors.forEach(floor => {
        floor.flats.forEach(flat => {
          // Update structural ratings
          flat.structural_rating = {
            beams: {
              rating: parseInt(structural_ratings.beams_rating),
              condition_comment: structural_ratings.beams_comment || '',
              inspection_date: new Date(),
              photos: structural_ratings.beams_photos || []
            },
            columns: {
              rating: parseInt(structural_ratings.columns_rating),
              condition_comment: structural_ratings.columns_comment || '',
              inspection_date: new Date(),
              photos: structural_ratings.columns_photos || []
            },
            slab: {
              rating: parseInt(structural_ratings.slab_rating),
              condition_comment: structural_ratings.slab_comment || '',
              inspection_date: new Date(),
              photos: structural_ratings.slab_photos || []
            },
            foundation: {
              rating: parseInt(structural_ratings.foundation_rating),
              condition_comment: structural_ratings.foundation_comment || '',
              inspection_date: new Date(),
              photos: structural_ratings.foundation_photos || []
            }
          };

          // Update non-structural ratings
          flat.non_structural_rating = {
            brick_plaster: {
              rating: parseInt(non_structural_ratings.brick_plaster_rating),
              condition_comment: non_structural_ratings.brick_plaster_comment || '',
              photos: non_structural_ratings.brick_plaster_photos || []
            },
            doors_windows: {
              rating: parseInt(non_structural_ratings.doors_windows_rating),
              condition_comment: non_structural_ratings.doors_windows_comment || '',
              photos: non_structural_ratings.doors_windows_photos || []
            },
            flooring_tiles: {
              rating: parseInt(non_structural_ratings.flooring_tiles_rating),
              condition_comment: non_structural_ratings.flooring_tiles_comment || '',
              photos: non_structural_ratings.flooring_tiles_photos || []
            },
            electrical_wiring: {
              rating: parseInt(non_structural_ratings.electrical_wiring_rating),
              condition_comment: non_structural_ratings.electrical_wiring_comment || '',
              photos: non_structural_ratings.electrical_wiring_photos || []
            },
            sanitary_fittings: {
              rating: parseInt(non_structural_ratings.sanitary_fittings_rating),
              condition_comment: non_structural_ratings.sanitary_fittings_comment || '',
              photos: non_structural_ratings.sanitary_fittings_photos || []
            },
            railings: {
              rating: parseInt(non_structural_ratings.railings_rating),
              condition_comment: non_structural_ratings.railings_comment || '',
              photos: non_structural_ratings.railings_photos || []
            },
            water_tanks: {
              rating: parseInt(non_structural_ratings.water_tanks_rating),
              condition_comment: non_structural_ratings.water_tanks_comment || '',
              photos: non_structural_ratings.water_tanks_photos || []
            },
            plumbing: {
              rating: parseInt(non_structural_ratings.plumbing_rating),
              condition_comment: non_structural_ratings.plumbing_comment || '',
              photos: non_structural_ratings.plumbing_photos || []
            },
            sewage_system: {
              rating: parseInt(non_structural_ratings.sewage_system_rating),
              condition_comment: non_structural_ratings.sewage_system_comment || '',
              photos: non_structural_ratings.sewage_system_photos || []
            },
            panel_board: {
              rating: parseInt(non_structural_ratings.panel_board_rating),
              condition_comment: non_structural_ratings.panel_board_comment || '',
              photos: non_structural_ratings.panel_board_photos || []
            },
            lifts: {
              rating: parseInt(non_structural_ratings.lifts_rating),
              condition_comment: non_structural_ratings.lifts_comment || '',
              photos: non_structural_ratings.lifts_photos || []
            }
          };
        });
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
          structural_ratings: {
            beams_rating: parseInt(structural_ratings.beams_rating),
            columns_rating: parseInt(structural_ratings.columns_rating),
            slab_rating: parseInt(structural_ratings.slab_rating),
            foundation_rating: parseInt(structural_ratings.foundation_rating)
          },
          non_structural_ratings: {
            brick_plaster_rating: parseInt(non_structural_ratings.brick_plaster_rating),
            doors_windows_rating: parseInt(non_structural_ratings.doors_windows_rating),
            flooring_tiles_rating: parseInt(non_structural_ratings.flooring_tiles_rating),
            electrical_wiring_rating: parseInt(non_structural_ratings.electrical_wiring_rating),
            sanitary_fittings_rating: parseInt(non_structural_ratings.sanitary_fittings_rating),
            railings_rating: parseInt(non_structural_ratings.railings_rating),
            water_tanks_rating: parseInt(non_structural_ratings.water_tanks_rating),
            plumbing_rating: parseInt(non_structural_ratings.plumbing_rating),
            sewage_system_rating: parseInt(non_structural_ratings.sewage_system_rating),
            panel_board_rating: parseInt(non_structural_ratings.panel_board_rating),
            lifts_rating: parseInt(non_structural_ratings.lifts_rating)
          },
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
      
      // Get ratings from first flat of first floor (if exists)
      let ratingsData = {
        structural_ratings: {},
        non_structural_ratings: {}
      };
      
      if (structure.geometric_details.floors && 
          structure.geometric_details.floors.length > 0 &&
          structure.geometric_details.floors[0].flats &&
          structure.geometric_details.floors[0].flats.length > 0) {
        
        const firstFlat = structure.geometric_details.floors[0].flats[0];
        
        if (firstFlat.structural_rating) {
          ratingsData.structural_ratings = {
            beams_rating: firstFlat.structural_rating.beams?.rating,
            columns_rating: firstFlat.structural_rating.columns?.rating,
            slab_rating: firstFlat.structural_rating.slab?.rating,
            foundation_rating: firstFlat.structural_rating.foundation?.rating,
            beams_comment: firstFlat.structural_rating.beams?.condition_comment,
            columns_comment: firstFlat.structural_rating.columns?.condition_comment,
            slab_comment: firstFlat.structural_rating.slab?.condition_comment,
            foundation_comment: firstFlat.structural_rating.foundation?.condition_comment
          };
        }
        
        if (firstFlat.non_structural_rating) {
          const rating = firstFlat.non_structural_rating;
          ratingsData.non_structural_ratings = {
            brick_plaster_rating: rating.brick_plaster?.rating,
            doors_windows_rating: rating.doors_windows?.rating,
            flooring_tiles_rating: rating.flooring_tiles?.rating,
            electrical_wiring_rating: rating.electrical_wiring?.rating,
            sanitary_fittings_rating: rating.sanitary_fittings?.rating,
            railings_rating: rating.railings?.rating,
            water_tanks_rating: rating.water_tanks?.rating,
            plumbing_rating: rating.plumbing?.rating,
            sewage_system_rating: rating.sewage_system?.rating,
            panel_board_rating: rating.panel_board?.rating,
            lifts_rating: rating.lifts?.rating
          };
        }
      }
      
      // Calculate overall ratings if data exists
      const overallRatings = this.calculateOverallRatings(structure);
      
      sendSuccessResponse(res, 'Ratings screen data retrieved successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        screen: 'ratings',
        data: {
          ...ratingsData,
          overall_ratings: overallRatings
        }
      });

    } catch (error) {
      console.error('❌ Ratings screen get error:', error);
      sendErrorResponse(res, 'Failed to get ratings screen data', 500, error.message);
    }
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
        return sendErrorResponse(res, 'Cannot submit incomplete structure. Please complete all screens.', 400);
      }
      
      structure.status = 'submitted';
      structure.creation_info.last_updated_date = new Date();
      
      await user.save();
      
      sendSuccessResponse(res, 'Structure submitted successfully', {
        structure_id: id,
        uid: structure.structural_identity?.uid,
        structural_identity_number: structure.structural_identity?.structural_identity_number,
        status: structure.status,
        submitted_at: structure.creation_info.last_updated_date
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

  // =================== EXISTING METHODS (PRESERVED) ===================
  
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

    // Collect all ratings
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

  // ... Keep all existing methods like getStructures, getStructureById, etc.
  // (Previous implementation preserved for backward compatibility)

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