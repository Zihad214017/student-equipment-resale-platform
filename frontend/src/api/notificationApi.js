import api from './client';

export const notificationApi = {
  // Get notifications
  getNotifications: (params = {}) => api.get('/notifications', { params }),

  // Get unread count
  getUnreadCount: () => api.get('/notifications/unread-count'),

  // Mark single as read
  markRead: (id) => api.patch(`/notifications/${id}/read`),

  // Mark all as read
  markAllRead: () => api.patch('/notifications/read-all'),

  // Delete notification
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};
