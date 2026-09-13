const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const validate = require('../validators/validator');
const {
  updateTransactionStatusSchema,
} = require('../validators/transactionValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');

// All transaction operations require authentication
router.use(authenticateJWT);

// 1. Buyer & Seller History Routes (must precede /:id)
router.get('/buyer', transactionController.getBuyerHistory);
router.get('/my-purchases', transactionController.getBuyerHistory);
router.get('/seller', transactionController.getSellerHistory);
router.get('/my-sales', transactionController.getSellerHistory);

// 2. View Single Transaction Details (Buyer / Seller / Admin)
router.get('/:id', transactionController.getById);

// 3. Update Transaction Status (Accept, Sold, Completed, Rejected)
router.patch(
  '/:id/status',
  validate(updateTransactionStatusSchema),
  transactionController.updateStatus
);

module.exports = router;
