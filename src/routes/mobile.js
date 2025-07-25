const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadMobileMultiple, validateMobileUpload } = require('../middleware/mobileUpload');
const {
  sendMobileResponse,
  sendMobileStructureList,
  sendMobileDashboard,
  sendMobileError
} = require('../utils/mobileResponseHandler');
const Structure = require('../models/Structure');
const User = require('../models/User');

const router = express.Router();

// All mobile routes require authentication
router.use(protect);

/**
 * @route   GET /api/mobile/sync
 * @desc    Get data for offline sync (last updated structures)
 * @access  Private
 */
router.get('/sync', async (req, res) => {
  try {
    const { lastSync } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build filter for changed data since last sync
    const filter = userRole === 'user' ? { submittedBy: userId } : {};
    
    if (lastSync) {
      filter.updatedAt = { $gte: new Date(lastSync) };
    }

    const [structures, userProfile] = await Promise.all([
      Structure.find(filter)
        .populate('submittedBy', 'name email')
        .sort({ updatedAt: -1 })
        .limit(50) // Limit for mobile sync
        .lean(),
      User.findById(userId).select('-password')
    ]);

    const syncData = {
      user: userProfile,
      structures: structures,
      syncTime: new Date().toISOString(),
      hasMore: structures.length === 50
    };

    sendMobileResponse(res, 'Sync data retrieved successfully', syncData);
  } catch (error) {
    console.error('Mobile sync error:', error);
    sendMobileError(res, 'Failed to sync data', 500, 'SYNC_ERROR');
  }
});

/**
 * @route   GET /api/mobile/structures
 * @desc    Get structures optimized for mobile list view
 * @access  Private
 */
router.get('/structures', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20, // Smaller limit for mobile
      status,
      priority,
      search
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(parseInt(limit), 50); // Max 50 for mobile
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};
    if (req.user.role === 'user') {
      filter.submittedBy = req.user.id;
    }

    if (status) filter.status = status;
    if (priority) filter.priorityLevel = priority;

    if (search) {
      filter.$or = [
        { structureIdentityNumber: { $regex: search, $options: 'i' } },
        { cityName: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } }
      ];
    }

    const [structures, total] = await Promise.all([
      Structure.find(filter)
        .populate('submittedBy', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('structureIdentityNumber structureType status priorityLevel totalScore cityName stateCode clientName numberOfFloors structureWidth structureLength totalHeight submittedAt createdAt')
        .lean(),
      Structure.countDocuments(filter)
    ]);

    sendMobileStructureList(res, structures, pageNum, limitNum, total);
  } catch (error) {
    console.error('Mobile structures error:', error);
    sendMobileError(res, 'Failed to load structures', 500, 'LOAD_ERROR');
  }
});

/**
 * @route   POST /api/mobile/structures
 * @desc    Create structure from mobile (with offline support)
 * @access  Private
 */
router.post('/structures', async (req, res) => {
  try {
    const structureData = {
      ...req.body,
      submittedBy: req.user.id,
      status: 'draft'
    };

    // Handle offline creation (if client-side ID provided)
    if (req.body.clientId) {
      structureData.clientId = req.body.clientId;
    }

    const structure = await Structure.create(structureData);
    
    // Mobile-optimized response
    const mobileStructure = {
      id: structure._id,
      identityNumber: structure.structureIdentityNumber,
      clientId: req.body.clientId, // Return client ID for offline sync
      status: structure.status,
      createdAt: structure.createdAt
    };

    sendMobileResponse(res, 'Structure created successfully', mobileStructure, 201);
  } catch (error) {
    console.error('Mobile structure creation error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return sendMobileError(res, messages.join(', '), 400, 'VALIDATION_ERROR');
    }
    
    sendMobileError(res, 'Failed to create structure', 500, 'CREATE_ERROR');
  }
});

/**
 * @route   POST /api/mobile/structures/:id/images
 * @desc    Upload images from mobile camera
 * @access  Private
 */
router.post('/structures/:id/images',
  uploadMobileMultiple('images', 8),
  validateMobileUpload,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { category = 'general', notes } = req.body;

      const structure = await Structure.findById(id);
      if (!structure) {
        return sendMobileError(res, 'Structure not found', 404, 'NOT_FOUND');
      }

      // Check permissions
      if (req.user.role === 'user' && structure.submittedBy.toString() !== req.user.id) {
        return sendMobileError(res, 'Not authorized', 403, 'UNAUTHORIZED');
      }

      // Process uploaded images
      const uploadedImages = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        category,
        notes,
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
        mobile: true
      }));

      // For now, just return success. In full implementation, 
      // you'd save to database and upload to cloud storage
      const responseData = {
        uploaded: uploadedImages.length,
        images: uploadedImages.map(img => ({
          id: `temp_${Date.now()}_${Math.random()}`,
          filename: img.filename,
          size: img.size,
          category: img.category
        }))
      };

      sendMobileResponse(res, 'Images uploaded successfully', responseData, 201);
    } catch (error) {
      console.error('Mobile image upload error:', error);
      sendMobileError(res, 'Failed to upload images', 500, 'UPLOAD_ERROR');
    }
  }
);

/**
 * @route   GET /api/mobile/dashboard
 * @desc    Get mobile-optimized dashboard
 * @access  Private
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const structureFilter = userRole === 'user' ? { submittedBy: userId } : {};

    const [
      totalStructures,
      statusStats,
      priorityStats,
      recentStructures
    ] = await Promise.all([
      Structure.countDocuments(structureFilter),
      
      Structure.aggregate([
        { $match: structureFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      Structure.aggregate([
        { $match: structureFilter },
        { $group: { _id: '$priorityLevel', count: { $sum: 1 } } }
      ]),
      
      Structure.find(structureFilter)
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('structureIdentityNumber structureType status totalScore cityName')
        .lean()
    ]);

    const dashboardData = {
      totalStructures,
      statusDistribution: statusStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      priorityDistribution: priorityStats.reduce((acc, item) => {
        acc[item._id] = { count: item.count };
        return acc;
      }, {}),
      recentStructures
    };

    sendMobileDashboard(res, dashboardData);
  } catch (error) {
    console.error('Mobile dashboard error:', error);
    sendMobileError(res, 'Failed to load dashboard', 500, 'DASHBOARD_ERROR');
  }
});

/**
 * @route   POST /api/mobile/offline-sync
 * @desc    Sync offline created/modified data
 * @access  Private
 */
router.post('/offline-sync', async (req, res) => {
  try {
    const { structures = [], images = [] } = req.body;
    const results = {
      structures: { success: 0, failed: 0, errors: [] },
      images: { success: 0, failed: 0, errors: [] }
    };

    // Process offline structures
    for (const structureData of structures) {
      try {
        const data = {
          ...structureData,
          submittedBy: req.user.id
        };
        delete data.clientId; // Remove client-side ID
        
        const structure = await Structure.create(data);
        results.structures.success++;
      } catch (error) {
        results.structures.failed++;
        results.structures.errors.push({
          clientId: structureData.clientId,
          error: error.message
        });
      }
    }

    sendMobileResponse(res, 'Offline sync completed', results);
  } catch (error) {
    console.error('Offline sync error:', error);
    sendMobileError(res, 'Failed to sync offline data', 500, 'SYNC_ERROR');
  }
});

/**
 * @route   GET /api/mobile/app-config
 * @desc    Get mobile app configuration
 * @access  Private
 */
router.get('/app-config', async (req, res) => {
  try {
    const config = {
      version: '1.0.0',
      features: {
        offline: true,
        camera: true,
        gps: true,
        push: false
      },
      limits: {
        maxImages: 8,
        maxFileSize: '10MB',
        offlineStorage: '100MB'
      },
      syncInterval: 300000, // 5 minutes
      endpoints: {
        sync: '/api/mobile/sync',
        upload: '/api/mobile/structures/:id/images'
      }
    };

    sendMobileResponse(res, 'App configuration retrieved', config);
  } catch (error) {
    console.error('App config error:', error);
    sendMobileError(res, 'Failed to get app config', 500, 'CONFIG_ERROR');
  }
});

module.exports = router;