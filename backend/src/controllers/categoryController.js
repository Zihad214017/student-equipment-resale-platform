const categoryService = require('../services/categoryService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get all categories (public)
 * GET /api/v1/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const activeOnly = req.query.active === 'true';
    const categories = await categoryService.getAllCategories({ activeOnly });
    return ApiResponse.success(res, 'Categories retrieved successfully.', categories);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single category by ID or slug (public)
 * GET /api/v1/categories/:id
 */
const getCategory = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryByIdOrSlug(req.params.id);
    return ApiResponse.success(res, 'Category details retrieved successfully.', category);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create a new category
 * POST /api/v1/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const newCategory = await categoryService.createCategory(req.user.id, req.body);
    return ApiResponse.created(res, 'Category created successfully.', newCategory);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update an existing category
 * PUT /api/v1/categories/:id
 */
const updateCategory = async (req, res, next) => {
  try {
    const updated = await categoryService.updateCategory(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, 'Category updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete or Deactivate a category
 * DELETE /api/v1/categories/:id
 */
const deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(req.user.id, req.params.id);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
