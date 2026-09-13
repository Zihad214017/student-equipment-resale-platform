import api from './client';

export const reviewApi = {
  // Submit review for completed transaction
  submitReview: (data) => api.post('/reviews', data),

  // Public seller reviews
  getSellerReviews: (sellerId, params = {}) => api.get(`/reviews/seller/${sellerId}`, { params }),

  // Equipment reviews
  getEquipmentReview: (equipmentId) => api.get(`/reviews/equipment/${equipmentId}`),

  // Single review by ID
  getReviewById: (id) => api.get(`/reviews/${id}`),

  // Delete review
  deleteReview: (id) => api.delete(`/reviews/${id}`),
};
