const transactionService = require('../services/transactionService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get single transaction details
 * GET /api/v1/transactions/:id
 */
const getById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(
      req.user.id,
      req.user.role,
      req.params.id
    );
    return ApiResponse.success(res, 'Transaction details retrieved successfully.', transaction);
  } catch (error) {
    next(error);
  }
};

/**
 * View buyer purchase history
 * GET /api/v1/transactions/buyer or /my-purchases
 */
const getBuyerHistory = async (req, res, next) => {
  try {
    const result = await transactionService.getBuyerTransactions(req.user.id, req.query);
    return ApiResponse.success(
      res,
      'Purchase transactions retrieved successfully.',
      result.transactions,
      200,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * View seller sales history
 * GET /api/v1/transactions/seller or /my-sales
 */
const getSellerHistory = async (req, res, next) => {
  try {
    const result = await transactionService.getSellerTransactions(req.user.id, req.query);
    return ApiResponse.success(
      res,
      'Sales transactions retrieved successfully.',
      result.transactions,
      200,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update transaction status (Sold, Completed, Rejected, etc.)
 * PATCH /api/v1/transactions/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const updated = await transactionService.updateTransactionStatus(
      req.user.id,
      req.user.role,
      req.params.id,
      req.body
    );
    return ApiResponse.success(
      res,
      `Transaction status updated to ${updated.status} successfully.`,
      updated
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Monitor all platform transactions
 * GET /api/v1/admin/transactions
 */
const adminGetAll = async (req, res, next) => {
  try {
    const result = await transactionService.adminGetAllTransactions(req.query);
    return ApiResponse.success(
      res,
      'All platform transactions retrieved.',
      result.transactions,
      200,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getById,
  getBuyerHistory,
  getSellerHistory,
  updateStatus,
  adminGetAll,
};
