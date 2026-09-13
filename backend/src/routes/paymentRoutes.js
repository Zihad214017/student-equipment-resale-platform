const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const validate = require('../validators/validator');
const {
  initiatePaymentSchema,
  verifyPaymentSchema,
} = require('../validators/paymentValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// Public / Provider Webhook Callback Routes
router.all('/callback/:provider', paymentController.handleCallback);

// All other payment routes require JWT authentication
router.use(authenticateJWT);

// Admin Payment Monitoring Routes (must precede /:id)
router.get('/admin/stats', requireAdmin, paymentController.adminGetStats);
router.get('/admin', requireAdmin, paymentController.adminGetAll);

// Buyer Payment History
router.get('/my-payments', paymentController.getMyPayments);

// Get Payment Details by Transaction ID
router.get('/transaction/:transactionId', paymentController.getByTransactionId);

// Initiate Payment
router.post('/initiate', validate(initiatePaymentSchema), paymentController.initiate);

// Verify Payment
router.post('/:id/verify', validate(verifyPaymentSchema), paymentController.verify);

// View Payment Details by Payment ID
router.get('/:id', paymentController.getById);

module.exports = router;
