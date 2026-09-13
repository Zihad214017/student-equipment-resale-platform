import api from './client';

export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  getSellerProfile: (sellerId) => api.get(`/users/sellers/${sellerId}`),
};
