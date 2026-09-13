const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const adminRoutes = require('./adminRoutes');
const categoryRoutes = require('./categoryRoutes');
const equipmentRoutes = require('./equipmentRoutes');
const purchaseRequestRoutes = require('./purchaseRequestRoutes');
const transactionRoutes = require('./transactionRoutes');
const notificationRoutes = require('./notificationRoutes');
const reviewRoutes = require('./reviewRoutes');
const paymentRoutes = require('./paymentRoutes');

// Root Health Check: GET /api/health
router.get('/health', healthController.getHealth);

// Version 1 API Routes: /api/v1/...
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/categories', categoryRoutes);
router.use('/v1/equipment', equipmentRoutes);
router.use('/v1/purchase-requests', purchaseRequestRoutes);
router.use('/v1/purchase_requests', purchaseRequestRoutes);
router.use('/v1/transactions', transactionRoutes);
router.use('/v1/notifications', notificationRoutes);
router.use('/v1/reviews', reviewRoutes);
router.use('/v1/payments', paymentRoutes);

// Root Aliases: /api/auth/..., /api/users/..., /api/admin/..., /api/categories/..., /api/equipment/..., /api/purchase-requests/..., /api/transactions/..., /api/notifications/..., /api/reviews/..., /api/payments/...
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/categories', categoryRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/purchase-requests', purchaseRequestRoutes);
router.use('/purchase_requests', purchaseRequestRoutes);
router.use('/transactions', transactionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
