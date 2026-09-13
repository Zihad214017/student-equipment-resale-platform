import api from './client';

export const paymentApi = {
  // Initiate payment for an accepted transaction
  initiatePayment: (data) => api.post('/payments/initiate', data),

  // Verify payment with provider
  verifyPayment: (id, data = {}) => api.post(`/payments/${id}/verify`, data),

  // Get payment details by payment ID
  getPaymentById: (id) => api.get(`/payments/${id}`),

  // Get payment details by transaction ID
  getPaymentByTransactionId: (transactionId) => api.get(`/payments/transaction/${transactionId}`),

  // Buyer: Get my payment history
  getMyPayments: (params = {}) => api.get('/payments/my-payments', { params }),

  // Admin: View all platform payments
  adminGetAllPayments: (params = {}) => api.get('/payments/admin', { params }),

  // Admin: Get payment metrics & breakdown
  adminGetPaymentStats: () => api.get('/payments/admin/stats'),
};
