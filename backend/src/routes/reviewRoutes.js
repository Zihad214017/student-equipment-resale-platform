const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const validate = require('../validators/validator');
const { createReviewSchema } = require('../validators/reviewValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');

// 1. Public Review Inspection Endpoints
router.get('/seller/:sellerId', reviewController.getSellerReviews);
router.get('/equipment/:equipmentId', reviewController.getEquipmentReview);
router.get('/:id', reviewController.getById);

// 2. Submit Review (Authenticated Buyer of Completed Transaction)
router.post('/', authenticateJWT, validate(createReviewSchema), reviewController.create);

// 3. Delete Review (Reviewer or Admin)
router.delete('/:id', authenticateJWT, reviewController.remove);

module.exports = router;
