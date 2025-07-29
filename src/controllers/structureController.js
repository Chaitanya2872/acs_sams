const { Structure, User } = require('../models/schemas');
const { catchAsync } = require('../middlewares/errorHandler');
const {
  sendSuccessResponse,
  sendErrorResponse,
  sendCreatedResponse,
  sendUpdatedResponse,
  sendPaginatedResponse
} = require('../utils/responseHandler');
const { MESSAGES, PAGINATION } = require('../utils/constants');

class StructureController {
  async createStructure(req, res) {
    try {
      console.log('📝 Creating new structure...');
      console.log('👤 User:', req.user.userId);
      console.log('📋 Data received:', {
        stateCode: req.body.structural_identity?.state_code,
        districtCode: req.body.structural_identity?.district_code,
        cityName: req.body.structural_identity?.city_name,
        typeOfStructure: req.body.structural_identity?.type_of_structure
      });

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

      // Set creation info
      const structureData = {
        ...req.body,
        creation_info: {
          created_by: req.user.userId,
          created_date: new Date()
        },
        status: req.body.status || 'draft'
      };
      
      const structure = new Structure(structureData);
      await structure.save();
      
      await structure.populate('creation_info.created_by', 'username email role');
      
      console.log('✅ Structure created with UID:', structure.structural_identity.uid);
      
      res.status(201).json({
        success: true,
        message: 'Structure created successfully',
        data: structure
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
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Structure with this UID already exists',
          error: 'Duplicate structure identity'
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
      
      const filter = {};
      
      // Add filters based on query parameters
      if (req.query.state_code) filter['structural_identity.state_code'] = req.query.state_code;
      if (req.query.district_code) filter['structural_identity.district_code'] = req.query.district_code;
      if (req.query.city_name) filter['structural_identity.city_name'] = new RegExp(req.query.city_name, 'i');
      if (req.query.type_of_structure) filter['structural_identity.type_of_structure'] = req.query.type_of_structure;
      if (req.query.status) filter.status = req.query.status;
      
      // Search functionality
      if (req.query.search) {
        filter.$or = [
          { 'structural_identity.uid': { $regex: req.query.search, $options: 'i' } },
          { 'administration.client_name': { $regex: req.query.search, $options: 'i' } },
          { 'location.address': { $regex: req.query.search, $options: 'i' } }
        ];
      }
      
      // If user is not admin, only show their structures
      if (req.user.role !== 'admin') {
        filter['creation_info.created_by'] = req.user.userId;
      }
      
      const structures = await Structure.find(filter)
        .populate('creation_info.created_by', 'username email role')
        .populate('creation_info.last_updated_by', 'username email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Structure.countDocuments(filter);
      
      sendPaginatedResponse(res, structures, page, limit, total, MESSAGES.DATA_RETRIEVED);
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

      console.log('🔍 Fetching structures for user:', userId);

      // Check if the user exists
      const user = await User.findById(userId);
      if (!user) {
        return sendErrorResponse(res, 'User not found', 404);
      }

      // Permission check: Users can only see their own structures unless they're admin
      if (req.user.role !== 'admin' && req.user.userId.toString() !== userId) {
        return sendErrorResponse(res, 'Access denied. You can only view your own structures.', 403);
      }

      const filter = { 
        'creation_info.created_by': userId
      };

      // Add additional filters if provided
      if (req.query.state_code) filter['structural_identity.state_code'] = req.query.state_code;
      if (req.query.district_code) filter['structural_identity.district_code'] = req.query.district_code;
      if (req.query.city_name) filter['structural_identity.city_name'] = new RegExp(req.query.city_name, 'i');
      if (req.query.type_of_structure) filter['structural_identity.type_of_structure'] = req.query.type_of_structure;
      if (req.query.status) filter.status = req.query.status;

      const structures = await Structure.find(filter)
        .populate('creation_info.created_by', 'username email role')
        .populate('creation_info.last_updated_by', 'username email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Structure.countDocuments(filter);

      console.log(`✅ Found ${structures.length} structures for user ${user.username}`);

      const response = {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        structures,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };

      sendSuccessResponse(res, `Structures for user: ${user.username}`, response);
    } catch (error) {
      console.error('❌ Error fetching structures by user ID:', error);
      sendErrorResponse(res, 'Failed to fetch structures for user', 500, error.message);
    }
  }
  
  async getStructureById(req, res) {
    try {
      const { id } = req.params;
      
      const structure = await Structure.findById(id)
        .populate('creation_info.created_by', 'username email role')
        .populate('creation_info.last_updated_by', 'username email role');
      
      if (!structure) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.creation_info.created_by._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, structure);
    } catch (error) {
      console.error('❌ Error fetching structure by ID:', error);
      sendErrorResponse(res, 'Failed to fetch structure', 500, error.message);
    }
  }
  
  async updateStructure(req, res) {
    try {
      const { id } = req.params;
      
      const structure = await Structure.findById(id);
      
      if (!structure) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.creation_info.created_by.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }

      // Prevent updating the auto-generated UID
      const updateData = { ...req.body };
      if (updateData.structural_identity?.uid) {
        delete updateData.structural_identity.uid;
      }
      
      // Update last modified info
      updateData.creation_info = {
        ...structure.creation_info,
        last_updated_by: req.user.userId,
        last_updated_date: new Date()
      };
      
      const updatedStructure = await Structure.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('creation_info.created_by', 'username email role')
       .populate('creation_info.last_updated_by', 'username email role');
      
      sendUpdatedResponse(res, updatedStructure, 'Structure updated successfully');
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
      
      const structure = await Structure.findById(id);
      
      if (!structure) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.creation_info.created_by.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      // Hard delete (you could implement soft delete by updating status instead)
      await Structure.findByIdAndDelete(id);
      
      sendSuccessResponse(res, 'Structure deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting structure:', error);
      sendErrorResponse(res, 'Failed to delete structure', 500, error.message);
    }
  }
  
  async getStructureStats(req, res) {
    try {
      const filter = {};
      
      // If user is not admin, only show their structures
      if (req.user.role !== 'admin') {
        filter['creation_info.created_by'] = req.user.userId;
      }
      
      const stats = await Structure.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalStructures: { $sum: 1 },
            byType: {
              $push: {
                type: '$structural_identity.type_of_structure',
                status: '$status'
              }
            },
            byState: {
              $push: '$structural_identity.state_code'
            }
          }
        },
        {
          $project: {
            totalStructures: 1,
            residential: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'residential'] }
                }
              }
            },
            commercial: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'commercial'] }
                }
              }
            },
            educational: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'educational'] }
                }
              }
            },
            hospital: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'hospital'] }
                }
              }
            },
            industrial: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'industrial'] }
                }
              }
            },
            draftStructures: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'draft'] }
                }
              }
            },
            submittedStructures: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'submitted'] }
                }
              }
            },
            approvedStructures: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'approved'] }
                }
              }
            },
            requiresInspection: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'requires_inspection'] }
                }
              }
            },
            maintenanceNeeded: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'maintenance_needed'] }
                }
              }
            },
            stateDistribution: '$byState'
          }
        }
      ]);

      // Get state-wise distribution
      const stateStats = await Structure.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$structural_identity.state_code',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      const result = stats[0] || {
        totalStructures: 0,
        residential: 0,
        commercial: 0,
        educational: 0,
        hospital: 0,
        industrial: 0,
        draftStructures: 0,
        submittedStructures: 0,
        approvedStructures: 0,
        requiresInspection: 0,
        maintenanceNeeded: 0
      };

      result.stateWiseDistribution = stateStats;
      
      sendSuccessResponse(res, 'Structure statistics retrieved successfully', result);
    } catch (error) {
      console.error('❌ Error fetching structure statistics:', error);
      sendErrorResponse(res, 'Failed to fetch structure statistics', 500, error.message);
    }
  }

  // New method to get structure by UID
  async getStructureByUID(req, res) {
    try {
      const { uid } = req.params;
      
      const structure = await Structure.findOne({ 'structural_identity.uid': uid })
        .populate('creation_info.created_by', 'username email role')
        .populate('creation_info.last_updated_by', 'username email role');
      
      if (!structure) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.creation_info.created_by._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      sendSuccessResponse(res, MESSAGES.DATA_RETRIEVED, structure);
    } catch (error) {
      console.error('❌ Error fetching structure by UID:', error);
      sendErrorResponse(res, 'Failed to fetch structure', 500, error.message);
    }
  }

  // New method to get floors of a structure
  async getStructureFloors(req, res) {
    try {
      const { id } = req.params;
      
      const structure = await Structure.findById(id)
        .select('geometric_details.floors structural_identity.uid administration.client_name')
        .populate('creation_info.created_by', 'username email role');
      
      if (!structure) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.creation_info.created_by._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }
      
      sendSuccessResponse(res, 'Structure floors retrieved successfully', {
        structure_uid: structure.structural_identity.uid,
        client_name: structure.administration.client_name,
        floors: structure.geometric_details.floors
      });
    } catch (error) {
      console.error('❌ Error fetching structure floors:', error);
      sendErrorResponse(res, 'Failed to fetch structure floors', 500, error.message);
    }
  }

  // New method to get flats of a specific floor
  async getFloorFlats(req, res) {
    try {
      const { id, floorNumber } = req.params;
      
      const structure = await Structure.findById(id)
        .select('geometric_details.floors structural_identity.uid')
        .populate('creation_info.created_by', 'username email role');
      
      if (!structure) {
        return sendErrorResponse(res, 'Structure not found', 404);
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.creation_info.created_by._id.toString() !== req.user.userId.toString()) {
        return sendErrorResponse(res, 'Access denied', 403);
      }

      const floor = structure.geometric_details.floors.find(f => f.floor_number === parseInt(floorNumber));
      
      if (!floor) {
        return sendErrorResponse(res, 'Floor not found', 404);
      }
      
      sendSuccessResponse(res, 'Floor flats retrieved successfully', {
        structure_uid: structure.structural_identity.uid,
        floor_number: floor.floor_number,
        floor_type: floor.floor_type,
        flats: floor.flats
      });
    } catch (error) {
      console.error('❌ Error fetching floor flats:', error);
      sendErrorResponse(res, 'Failed to fetch floor flats', 500, error.message);
    }
  }
}

module.exports = new StructureController();