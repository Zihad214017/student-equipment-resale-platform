import api from './client';

export const requestApi = {
  // Submit purchase request
  submitRequest: (data) => api.post('/purchase-requests', data),

  // Buyer view sent requests
  getBuyerRequests: (params = {}) => api.get('/purchase-requests/buyer', { params }),

  // Seller view received requests
  getSellerRequests: (params = {}) => api.get('/purchase-requests/seller', { params }),

  // Get request details
  getRequestById: (id) => api.get(`/purchase-requests/${id}`),

  // Seller accept/reject
  respondRequest: (id, data) => api.patch(`/purchase-requests/${id}/respond`, data),

  // Buyer cancel
  cancelRequest: (id) => api.patch(`/purchase-requests/${id}/cancel`),
};
