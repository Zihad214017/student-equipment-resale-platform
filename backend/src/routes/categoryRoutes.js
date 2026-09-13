const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const validate = require('../validators/validator');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// Public Category Endpoints
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);

// Protected Admin Category Endpoints
router.post(
  '/',
  authenticateJWT,
  requireAdmin,
  validate(createCategorySchema),
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticateJWT,
  requireAdmin,
  validate(updateCategorySchema),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticateJWT,
  requireAdmin,
  categoryController.deleteCategory
);

module.exports = router;
