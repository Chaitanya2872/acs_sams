const { Notification, User, Structure } = require('../models/schemas');

class NotificationService {
  // Create a new notification
  async createNotification(data) {
    try {
      const notification = new Notification(data);
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Send notification to multiple users
  async sendBulkNotification(userIds, title, message, type, relatedId = null) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        title,
        message,
        type,
        relatedId
      }));

      const result = await Notification.insertMany(notifications);
      return result;
    } catch (error) {
      console.error('Send bulk notification error:', error);
      throw error;
    }
  }

  // Send inspection due notifications
  async sendInspectionDueNotifications() {
    try {
      const upcomingInspections = await Structure.find({
        nextScheduledInspection: {
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          $gte: new Date()
        }
      }).populate('createdBy administrationDetails.inspectorId');

      const notifications = [];

      for (const structure of upcomingInspections) {
        const daysUntilInspection = Math.ceil(
          (structure.nextScheduledInspection - new Date()) / (1000 * 60 * 60 * 24)
        );

        const title = `Inspection Due: ${structure.administrationDetails.popularNameOfStructure}`;
        const message = `Structure inspection is due in ${daysUntilInspection} day(s). Please schedule the inspection.`;

        // Notify creator
        if (structure.createdBy) {
          notifications.push({
            userId: structure.createdBy._id,
            title,
            message,
            type: 'inspection_due',
            relatedId: structure._id
          });
        }

        // Notify assigned inspector
        if (structure.administrationDetails.inspectorId) {
          notifications.push({
            userId: structure.administrationDetails.inspectorId._id,
            title,
            message,
            type: 'inspection_due',
            relatedId: structure._id
          });
        }

        // Notify admins
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
          notifications.push({
            userId: admin._id,
            title,
            message,
            type: 'inspection_due',
            relatedId: structure._id
          });
        }
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      return notifications.length;
    } catch (error) {
      console.error('Send inspection due notifications error:', error);
      throw error;
    }
  }

  // Send maintenance request notifications
  async sendMaintenanceRequestNotification(maintenanceRequest) {
    try {
      const structure = await Structure.findById(maintenanceRequest.structureId)
        .populate('createdBy administrationDetails.inspectorId');

      const title = `New Maintenance Request: ${structure.administrationDetails.popularNameOfStructure}`;
      const message = `A new ${maintenanceRequest.priority} priority ${maintenanceRequest.category} maintenance request has been created.`;

      const notifications = [];

      // Notify structure creator
      if (structure.createdBy && structure.createdBy._id.toString() !== maintenanceRequest.requestedBy.toString()) {
        notifications.push({
          userId: structure.createdBy._id,
          title,
          message,
          type: 'maintenance_request',
          relatedId: maintenanceRequest._id
        });
      }

      // Notify assigned inspector
      if (structure.administrationDetails.inspectorId && 
          structure.administrationDetails.inspectorId._id.toString() !== maintenanceRequest.requestedBy.toString()) {
        notifications.push({
          userId: structure.administrationDetails.inspectorId._id,
          title,
          message,
          type: 'maintenance_request',
          relatedId: maintenanceRequest._id
        });
      }

      // Notify admins
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        if (admin._id.toString() !== maintenanceRequest.requestedBy.toString()) {
          notifications.push({
            userId: admin._id,
            title,
            message,
            type: 'maintenance_request',
            relatedId: maintenanceRequest._id
          });
        }
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      return notifications.length;
    } catch (error) {
      console.error('Send maintenance request notification error:', error);
      throw error;
    }
  }

  // Send system alert to all users
  async sendSystemAlert(title, message, targetRoles = null) {
    try {
      let userFilter = {};
      if (targetRoles && targetRoles.length > 0) {
        userFilter.role = { $in: targetRoles };
      }

      const users = await User.find(userFilter).select('_id');
      const userIds = users.map(user => user._id);

      return await this.sendBulkNotification(userIds, title, message, 'system_alert');
    } catch (error) {
      console.error('Send system alert error:', error);
      throw error;
    }
  }

  // Send critical structure alert
  async sendCriticalStructureAlert(structure) {
    try {
      const title = `Critical Structure Alert: ${structure.administrationDetails.popularNameOfStructure}`;
      const message = `Structure has been marked as critical priority. Immediate attention required.`;

      const notifications = [];

      // Notify structure creator
      if (structure.createdBy) {
        notifications.push({
          userId: structure.createdBy,
          title,
          message,
          type: 'system_alert',
          relatedId: structure._id
        });
      }

      // Notify assigned inspector
      if (structure.administrationDetails.inspectorId) {
        notifications.push({
          userId: structure.administrationDetails.inspectorId,
          title,
          message,
          type: 'system_alert',
          relatedId: structure._id
        });
      }

      // Notify all admins and inspectors
      const users = await User.find({ 
        role: { $in: ['admin', 'inspector'] } 
      }).select('_id');

      for (const user of users) {
        const alreadyNotified = notifications.some(
          n => n.userId.toString() === user._id.toString()
        );
        
        if (!alreadyNotified) {
          notifications.push({
            userId: user._id,
            title,
            message,
            type: 'system_alert',
            relatedId: structure._id
          });
        }
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      return notifications.length;
    } catch (error) {
      console.error('Send critical structure alert error:', error);
      throw error;
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysOld = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true
      });

      return result.deletedCount;
    } catch (error) {
      console.error('Cleanup old notifications error:', error);
      throw error;
    }
  }

  // Get notification statistics for admin dashboard
  async getNotificationStats() {
    try {
      const stats = await Notification.aggregate([
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

      const totalNotifications = await Notification.countDocuments();
      const unreadNotifications = await Notification.countDocuments({ isRead: false });

      return {
        total: totalNotifications,
        unread: unreadNotifications,
        readPercentage: totalNotifications > 0 ? 
          ((totalNotifications - unreadNotifications) / totalNotifications * 100).toFixed(2) : 0,
        byType: stats.reduce((acc, item) => {
          const type = item._id.type;
          if (!acc[type]) {
            acc[type] = { total: 0, read: 0, unread: 0 };
          }
          
          acc[type].total += item.count;
          if (item._id.isRead) {
            acc[type].read += item.count;
          } else {
            acc[type].unread += item.count;
          }
          
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Get notification stats error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService()