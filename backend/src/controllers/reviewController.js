const reviewService = require('../services/reviewService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Submit review for completed transaction
 * POST /api/v1/reviews
 */
const create = async (req, res, next) => {
  try {
    const newReview = await reviewService.createReview(req.user.id, req.body);
    return ApiResponse.created(res, 'Review submitted successfully.', newReview);
  } catch (error) {
    next(error);
  }
};

/**
 * Get seller reviews and aggregated rating summary
 * GET /api/v1/reviews/seller/:sellerId
 */
const getSellerReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getSellerReviews(req.params.sellerId, req.query);
    return ApiResponse.success(
      res,
      'Seller reviews retrieved successfully.',
      result.reviews,
      200,
      {
        ...result.pagination,
        rating_summary: result.rating_summary,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get review for equipment listing
 * GET /api/v1/reviews/equipment/:equipmentId
 */
const getEquipmentReview = async (req, res, next) => {
  try {
    const review = await reviewService.getEquipmentReview(req.params.equipmentId);
    if (!review) {
      return ApiResponse.success(res, 'No review found for this equipment.', null);
    }
    return ApiResponse.success(res, 'Equipment review retrieved successfully.', review);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single review by ID
 * GET /api/v1/reviews/:id
 */
const getById = async (req, res, next) => {
  try {
    const review = await reviewService.getReviewById(req.params.id);
    return ApiResponse.success(res, 'Review retrieved successfully.', review);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a review (Reviewer or Admin)
 * DELETE /api/v1/reviews/:id
 */
const remove = async (req, res, next) => {
  try {
    const result = await reviewService.deleteReview(req.user.id, req.user.role, req.params.id);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getSellerReviews,
  getEquipmentReview,
  getById,
  remove,
};
