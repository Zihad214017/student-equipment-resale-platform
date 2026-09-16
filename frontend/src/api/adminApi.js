import api from './client';

export const adminApi = {
  // Platform Reports & Dashboard
  getReports: () => api.get('/admin/reports'),

  // User Management
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  toggleUserStatus: (id, isActive) => api.patch(`/admin/users/${id}/toggle-status`, { is_active: isActive }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),

  // Equipment Management & Moderation
  getEquipment: (params = {}) => api.get('/admin/equipment', { params }),
  getEquipmentById: (id) => api.get(`/admin/equipment/${id}`),
  moderateEquipment: (id, status, reason = '') => api.patch(`/admin/equipment/${id}/approval`, { status, reason }),
  updateEquipmentStatus: (id, status) => api.patch(`/admin/equipment/${id}/status`, { status }),
  deleteEquipment: (id) => api.delete(`/admin/equipment/${id}`),

  // Category Management
  getCategories: () => api.get('/admin/categories'),
  getCategoryById: (id) => api.get(`/admin/categories/${id}`),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  // Transaction Monitoring
  getTransactions: (params = {}) => api.get('/admin/transactions', { params }),
  getTransactionById: (id) => api.get(`/admin/transactions/${id}`),
  updateTransactionStatus: (id, data) => api.patch(`/admin/transactions/${id}/status`, data),
};
