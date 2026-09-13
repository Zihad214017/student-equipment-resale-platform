const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

/**
 * Buyer: Initiate payment for an accepted transaction
 */
const initiate = async (req, res, next) => {
  try {
    const result = await paymentService.initiatePayment(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Payment initiated successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Buyer / Admin: Verify payment with provider
 */
const verify = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment(
      req.user.id,
      req.user.role,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: 'Payment verification processed.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * View Single Payment Details
 */
const getById = async (req, res, next) => {
  try {
    const result = await paymentService.getPaymentById(
      req.user.id,
      req.user.role,
      req.params.id
    );
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * View Payment Details by Transaction ID
 */
const getByTransactionId = async (req, res, next) => {
  try {
    const result = await paymentService.getPaymentByTransactionId(
      req.user.id,
      req.user.role,
      req.params.transactionId
    );
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Buyer: Get My Payment History
 */
const getMyPayments = async (req, res, next) => {
  try {
    const result = await paymentService.getBuyerPayments(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data: result.payments,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: View All Platform Payments
 */
const adminGetAll = async (req, res, next) => {
  try {
    const result = await paymentService.adminGetAllPayments(req.query);
    return res.status(200).json({
      success: true,
      data: result.payments,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get Payment Metrics & Breakdown
 */
const adminGetStats = async (req, res, next) => {
  try {
    const result = await paymentService.adminGetPaymentStats();
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider Webhook / Redirect Callback Handler
 */
const handleCallback = async (req, res, next) => {
  try {
    const providerName = req.params.provider?.toUpperCase();
    const queryParams = { ...req.query, ...req.body };
    logger.info(`Received ${providerName} callback`, { queryParams });

    return res.status(200).json({
      success: true,
      message: `${providerName} callback acknowledged.`,
      data: queryParams,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiate,
  verify,
  getById,
  getByTransactionId,
  getMyPayments,
  adminGetAll,
  adminGetStats,
  handleCallback,
};
