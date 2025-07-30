const { User } = require('../models/schemas');
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
    // Bind all methods to maintain 'this' context
    this.validateRatingImages = this.validateRatingImages.bind(this);
    this.calculateOverallRatings = this.calculateOverallRatings.bind(this);
    this.createStructure = this.createStructure.bind(this);
    this.getStructures = this.getStructures.bind(this);
    this.getStructuresByUserId = this.getStructuresByUserId.bind(this);
    this.getStructureById = this.getStructureById.bind(this);
    this.getStructureByUID = this.getStructureByUID.bind(this);
    this.getStructureFloors = this.getStructureFloors.bind(this);
    this.getFloorFlats = this.getFloorFlats.bind(this);
    this.updateStructure = this.updateStructure.bind(this);
    this.deleteStructure = this.deleteStructure.bind(this);
    this.getStructureStats = this.getStructureStats.bind(this);
    this.getStructuresRequiringInspection = this.getStructuresRequiringInspection.bind(this);
    this.getMaintenanceRecommendations = this.getMaintenanceRecommendations.bind(this);
  }
  
  // Helper function to validate images based on ratings
  validateRatingImages(structureData) {
    const errors = [];
    
    if (structureData.geometric_details?.floors) {
      structureData.geometric_details.floors.forEach((floor, floorIndex) => {
        if (floor.flats) {
          floor.flats.forEach((flat, flatIndex) => {
            // Check structural ratings
            if (flat.structural_rating) {
              ['beams', 'columns', 'slab', 'foundation'].forEach(component => {
                const rating = flat.structural_rating[component];
                if (rating && rating.rating < 3) {
                  if (!rating.photos || rating.photos.length === 0) {
                    errors.push({
                      field: `geometric_details.floors[${floorIndex}].flats[${flatIndex}].structural_rating.${component}.photos`,
                      message: `Photos are required for ${component} rating below 3 (Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1})`,
                      rating: rating.rating
                    });
                  }
                }
              });
            }
            
            // Check non-structural ratings
            if (flat.non_structural_rating) {
              ['brick_plaster', 'doors_windows', 'flooring_tiles', 'electrical_wiring', 
               'sanitary_fittings', 'railings', 'water_tanks', 'plumbing', 
               'sewage_system', 'panel_board', 'lifts'].forEach(component => {
                const rating = flat.non_structural_rating[component];
                if (rating && rating.rating < 3) {
                  if (!rating.photos || rating.photos.length === 0) {
                    errors.push({
                      field: `geometric_details.floors[${floorIndex}].flats[${flatIndex}].non_structural_rating.${component}.photos`,
                      message: `Photos are required for ${component.replace('_', ' ')} rating below 3 (Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1})`,
                      rating: rating.rating
                    });
                  }
                }
              });
            }
          });
        }
      });
    }
    
    return errors;
  }

  // Helper function to calculate overall ratings
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

  async createStructure(req, res) {
    try {
      console.log('📝 Creating new structure...');
      console.log('👤 User:', req.user.userId);
      console.log('📋 Data received - Floors:', req.body.geometric_details?.floors?.length || 0);

      // Validate rating-based image requirements
      const imageValidationErrors = this.validateRatingImages(req.body);
      if (imageValidationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Image validation failed for low ratings',
          errors: imageValidationErrors
        });
      }

      // Generate unique UID for the structure
      const generateUID = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `STR_${timestamp}_${random}`.toUpperCase();
      };

      // Ensure structural_identity has UID
      if (!req.body.structural_identity?.uid) {
        req.body.structural_identity = {
          ...req.body.structural_identity,
          uid: generateUID()
        };
      }

      // Validate and process multiple floors data
      if (req.body.geometric_details?.floors) {
        console.log('📊 Processing multiple floors:');
        req.body.geometric_details.floors.forEach((floor, index) => {
          console.log(`├─ Floor ${floor.floor_number}: ${floor.flats?.length || 0} flats`);
          
          // Ensure each flat has proper structure
          if (floor.flats) {
            floor.flats.forEach((flat, flatIndex) => {
              // Add inspection date if missing for structural ratings
              if (flat.structural_rating) {
                ['beams', 'columns', 'slab', 'foundation'].forEach(component => {
                  if (flat.structural_rating[component] && !flat.structural_rating[component].inspection_date) {
                    flat.structural_rating[component].inspection_date = new Date();
                  }
                });
              }

              // Ensure flat has a number if not provided
              if (!flat.flat_number) {
                flat.flat_number = `${floor.floor_number}-${String(flatIndex + 1).padStart(2, '0')}`;
              }
            });
          }
        });
      }

      // Set creation info
      const structureData = {
        ...req.body,
        creation_info: {
          created_date: new Date()
        },
        status: req.body.status || 'draft'
      };

      // Find user and add structure to their structures array
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check for duplicate UIDs within user's structures
      const existingStructure = user.structures.find(
        s => s.structural_identity.uid === structureData.structural_identity.uid
      );

      if (existingStructure) {
        return res.status(400).json({
          success: false,
          message: 'Structure with this UID already exists for this user'
        });
      }

      // Add structure to user's structures array
      user.structures.push(structureData);
      await user.save();

      // Get the newly created structure
      const newStructure = user.structures[user.structures.length - 1];
      
      // Calculate overall ratings
      const overallRatings = this.calculateOverallRatings(newStructure);
      
      console.log('✅ Structure created with UID:', newStructure.structural_identity.uid);
      console.log('📊 Total floors processed:', newStructure.geometric_details.floors.length);
      console.log('🏥 Health status:', overallRatings?.healthStatus || 'Unknown');
      
      res.status(201).json({
        success: true,
        message: 'Structure created successfully',
        data: {
          _id: newStructure._id,
          ...newStructure.toObject(),
          creation_info: {
            ...newStructure.creation_info,
            created_by: {
              _id: user._id,
              username: user.username,
              email: user.email,
              role: user.role
            }
          },
          overall_ratings: overallRatings
        }
      });
    } catch (error) {
      console.error('❌ Structure creation error:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create structure',
        error: error.message
      });
    }
  }

  async getStructures(req, res) {
    try {
      const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
      const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
      const skip = (page - 1) * limit;
      
      // Build aggregation pipeline
      const matchStage = {};
      
      // If user is not admin, only show their structures
      if (req.user.role !== 'admin') {
        matchStage._id = req.user.userId;
      }
      
      // Build structure filters
      const structureMatch = {};
      if (req.query.state_code) structureMatch['structures.structural_identity.state_code'] = req.query.state_code;
      if (req.query.district_code) structureMatch['structures.structural_identity.district_code'] = req.query.district_code;
      if (req.query.city_name) structureMatch['structures.structural_identity.city_name'] = new RegExp(req.query.city_name, 'i');
      if (req.query.type_of_structure) structureMatch['structures.structural_identity.type_of_structure'] = req.query.type_of_structure;
      if (req.query.status) structureMatch['structures.status'] = req.query.status;

      const pipeline = [
        { $match: matchStage },
        { $unwind: '$structures' }
      ];

      if (Object.keys(structureMatch).length > 0) {
        pipeline.push({ $match: structureMatch });
      }

      // Search functionality
      if (req.query.search) {
        pipeline.push({
          $match: {
            $or: [
              { 'structures.structural_identity.uid': { $regex: req.query.search, $options: 'i' } },
              { 'structures.administration.client_name': { $regex: req.query.search, $options: 'i' } },
              { 'structures.location.address': { $regex: req.query.search, $options: 'i' } }
            ]
          }
        });
      }

      pipeline.push(
        { $sort: { 'structures.createdAt': -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: '$structures._id',
            structural_identity: '$structures.structural_identity',
            location: '$structures.location',
            administration: '$structures.administration',
            geometric_details: '$structures.geometric_details',
            status: '$structures.status',
            creation_info: {
              created_date: '$structures.creation_info.created_date',
              last_updated_date: '$structures.creation_info.last_updated_date',
              created_by: {
                _id: '$_id',
                username: '$username',
                email: '$email',
                role: '$role'
              }
            },
            additional_photos: '$structures.additional_photos',
            documents: '$structures.documents',
            overall_condition_summary: '$structures.overall_condition_summary',
            createdAt: '$structures.createdAt',
            updatedAt: '$structures.updatedAt'
          }
        }
      );

      const structures = await User.aggregate(pipeline);
      
      // Add overall ratings to each structure
      const structuresWithRatings = structures.map(structure => ({
        ...structure,
        overall_ratings: this.calculateOverallRatings(structure)
      }));
      
      // Get total count
      const countPipeline = [
        { $match: matchStage },
        { $unwind: '$structures' }
      ];
      
      if (Object.keys(structureMatch).length > 0) {
        countPipeline.push({ $match: structureMatch });
      }
      
      if (req.query.search) {
        countPipeline.push({
          $match: {
            $or: [
              { 'structures.structural_identity.uid': { $regex: req.query.search, $options: 'i' } },
              { 'structures.administration.client_name': { $regex: req.query.search, $options: 'i' } },
              { 'structures.location.address': { $regex: req.query.search, $options: 'i' } }
            ]
          }
        });
      }
      
      countPipeline.push({ $count: 'total' });
      const totalResult = await User.aggregate(countPipeline);
      const total = totalResult[0]?.total || 0;
      
      sendPaginatedResponse(res, structuresWithRatings, page, limit, total, MESSAGES.DATA_RETRIEVED);
    } catch (error) {
      console.error('❌ Error fetching structures:', error);
      sendErrorResponse(res, 'Failed to fetch structures', 500, error.message);
    }
  }

  async getStructuresByUserId(req, res) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
      const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
      const skip = (page - 1) * limit;

      // Check permissions
      if (req.user.role !== 'admin' && req.user.userId.toString() !== userId) {
        return sendErrorResponse(res, 'Access denied', 403);
      }

      const user = await User.findById(userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      // Apply filters if provided
      let filteredStructures = user.structures;
      
      if (req.query.status) {
        filteredStructures = filteredStructures.filter(s => s.status === req.query.status);
      }
      
      if (req.query.type_of_structure) {
        filteredStructures = filteredStructures.filter(s => s.structural_identity.type_of_structure === req.query.type_of_structure);
      }

      // Apply search
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        filteredStructures = filteredStructures.filter(s => 
          searchRegex.test(s.structural_identity.uid) ||
          searchRegex.test(s.administration.client_name) ||
          searchRegex.test(s.location.address)
        );
      }

      const total = filteredStructures.length;
      const paginatedStructures = filteredStructures.slice(skip, skip + limit);

      // Add overall ratings and user info
      const structuresWithRatings = paginatedStructures.map(structure => ({
        ...structure.toObject(),
        creation_info: {
          ...structure.creation_info,
          created_by: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        },
        overall_ratings: this.calculateOverallRatings(structure)
      }));

      sendPaginatedResponse(res, structuresWithRatings, page, limit, total, MESSAGES.DATA_RETRIEVED);
    } catch (error) {
      console.error('❌ Error fetching structures by user ID:', error);
      sendErrorResponse(res, 'Failed to fetch structures', 500, error.message);
    }
  }

  async getStructureById(req, res) {
    try {
      const { id } = req.params;
      
      // Find user with the structure
      const user = await User.findOne({ 'structures._id': id });
      
      if (!user) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      const structure = user.structures.id(id);
      
      // Check permissions
      if (req.user.role !== 'admin' && user._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      // Calculate overall ratings
      const overallRatings = this.calculateOverallRatings(structure);
      
      const responseData = {
        ...structure.toObject(),
        creation_info: {
          ...structure.creation_info,
          created_by: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        },
        overall_ratings: overallRatings
      };
      
      sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, responseData);
    } catch (error) {
      console.error('❌ Error fetching structure by ID:', error);
      sendErrorResponse(res, 'Failed to fetch structure', 500, error.message);
    }
  }

  async getStructureByUID(req, res) {
    try {
      const { uid } = req.params;
      
      // Find user with the structure by UID
      const user = await User.findOne({ 'structures.structural_identity.uid': uid });
      
      if (!user) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      const structure = user.structures.find(s => s.structural_identity.uid === uid);
      
      // Check permissions
      if (req.user.role !== 'admin' && user._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      // Calculate overall ratings
      const overallRatings = this.calculateOverallRatings(structure);
      
      const responseData = {
        ...structure.toObject(),
        creation_info: {
          ...structure.creation_info,
          created_by: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        },
        overall_ratings: overallRatings
      };
      
      sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, responseData);
    } catch (error) {
      console.error('❌ Error fetching structure by UID:', error);
      sendErrorResponse(res, 'Failed to fetch structure', 500, error.message);
    }
  }

  async getStructureFloors(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findOne({ 'structures._id': id });
      
      if (!user) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      const structure = user.structures.id(id);
      
      // Check permissions
      if (req.user.role !== 'admin' && user._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      const floors = structure.geometric_details?.floors || [];
      
      sendSuccessResponse(res, 'Floors retrieved successfully', {
        structure_id: id,
        total_floors: floors.length,
        floors: floors
      });
    } catch (error) {
      console.error('❌ Error fetching structure floors:', error);
      sendErrorResponse(res, 'Failed to fetch floors', 500, error.message);
    }
  }

  async getFloorFlats(req, res) {
    try {
      const { id, floorNumber } = req.params;
      
      const user = await User.findOne({ 'structures._id': id });
      
      if (!user) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      const structure = user.structures.id(id);
      
      // Check permissions
      if (req.user.role !== 'admin' && user._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      const floor = structure.geometric_details?.floors?.find(f => f.floor_number == floorNumber);
      
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      const flats = floor.flats || [];
      
      sendSuccessResponse(res, 'Floor flats retrieved successfully', {
        structure_id: id,
        floor_number: floorNumber,
        total_flats: flats.length,
        flats: flats
      });
    } catch (error) {
      console.error('❌ Error fetching floor flats:', error);
      sendErrorResponse(res, 'Failed to fetch flats', 500, error.message);
    }
  }

  async updateStructure(req, res) {
    try {
      const { id } = req.params;
      
      // Validate rating-based image requirements
      const imageValidationErrors = this.validateRatingImages(req.body);
      if (imageValidationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Image validation failed for low ratings',
          errors: imageValidationErrors
        });
      }

      // Find user with the structure
      const user = await User.findOne({ 'structures._id': id });
      
      if (!user) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && user._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }

      const structure = user.structures.id(id);
      
      // Prevent updating the auto-generated UID
      const updateData = { ...req.body };
      if (updateData.structural_identity?.uid) {
        delete updateData.structural_identity.uid;
      }
      
      // Update last modified info
      updateData.creation_info = {
        ...structure.creation_info,
        last_updated_date: new Date()
      };
      
      // Update structure fields
      Object.keys(updateData).forEach(key => {
        structure[key] = updateData[key];
      });
      
      await user.save();
      
      // Calculate overall ratings for updated structure
      const overallRatings = this.calculateOverallRatings(structure);
      
      const responseData = {
        ...structure.toObject(),
        creation_info: {
          ...structure.creation_info,
          created_by: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        },
        overall_ratings: overallRatings
      };
      
      sendUpdatedResponse(res, responseData, 'Structure updated successfully');
    } catch (error) {
      console.error('❌ Error updating structure:', error);
      
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      sendErrorResponse(res, 'Failed to update structure', 500, error.message);
    }
  }

  async deleteStructure(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findOne({ 'structures._id': id });
      
      if (!user) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && user._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      // Remove structure from user's structures array
      user.structures.id(id).remove();
      await user.save();
      
      sendSuccessResponse(res, 'Structure deleted successfully', { deleted_id: id });
    } catch (error) {
      console.error('❌ Error deleting structure:', error);
      sendErrorResponse(res, 'Failed to delete structure', 500, error.message);
    }
  }

  async getStructureStats(req, res) {
    try {
      const matchCondition = req.user.role === 'admin' ? {} : { _id: req.user.userId };
      
      const stats = await User.aggregate([
        { $match: matchCondition },
        { $unwind: '$structures' },
        {
          $group: {
            _id: null,
            totalStructures: { $sum: 1 },
            draftStructures: { $sum: { $cond: [{ $eq: ['$structures.status', 'draft'] }, 1, 0] } },
            submittedStructures: { $sum: { $cond: [{ $eq: ['$structures.status', 'submitted'] }, 1, 0] } },
            approvedStructures: { $sum: { $cond: [{ $eq: ['$structures.status', 'approved'] }, 1, 0] } },
            inspectionRequiredStructures: { $sum: { $cond: [{ $eq: ['$structures.status', 'requires_inspection'] }, 1, 0] } },
            maintenanceNeededStructures: { $sum: { $cond: [{ $eq: ['$structures.status', 'maintenance_needed'] }, 1, 0] } },
            residentialStructures: { $sum: { $cond: [{ $eq: ['$structures.structural_identity.type_of_structure', 'residential'] }, 1, 0] } },
            commercialStructures: { $sum: { $cond: [{ $eq: ['$structures.structural_identity.type_of_structure', 'commercial'] }, 1, 0] } },
            educationalStructures: { $sum: { $cond: [{ $eq: ['$structures.structural_identity.type_of_structure', 'educational'] }, 1, 0] } },
            hospitalStructures: { $sum: { $cond: [{ $eq: ['$structures.structural_identity.type_of_structure', 'hospital'] }, 1, 0] } },
            industrialStructures: { $sum: { $cond: [{ $eq: ['$structures.structural_identity.type_of_structure', 'industrial'] }, 1, 0] } }
          }
        }
      ]);

      const result = stats[0] || {
        totalStructures: 0,
        draftStructures: 0,
        submittedStructures: 0,
        approvedStructures: 0,
        inspectionRequiredStructures: 0,
        maintenanceNeededStructures: 0,
        residentialStructures: 0,
        commercialStructures: 0,
        educationalStructures: 0,
        hospitalStructures: 0,
        industrialStructures: 0
      };

      sendSuccessResponse(res, 'Structure statistics retrieved successfully', {
        overview: {
          total: result.totalStructures,
          draft: result.draftStructures,
          submitted: result.submittedStructures,
          approved: result.approvedStructures,
          requiresInspection: result.inspectionRequiredStructures,
          maintenanceNeeded: result.maintenanceNeededStructures
        },
        byType: {
          residential: result.residentialStructures,
          commercial: result.commercialStructures,
          educational: result.educationalStructures,
          hospital: result.hospitalStructures,
          industrial: result.industrialStructures
        }
      });
    } catch (error) {
      console.error('❌ Error fetching structure stats:', error);
      sendErrorResponse(res, 'Failed to fetch structure statistics', 500, error.message);
    }
  }

  async getStructuresRequiringInspection(req, res) {
    try {
      const currentDate = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(currentDate.getMonth() + 1);

      const matchCondition = req.user.role === 'admin' ? {} : { _id: req.user.userId };

      const pipeline = [
        { $match: matchCondition },
        { $unwind: '$structures' },
        {
          $match: {
            $or: [
              { 'structures.status': 'requires_inspection' },
              { 'structures.status': 'maintenance_needed' }
            ]
          }
        },
        {
          $project: {
            _id: '$structures._id',
            structural_identity: '$structures.structural_identity',
            location: '$structures.location',
            administration: '$structures.administration',
            geometric_details: '$structures.geometric_details',
            status: '$structures.status',
            creation_info: {
              created_date: '$structures.creation_info.created_date',
              last_updated_date: '$structures.creation_info.last_updated_date',
              created_by: {
                _id: '$_id',
                username: '$username',
                email: '$email',
                role: '$role'
              }
            },
            createdAt: '$structures.createdAt',
            updatedAt: '$structures.updatedAt'
          }
        },
        { $sort: { 'creation_info.last_updated_date': -1 } }
      ];

      const structures = await User.aggregate(pipeline);

      // Add overall ratings to each structure
      const structuresWithRatings = structures.map(structure => {
        const overallRatings = this.calculateOverallRatings(structure);
        return {
          ...structure,
          overall_ratings: overallRatings,
          priority: overallRatings?.priority || 'Medium',
          healthStatus: overallRatings?.healthStatus || 'Unknown'
        };
      });

      // Sort by priority (Critical > High > Medium > Low)
      const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      structuresWithRatings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      sendSuccessResponse(res, 'Structures requiring inspection retrieved successfully', {
        total: structuresWithRatings.length,
        structures: structuresWithRatings
      });
    } catch (error) {
      console.error('❌ Error fetching structures requiring inspection:', error);
      sendErrorResponse(res, 'Failed to fetch structures requiring inspection', 500, error.message);
    }
  }

  async getMaintenanceRecommendations(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findOne({ 'structures._id': id });
      
      if (!user) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      const structure = user.structures.id(id);
      
      // Check permissions
      if (req.user.role !== 'admin' && user._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }

      const recommendations = [];

      if (!structure.geometric_details?.floors) {
        return sendSuccessResponse(res, 'Maintenance recommendations retrieved successfully', {
          structure_id: id,
          total_recommendations: 0,
          recommendations: []
        });
      }

      structure.geometric_details.floors.forEach((floor, floorIndex) => {
        if (floor.flats && floor.flats.length > 0) {
          floor.flats.forEach((flat, flatIndex) => {
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
                    location: `Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1}`,
                    issue: rating.condition_comment || `${component} needs attention`,
                    recommendedAction: this.getStructuralRecommendation(component, rating.rating),
                    urgency: rating.rating === 1 ? 'Immediate' : 'Within 30 days',
                    rating: rating.rating,
                    photos: rating.photos || []
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
                    location: `Floor ${floor.floor_number}, Flat ${flat.flat_number || flatIndex + 1}`,
                    issue: rating.condition_comment || `${component.replace('_', ' ')} needs attention`,
                    recommendedAction: this.getNonStructuralRecommendation(component, rating.rating),
                    urgency: rating.rating === 1 ? 'Within 15 days' : 'Within 60 days',
                    rating: rating.rating,
                    photos: rating.photos || []
                  });
                }
              });
            }
          });
        }
      });

      // Sort by priority and urgency
      const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      recommendations.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.urgency.localeCompare(b.urgency);
      });

      sendSuccessResponse(res, 'Maintenance recommendations retrieved successfully', {
        structure_id: id,
        structure_uid: structure.structural_identity.uid,
        total_recommendations: recommendations.length,
        critical_issues: recommendations.filter(r => r.priority === 'Critical').length,
        high_priority_issues: recommendations.filter(r => r.priority === 'High').length,
        recommendations: recommendations
      });
    } catch (error) {
      console.error('❌ Error fetching maintenance recommendations:', error);
      sendErrorResponse(res, 'Failed to fetch maintenance recommendations', 500, error.message);
    }
  }

  // Helper method for structural recommendations
  getStructuralRecommendation(component, rating) {
    const recommendations = {
      beams: {
        1: 'Immediate structural assessment required. Consider beam replacement or strengthening.',
        2: 'Detailed inspection and repair of cracks/deflection needed within 30 days.'
      },
      columns: {
        1: 'Critical - Immediate structural engineer assessment. Potential load-bearing compromise.',
        2: 'Repair cracks and assess load-bearing capacity. Monitor closely.'
      },
      slab: {
        1: 'Major slab repair or replacement required. Safety risk present.',
        2: 'Repair cracks and address deflection issues. Check for water damage.'
      },
      foundation: {
        1: 'Critical foundation issues. Immediate professional assessment required.',
        2: 'Foundation repair needed. Address settlement and drainage issues.'
      }
    };

    return recommendations[component]?.[rating] || `${component} requires professional assessment.`;
  }

  // Helper method for non-structural recommendations
  getNonStructuralRecommendation(component, rating) {
    const recommendations = {
      brick_plaster: {
        1: 'Complete replastering required. Address underlying moisture issues.',
        2: 'Repair cracks and repaint. Check for seepage.'
      },
      doors_windows: {
        1: 'Replace doors/windows. Check for security and weather sealing.',
        2: 'Repair hardware and improve sealing. Paint/stain as needed.'
      },
      electrical_wiring: {
        1: 'Complete electrical system overhaul required. Safety hazard present.',
        2: 'Upgrade wiring and replace faulty components. Check circuit capacity.'
      },
      plumbing: {
        1: 'Major plumbing renovation needed. Replace old pipes.',
        2: 'Repair leaks and replace worn fixtures. Check water pressure.'
      },
      sanitary_fittings: {
        1: 'Replace all sanitary fittings. Address hygiene and functionality issues.',
        2: 'Repair or replace damaged fittings. Improve drainage.'
      },
      flooring_tiles: {
        1: 'Complete floor replacement required. Safety and aesthetic concerns.',
        2: 'Repair damaged tiles and improve finishing.'
      },
      railings: {
        1: 'Replace railings immediately. Safety hazard present.',
        2: 'Repair and strengthen existing railings.'
      },
      water_tanks: {
        1: 'Replace water storage system. Water quality and supply issues.',
        2: 'Clean and repair water tanks. Check for leaks.'
      },
      sewage_system: {
        1: 'Major sewage system overhaul required. Immediate health hazard.',
        2: 'Repair drainage issues and improve sewage flow.'
      },
      panel_board: {
        1: 'Replace electrical panel board. Fire and safety hazard.',
        2: 'Upgrade panel board components and improve safety features.'
      },
      lifts: {
        1: 'Lift system requires immediate replacement or major overhaul.',
        2: 'Service and repair lift mechanisms. Address safety concerns.'
      }
    };

    return recommendations[component]?.[rating] || `${component.replace('_', ' ')} needs maintenance attention.`;
  }
}

module.exports = new StructureController();