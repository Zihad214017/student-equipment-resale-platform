const purchaseRequestService = require('../services/purchaseRequestService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Submit purchase request (Buyer)
 * POST /api/v1/purchase-requests
 */
const create = async (req, res, next) => {
  try {
    const newRequest = await purchaseRequestService.createRequest(req.user.id, req.body);
    return ApiResponse.created(res, 'Purchase request submitted successfully.', newRequest);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single request details by ID
 * GET /api/v1/purchase-requests/:id
 */
const getById = async (req, res, next) => {
  try {
    const request = await purchaseRequestService.getRequestById(req.user.id, req.user.role, req.params.id);
    return ApiResponse.success(res, 'Purchase request retrieved successfully.', request);
  } catch (error) {
    next(error);
  }
};

/**
 * View sent purchase requests (Buyer)
 * GET /api/v1/purchase-requests/buyer or /sent
 */
const getBuyerRequests = async (req, res, next) => {
  try {
    const result = await purchaseRequestService.getBuyerRequests(req.user.id, req.query);
    return ApiResponse.success(
      res,
      'Sent purchase requests retrieved successfully.',
      result.requests,
      200,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * View received purchase requests (Seller)
 * GET /api/v1/purchase-requests/seller or /received
 */
const getSellerRequests = async (req, res, next) => {
  try {
    const result = await purchaseRequestService.getSellerRequests(req.user.id, req.query);
    return ApiResponse.success(
      res,
      'Received purchase requests retrieved successfully.',
      result.requests,
      200,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Accept or Reject purchase request (Seller)
 * PATCH /api/v1/purchase-requests/:id/respond
 */
const respond = async (req, res, next) => {
  try {
    const updated = await purchaseRequestService.respondToRequest(
      req.user.id,
      req.user.role,
      req.params.id,
      req.body
    );
    return ApiResponse.success(res, `Purchase request ${req.body.status} successfully.`, updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel pending purchase request (Buyer)
 * PATCH /api/v1/purchase-requests/:id/cancel
 */
const cancel = async (req, res, next) => {
  try {
    const result = await purchaseRequestService.cancelRequest(req.user.id, req.params.id);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getById,
  getBuyerRequests,
  getSellerRequests,
  respond,
  cancel,
};
