const express = require('express');
const router = express.Router();
const purchaseRequestController = require('../controllers/purchaseRequestController');
const validate = require('../validators/validator');
const {
  createPurchaseRequestSchema,
  respondPurchaseRequestSchema,
} = require('../validators/purchaseRequestValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');

// All purchase request operations require authentication
router.use(authenticateJWT);

// 1. Buyer & Seller List Routes (must precede /:id)
router.get('/buyer', purchaseRequestController.getBuyerRequests);
router.get('/sent', purchaseRequestController.getBuyerRequests);
router.get('/seller', purchaseRequestController.getSellerRequests);
router.get('/received', purchaseRequestController.getSellerRequests);

// 2. Submit Purchase Request (Buyer)
router.post('/', validate(createPurchaseRequestSchema), purchaseRequestController.create);

// 3. View Specific Purchase Request (Buyer / Seller / Admin)
router.get('/:id', purchaseRequestController.getById);

// 4. Respond to Purchase Request (Seller: Accept / Reject)
router.patch('/:id/respond', validate(respondPurchaseRequestSchema), purchaseRequestController.respond);
router.patch('/:id/status', validate(respondPurchaseRequestSchema), purchaseRequestController.respond);

// 5. Cancel Purchase Request (Buyer)
router.patch('/:id/cancel', purchaseRequestController.cancel);
router.delete('/:id', purchaseRequestController.cancel);

module.exports = router;
