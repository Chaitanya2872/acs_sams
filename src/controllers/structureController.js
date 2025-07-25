const Structure = require('../models/Structure');

class StructureController {
  async createStructure(req, res) {
    try {
      const structureData = {
        ...req.body,
        createdBy: req.user._id
      };
      
      const structure = new Structure(structureData);
      await structure.save();
      
      await structure.populate('createdBy', 'name email');
      
      res.status(201).json({
        success: true,
        message: 'Structure created successfully',
        data: structure
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
      
      const updatedStructure = await Structure.findByIdAndUpdate(
        id,
        req.body,
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
          pendingInspections: 0,
          completedInspections: 0
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