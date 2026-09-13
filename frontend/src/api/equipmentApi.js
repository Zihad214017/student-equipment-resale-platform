import api from './client';

export const equipmentApi = {
  // Public catalog with search, filters, pagination
  getEquipment: (params = {}) => api.get('/equipment', { params }),

  // Single listing details
  getEquipmentById: (id) => api.get(`/equipment/${id}`),

  // Seller's own listings
  getMyListings: (params = {}) => api.get('/equipment/user/my-listings', { params }),

  // Create equipment (supports JSON or FormData)
  createEquipment: (data) => {
    const isFormData = data instanceof FormData;
    return api.post('/equipment', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
  },

  // Update equipment (supports JSON or FormData)
  updateEquipment: (id, data) => {
    const isFormData = data instanceof FormData;
    return api.put(`/equipment/${id}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
  },

  // Upload additional images for an equipment listing
  uploadImages: (id, formData) =>
    api.post(`/equipment/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Delete an individual equipment image
  deleteImage: (id, imageId) => api.delete(`/equipment/${id}/images/${imageId}`),

  // Set an image as the primary image for a listing
  setPrimaryImage: (id, imageId) =>
    api.patch(`/equipment/${id}/images/${imageId}/primary`),

  // Update availability status
  updateStatus: (id, status) => api.patch(`/equipment/${id}/status`, { status }),

  // Delete listing
  deleteEquipment: (id) => api.delete(`/equipment/${id}`),
};
