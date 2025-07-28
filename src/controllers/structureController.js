const Structure = require('../models/Structure');
const User = require('../models/User');

class StructureController {
  async createStructure(req, res) {
    try {
      console.log('📝 Creating new structure...');
      console.log('👤 User:', req.user._id);
      console.log('📋 Data received:', {
        stateCode: req.body.stateCode,
        districtCode: req.body.districtCode,
        cityName: req.body.cityName,
        typeOfStructure: req.body.typeOfStructure
      });

      const structureData = {
        ...req.body,
        createdBy: req.user._id
      };
      
      // Remove structuralIdentityNumber from request if provided (let it auto-generate)
      delete structureData.structuralIdentityNumber;
      
      const structure = new Structure(structureData);
      await structure.save();
      
      await structure.populate('createdBy', 'name email');
      
      console.log('✅ Structure created with ID:', structure.structuralIdentityNumber);
      
      res.status(201).json({
        success: true,
        message: 'Structure created successfully',
        data: structure
      });
    } catch (error) {
      console.error('❌ Structure creation error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Structure with this identity number already exists',
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
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = { isActive: true };
      
      // Add filters based on query parameters
      if (req.query.stateCode) filter.stateCode = req.query.stateCode;
      if (req.query.districtCode) filter.districtCode = req.query.districtCode;
      if (req.query.cityName) filter.cityName = new RegExp(req.query.cityName, 'i');
      if (req.query.typeOfStructure) filter.typeOfStructure = req.query.typeOfStructure;
      if (req.query.inspectionStatus) filter.inspectionStatus = req.query.inspectionStatus;
      
      // If user is not admin, only show their structures
      if (req.user.role !== 'admin') {
        filter.createdBy = req.user._id;
      }
      
      const structures = await Structure.find(filter)
        .populate('createdBy', 'name email')
        .populate('inspectorId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Structure.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        data: structures,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch structures',
        error: error.message
      });
    }
  }

  // NEW: Get structures by specific user ID
  async getStructuresByUserId(req, res) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      console.log('🔍 Fetching structures for user:', userId);

      // Check if the user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Permission check: Users can only see their own structures unless they're admin
      if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own structures.'
        });
      }

      const filter = { 
        createdBy: userId,
        isActive: true 
      };

      // Add additional filters if provided
      if (req.query.stateCode) filter.stateCode = req.query.stateCode;
      if (req.query.districtCode) filter.districtCode = req.query.districtCode;
      if (req.query.cityName) filter.cityName = new RegExp(req.query.cityName, 'i');
      if (req.query.typeOfStructure) filter.typeOfStructure = req.query.typeOfStructure;
      if (req.query.inspectionStatus) filter.inspectionStatus = req.query.inspectionStatus;

      const structures = await Structure.find(filter)
        .populate('createdBy', 'name email designation')
        .populate('inspectorId', 'name email designation')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Structure.countDocuments(filter);

      console.log(`✅ Found ${structures.length} structures for user ${user.name}`);

      res.status(200).json({
        success: true,
        message: `Structures for user: ${user.name}`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        data: structures,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      });
    } catch (error) {
      console.error('❌ Error fetching structures by user ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch structures for user',
        error: error.message
      });
    }
  }
  
  async getStructureById(req, res) {
    try {
      const { id } = req.params;
      
      const structure = await Structure.findById(id)
        .populate('createdBy', 'name email designation')
        .populate('inspectorId', 'name email designation');
      
      if (!structure) {
        return res.status(404).json({
          success: false,
          message: 'Structure not found'
        });
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.createdBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      res.status(200).json({
        success: true,
        data: structure
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch structure',
        error: error.message
      });
    }
  }
  
  async updateStructure(req, res) {
    try {
      const { id } = req.params;
      
      const structure = await Structure.findById(id);
      
      if (!structure) {
        return res.status(404).json({
          success: false,
          message: 'Structure not found'
        });
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Prevent updating the auto-generated structuralIdentityNumber
      const updateData = { ...req.body };
      delete updateData.structuralIdentityNumber;
      
      const updatedStructure = await Structure.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('inspectorId', 'name email');
      
      res.status(200).json({
        success: true,
        message: 'Structure updated successfully',
        data: updatedStructure
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update structure',
        error: error.message
      });
    }
  }
  
  async deleteStructure(req, res) {
    try {
      const { id } = req.params;
      
      const structure = await Structure.findById(id);
      
      if (!structure) {
        return res.status(404).json({
          success: false,
          message: 'Structure not found'
        });
      }
      
      // Check permissions
      if (req.user.role !== 'admin' && structure.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      // Soft delete
      structure.isActive = false;
      await structure.save();
      
      res.status(200).json({
        success: true,
        message: 'Structure deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete structure',
        error: error.message
      });
    }
  }
  
  async getStructureStats(req, res) {
    try {
      const filter = { isActive: true };
      
      // If user is not admin, only show their structures
      if (req.user.role !== 'admin') {
        filter.createdBy = req.user._id;
      }
      
      const stats = await Structure.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalStructures: { $sum: 1 },
            byType: {
              $push: {
                type: '$typeOfStructure',
                status: '$inspectionStatus'
              }
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
            pendingInspections: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'pending'] }
                }
              }
            },
            completedInspections: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'completed'] }
                }
              }
            },
            inProgressInspections: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'in_progress'] }
                }
              }
            },
            requiresReinspection: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'requires_reinspection'] }
                }
              }
            }
          }
        }
      ]);
      
      res.status(200).json({
        success: true,
        data: stats[0] || {
          totalStructures: 0,
          residential: 0,
          commercial: 0,
          educational: 0,
          hospital: 0,
          industrial: 0,
          pendingInspections: 0,
          completedInspections: 0,
          inProgressInspections: 0,
          requiresReinspection: 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch structure statistics',
        error: error.message
      });
    }
  }
}

module.exports = new StructureController();