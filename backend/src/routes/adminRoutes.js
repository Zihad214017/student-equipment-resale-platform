const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const equipmentController = require('../controllers/equipmentController');
const categoryController = require('../controllers/categoryController');
const transactionController = require('../controllers/transactionController');
const validate = require('../validators/validator');
const { toggleUserStatusSchema, adminUpdateUserSchema, adminCreateUserSchema } = require('../validators/userValidator');
const { adminApprovalSchema, updateEquipmentStatusSchema } = require('../validators/equipmentValidator');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidator');
const { updateTransactionStatusSchema } = require('../validators/transactionValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All Admin endpoints strictly require valid JWT and Admin role
router.use(authenticateJWT, requireAdmin);

// 1. Dashboard & Reports Statistics Routes
router.get('/reports', adminController.getPlatformStatistics);
router.get('/dashboard', adminController.getPlatformStatistics);
router.get('/statistics', adminController.getPlatformStatistics);

// 2. User Management Routes
router.get('/users', adminController.getUsers);
router.post('/users', validate(adminCreateUserSchema), adminController.createUser);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/toggle-status', validate(toggleUserStatusSchema), adminController.toggleUserStatus);
router.put('/users/:id', validate(adminUpdateUserSchema), adminController.updateUser);

// 3. Equipment Moderation & Management Routes
router.get('/equipment', equipmentController.adminGetListings);
router.get('/equipment/:id', equipmentController.getDetails);
router.patch('/equipment/:id/approval', validate(adminApprovalSchema), equipmentController.adminModerate);
router.patch('/equipment/:id/status', validate(updateEquipmentStatusSchema), equipmentController.updateStatus);
router.delete('/equipment/:id', equipmentController.remove);

// 4. Category Management Routes
router.get('/categories', categoryController.getCategories);
router.get('/categories/:id', categoryController.getCategory);
router.post('/categories', validate(createCategorySchema), categoryController.createCategory);
router.put('/categories/:id', validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// 5. Transaction Monitoring Routes
router.get('/transactions', transactionController.adminGetAll);
router.get('/transactions/:id', transactionController.getById);
router.patch('/transactions/:id/status', validate(updateTransactionStatusSchema), transactionController.updateStatus);

module.exports = router;
