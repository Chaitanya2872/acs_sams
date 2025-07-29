const express = require('express');
const router = express.Router();
const { MaintenanceRequest, Structure } = require('../models/schemas');
const AuthService = require('../services/authService');

// Utility function for handling async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Create maintenance request
router.post('/', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      // Verify structure exists
      const structure = await Structure.findById(req.body.structureId);
      if (!structure) {
        return res.status(404).json({
          success: false,
          error: 'Structure not found'
        });
      }

      const maintenanceRequest = new MaintenanceRequest({
        ...req.body,
        requestedBy: req.user.userId
      });

      await maintenanceRequest.save();
      await maintenanceRequest.populate('structureId', 'administrationDetails.popularNameOfStructure');
      await maintenanceRequest.populate('requestedBy', 'username email profile');

      res.status(201).json({
        success: true,
        message: 'Maintenance request created successfully',
        data: { maintenanceRequest }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create maintenance request'
      });
    }
  })
);

// Get all maintenance requests
router.get('/', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        priority,
        category
      } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (category) filter.category = category;

      // Role-based filtering
      if (req.user.role === 'viewer') {
        filter.requestedBy = req.user.userId;
      }

      const requests = await MaintenanceRequest.find(filter)
        .populate('structureId', 'administrationDetails.popularNameOfStructure structuralIdentityNumber')
        .populate('requestedBy', 'username email profile')
        .populate('assignedTo', 'username email profile')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await MaintenanceRequest.countDocuments(filter);

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalRequests: total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch maintenance requests'
      });
    }
  })
);

// Update maintenance request
router.put('/:id', 
  AuthService.authenticate,
  AuthService.authorize(['admin', 'inspector']),
  asyncHandler(async (req, res) => {
    try {
      const request = await MaintenanceRequest.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
      .populate('structureId', 'administrationDetails.popularNameOfStructure')
      .populate('requestedBy', 'username email profile')
      .populate('assignedTo', 'username email profile');

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Maintenance request not found'
        });
      }

      res.json({
        success: true,
        message: 'Maintenance request updated successfully',
        data: { request }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update maintenance request'
      });
    }
  })
);

module.exports = router;