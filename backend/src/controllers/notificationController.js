const notificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get user notifications
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);
    return ApiResponse.success(
      res,
      'Notifications retrieved successfully.',
      result.notifications,
      200,
      {
        ...result.pagination,
        unread_count: result.unread_count,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user.id);
    return ApiResponse.success(res, 'Unread notification count retrieved.', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark single notification as read
 * PATCH /api/v1/notifications/:id/read
 */
const markRead = async (req, res, next) => {
  try {
    const updated = await notificationService.markNotificationAsRead(req.user.id, req.params.id);
    return ApiResponse.success(res, 'Notification marked as read.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/v1/notifications/read-all
 */
const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user.id);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification
 * DELETE /api/v1/notifications/:id
 */
const remove = async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(req.user.id, req.params.id);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  remove,
};
