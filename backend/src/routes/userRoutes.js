const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const validate = require('../validators/validator');
const { updateProfileSchema, changePasswordSchema } = require('../validators/userValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');

// 1. Authenticated User Profile Endpoints
router.get('/profile', authenticateJWT, userController.getMyProfile);
router.get('/me', authenticateJWT, userController.getMyProfile);
router.put('/profile', authenticateJWT, validate(updateProfileSchema), userController.updateMyProfile);
router.put('/change-password', authenticateJWT, validate(changePasswordSchema), userController.changeMyPassword);

// 2. View Relevant Seller Profile & Equipment Information (Public / Authenticated)
router.get('/sellers/:id', userController.getSellerProfile);
router.get('/:id', userController.getSellerProfile);

module.exports = router;
