const express = require('express');
const router = express.Router();
const { Notification, Structure, MaintenanceRequest } = require('../models/schemas');
const AuthService = require('../services/authService');
const NotificationService = require('../services/notificationService');

// Utility function for handling async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get all notifications for authenticated user
router.get('/', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        isRead,
        type
      } = req.query;

      const filter = { userId: req.user.userId };
      
      if (typeof isRead !== 'undefined') {
        filter.isRead = isRead === 'true';
      }
      
      if (type) {
        filter.type = type;
      }

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.countDocuments({ 
        userId: req.user.userId, 
        isRead: false 
      });

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalNotifications: total,
            limit: parseInt(limit),
            hasNextPage: page < Math.ceil(total / parseInt(limit)),
            hasPrevPage: page > 1
          },
          unreadCount
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications'
      });
    }
  })
);

// Get notification counts by type
router.get('/counts', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      const counts = await Notification.aggregate([
        { $match: { userId: req.user.userId } },
        {
          $group: {
            _id: {
              type: '$type',
              isRead: '$isRead'
            },
            count: { $sum: 1 }
          }
        }
      ]);

      const formattedCounts = {
        total: 0,
        unread: 0,
        byType: {
          inspection_due: { total: 0, unread: 0 },
          maintenance_request: { total: 0, unread: 0 },
          system_alert: { total: 0, unread: 0 },
          general: { total: 0, unread: 0 }
        }
      };

      counts.forEach(item => {
        const { type, isRead } = item._id;
        const count = item.count;
        
        formattedCounts.total += count;
        
        if (!isRead) {
          formattedCounts.unread += count;
          formattedCounts.byType[type].unread += count;
        }
        
        formattedCounts.byType[type].total += count;
      });

      res.json({
        success: true,
        data: formattedCounts
      });
    } catch (error) {
      console.error('Get notification counts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification counts'
      });
    }
  })
);

// Mark notification as read
router.put('/:id/read', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      const notification = await Notification.findOne({
        _id: req.params.id,
        userId: req.user.userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      notification.isRead = true;
      await notification.save();

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: { notification }
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  })
);

// Mark all notifications as read
router.put('/mark-all-read', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      const result = await Notification.updateMany(
        { userId: req.user.userId, isRead: false },
        { isRead: true }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} notifications marked as read`,
        data: { modifiedCount: result.modifiedCount }
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  })
);

// Delete notification
router.delete('/:id', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification'
      });
    }
  })
);

// Delete all read notifications
router.delete('/clear-read', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      const result = await Notification.deleteMany({
        userId: req.user.userId,
        isRead: true
      });

      res.json({
        success: true,
        message: `${result.deletedCount} read notifications deleted`,
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      console.error('Clear read notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear read notifications'
      });
    }
  })
);

// Get notification by ID
router.get('/:id', 
  AuthService.authenticate,
  asyncHandler(async (req, res) => {
    try {
      const notification = await Notification.findOne({
        _id: req.params.id,
        userId: req.user.userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      // Automatically mark as read when viewed
      if (!notification.isRead) {
        notification.isRead = true;
        await notification.save();
      }

      res.json({
        success: true,
        data: { notification }
      });
    } catch (error) {
      console.error('Get notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notification'
      });
    }
  })
);

module.exports = router;