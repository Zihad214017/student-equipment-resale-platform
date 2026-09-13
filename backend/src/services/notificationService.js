const db = require('../config/database');
const { NOTIFICATION_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Dispatch / Create a new notification
 * @param {object} params
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = NOTIFICATION_TYPES.SYSTEM_ALERT,
  referenceId = null,
  referenceType = null,
}) => {
  try {
    const insertQuery = `
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        reference_id,
        reference_type
      ) VALUES ($1, $2, $3, $4, FALSE, $5, $6)
      RETURNING id, user_id, title, message, type, is_read, reference_id, reference_type, created_at;
    `;

    const result = await db.query(insertQuery, [
      userId,
      title,
      message,
      type,
      referenceId,
      referenceType,
    ]);

    logger.info('Notification created', { userId, type, title });
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating notification', { error: error.message, userId });
    return null;
  }
};

/**
 * Get notifications for a user with unread count and pagination
 * @param {string} userId 
 * @param {object} filters 
 */
const getUserNotifications = async (userId, filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 15));
  const offset = (page - 1) * limit;

  const conditions = ['n.user_id = $1'];
  const params = [userId];
  let paramIdx = 2;

  // Filter by is_read
  if (filters.is_read !== undefined && filters.is_read !== 'all') {
    const isReadBool = filters.is_read === true || filters.is_read === 'true';
    conditions.push(`n.is_read = $${paramIdx}`);
    params.push(isReadBool);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 1. Get total matching notifications
  const countResult = await db.query(
    `SELECT COUNT(id) AS total FROM notifications n ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  // 2. Get unread count for user across all notifications
  const unreadResult = await db.query(
    'SELECT COUNT(id) AS unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  const unreadCount = parseInt(unreadResult.rows[0].unread_count, 10);

  // 3. Query paginated notifications
  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      n.id,
      n.user_id,
      n.title,
      n.message,
      n.type,
      n.is_read,
      n.reference_id,
      n.reference_type,
      n.created_at
    FROM notifications n
    ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(query, queryParams);

  return {
    notifications: result.rows,
    unread_count: unreadCount,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get unread notification count for a user
 * @param {string} userId 
 */
const getUnreadCount = async (userId) => {
  const result = await db.query(
    'SELECT COUNT(id) AS unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return {
    unread_count: parseInt(result.rows[0].unread_count, 10),
  };
};

/**
 * Mark a single notification as read (Owner only)
 * @param {string} userId 
 * @param {string} notificationId 
 */
const markNotificationAsRead = async (userId, notificationId) => {
  const existing = await db.query(
    'SELECT id, user_id, is_read FROM notifications WHERE id = $1',
    [notificationId]
  );

  if (existing.rows.length === 0) {
    const error = new Error('Notification not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  // Ownership Guard: Only owner can mark as read
  if (existing.rows[0].user_id !== userId) {
    const error = new Error('Access denied. You can only manage your own notifications.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  const result = await db.query(
    `UPDATE notifications 
     SET is_read = TRUE 
     WHERE id = $1 
     RETURNING id, user_id, title, message, type, is_read, reference_id, reference_type, created_at`,
    [notificationId]
  );

  return result.rows[0];
};

/**
 * Mark all unread notifications as read for a user
 * @param {string} userId 
 */
const markAllNotificationsAsRead = async (userId) => {
  const result = await db.query(
    `UPDATE notifications 
     SET is_read = TRUE 
     WHERE user_id = $1 AND is_read = FALSE
     RETURNING id`,
    [userId]
  );

  const updatedCount = result.rows.length;
  logger.info('Marked all notifications as read', { userId, count: updatedCount });

  return {
    updated_count: updatedCount,
    message: `${updatedCount} notification(s) marked as read.`,
  };
};

/**
 * Delete a notification (Owner only)
 * @param {string} userId 
 * @param {string} notificationId 
 */
const deleteNotification = async (userId, notificationId) => {
  const existing = await db.query(
    'SELECT id, user_id FROM notifications WHERE id = $1',
    [notificationId]
  );

  if (existing.rows.length === 0) {
    const error = new Error('Notification not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  if (existing.rows[0].user_id !== userId) {
    const error = new Error('Access denied. You can only delete your own notifications.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  await db.query('DELETE FROM notifications WHERE id = $1', [notificationId]);
  return { id: notificationId, message: 'Notification deleted successfully.' };
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
