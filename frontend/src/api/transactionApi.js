import api from './client';

export const transactionApi = {
  // Buyer purchase history
  getBuyerTransactions: (params = {}) => api.get('/transactions/buyer', { params }),

  // Seller sales history
  getSellerTransactions: (params = {}) => api.get('/transactions/seller', { params }),

  // View single transaction
  getTransactionById: (id) => api.get(`/transactions/${id}`),

  // Update status (e.g. sold, completed, rejected)
  updateStatus: (id, data) => api.patch(`/transactions/${id}/status`, data),
};
