const db = require('../config/database');
const config = require('../config/env');
const { PAYMENT_METHODS, PAYMENT_STATUS, TRANSACTION_STATUS, NOTIFICATION_TYPES } = require('../config/constants');
const BkashProvider = require('./payment/bkashProvider');
const NagadProvider = require('./payment/nagadProvider');
const logger = require('../utils/logger');

// Initialize provider singletons
const bkashProvider = new BkashProvider(config.payment?.bkash || {});
const nagadProvider = new NagadProvider(config.payment?.nagad || {});

/**
 * Helper to get provider instance by payment method name
 */
const getProvider = (method) => {
  const normalized = (method || '').toUpperCase();
  if (normalized === PAYMENT_METHODS.BKASH) {
    return bkashProvider;
  }
  if (normalized === PAYMENT_METHODS.NAGAD) {
    return nagadProvider;
  }
  const error = new Error(`Unsupported payment method: "${method}". Supported methods: BKASH, NAGAD`);
  error.statusCode = 400;
  error.isOperational = true;
  throw error;
};

/**
 * Buyer: Initiate Payment for an eligible Accepted Transaction
 * @param {string} buyerId - Authenticated user UUID
 * @param {object} payload - { transaction_id, payment_method, customer_phone, callback_url }
 */
const initiatePayment = async (buyerId, payload) => {
  const { transaction_id, payment_method, customer_phone, callback_url } = payload;
  const normalizedMethod = (payment_method || '').toUpperCase();
  const provider = getProvider(normalizedMethod);

  // 1. Fetch and verify transaction & equipment record
  const txQuery = `
    SELECT 
      t.id AS transaction_id,
      t.purchase_request_id,
      t.equipment_id,
      t.buyer_id,
      t.seller_id,
      t.agreed_price,
      t.status AS transaction_status,
      e.title AS equipment_title,
      e.status AS equipment_status,
      e.admin_approval_status,
      buyer.full_name AS buyer_name,
      buyer.email AS buyer_email,
      seller.full_name AS seller_name
    FROM transactions t
    JOIN equipment_listings e ON t.equipment_id = e.id
    JOIN users buyer ON t.buyer_id = buyer.id
    JOIN users seller ON t.seller_id = seller.id
    WHERE t.id = $1
  `;
  const txResult = await db.query(txQuery, [transaction_id]);

  if (txResult.rows.length === 0) {
    const error = new Error('Transaction record not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const tx = txResult.rows[0];

  // 2. Security Guard: Buyer must own this transaction
  if (tx.buyer_id !== buyerId) {
    const error = new Error('Access denied. You can only initiate payment for your own purchase transactions.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // 3. Duplicate Payment Guard: Check if already successfully paid
  const existingSuccess = await db.query(
    "SELECT id, provider_transaction_id, paid_at FROM payments WHERE transaction_id = $1 AND payment_status = 'SUCCESS'",
    [transaction_id]
  );
  if (existingSuccess.rows.length > 0) {
    const error = new Error('This transaction has already been successfully paid for.');
    error.statusCode = 409;
    error.isOperational = true;
    throw error;
  }

  // 4. Status Guard: Must be in 'accepted' or eligible state
  if (tx.transaction_status !== 'accepted' && tx.transaction_status !== 'pending') {
    const error = new Error(`Transaction is in "${tx.transaction_status}" state and is not eligible for payment.`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 5. Trusted Amount Derivation: MUST come from db agreed_price
  const trustedAmount = parseFloat(tx.agreed_price);

  // 6. Create Initial Payment Record in database
  const insertPaymentQuery = `
    INSERT INTO payments (
      transaction_id,
      buyer_id,
      seller_id,
      equipment_id,
      amount,
      payment_method,
      payment_status,
      initiated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'INITIATED', CURRENT_TIMESTAMP)
    RETURNING id, transaction_id, buyer_id, seller_id, equipment_id, amount, payment_method, payment_status, initiated_at, created_at;
  `;
  const paymentInsertResult = await db.query(insertPaymentQuery, [
    transaction_id,
    buyerId,
    tx.seller_id,
    tx.equipment_id,
    trustedAmount,
    normalizedMethod,
  ]);
  const payment = paymentInsertResult.rows[0];

  // 7. Request payment initiation from provider
  let providerResponse;
  try {
    providerResponse = await provider.initiatePayment({
      paymentId: payment.id,
      amount: trustedAmount,
      transactionId: transaction_id,
      customerPhone: customer_phone,
      callbackUrl: callback_url,
    });
  } catch (providerErr) {
    // Record failed initiation state
    await db.query(
      "UPDATE payments SET payment_status = 'FAILED', failed_at = CURRENT_TIMESTAMP, provider_response = $1 WHERE id = $2",
      [JSON.stringify({ error: providerErr.message }), payment.id]
    );
    throw providerErr;
  }

  // 8. Update payment record with provider reference
  await db.query(
    'UPDATE payments SET provider_reference = $1, provider_response = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
    [providerResponse.providerReference, JSON.stringify(providerResponse.rawResponse || {}), payment.id]
  );

  logger.info('Payment initiated successfully', {
    paymentId: payment.id,
    transactionId: transaction_id,
    method: normalizedMethod,
    amount: trustedAmount,
  });

  return {
    payment_id: payment.id,
    transaction_id: transaction_id,
    equipment_title: tx.equipment_title,
    seller_name: tx.seller_name,
    amount: trustedAmount,
    payment_method: normalizedMethod,
    payment_status: 'INITIATED',
    provider_reference: providerResponse.providerReference,
    redirect_url: providerResponse.redirectUrl,
    payment_url: providerResponse.paymentUrl,
    initiated_at: payment.initiated_at,
  };
};

/**
 * Verify Payment Server-Side with Idempotency Protection
 * @param {string} userId - Authenticated user UUID
 * @param {string} userRole - 'student' | 'admin'
 * @param {string} paymentId - Payment UUID
 * @param {object} verifyData - { provider_transaction_id, provider_reference, ... }
 */
const verifyPayment = async (userId, userRole, paymentId, verifyData = {}) => {
  // 1. Fetch Payment Record with Full Context
  const paymentQuery = `
    SELECT 
      p.id,
      p.transaction_id,
      p.buyer_id,
      p.seller_id,
      p.equipment_id,
      p.amount,
      p.payment_method,
      p.payment_status,
      p.provider_transaction_id,
      p.provider_reference,
      p.paid_at,
      p.failed_at,
      p.created_at,
      t.status AS transaction_status,
      e.title AS equipment_title,
      buyer.full_name AS buyer_name,
      seller.full_name AS seller_name
    FROM payments p
    JOIN transactions t ON p.transaction_id = t.id
    JOIN equipment_listings e ON p.equipment_id = e.id
    JOIN users buyer ON p.buyer_id = buyer.id
    JOIN users seller ON p.seller_id = seller.id
    WHERE p.id = $1
  `;
  const paymentRes = await db.query(paymentQuery, [paymentId]);

  if (paymentRes.rows.length === 0) {
    const error = new Error('Payment record not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const payment = paymentRes.rows[0];

  // 2. Authorization Guard: Only the buyer or admin can verify payment
  if (payment.buyer_id !== userId && userRole !== 'admin') {
    const error = new Error('Access denied. You are not authorized to verify this payment.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // 3. Idempotency Guard: If already marked SUCCESS, return existing record
  if (payment.payment_status === 'SUCCESS') {
    logger.info('Idempotent payment verification hit', { paymentId, status: 'SUCCESS' });
    return getPaymentById(userId, userRole, paymentId);
  }

  const provider = getProvider(payment.payment_method);

  // 4. Perform Provider Verification
  let verificationResult;
  try {
    verificationResult = await provider.verifyPayment({
      paymentId: payment.id,
      providerTransactionId: verifyData.provider_transaction_id,
      providerReference: verifyData.provider_reference || payment.provider_reference,
      queryParams: verifyData,
    });
  } catch (providerError) {
    logger.error('Provider verification call failed', { error: providerError.message, paymentId });
    await db.query(
      "UPDATE payments SET payment_status = 'FAILED', failed_at = CURRENT_TIMESTAMP, provider_response = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [JSON.stringify({ error: providerError.message }), paymentId]
    );
    throw providerError;
  }

  const isSuccess = verificationResult && verificationResult.isSuccessful;
  const finalTrxId = verificationResult?.providerTransactionId || verifyData.provider_transaction_id || `TRX-${Date.now()}`;

  if (isSuccess) {
    // 5. Atomic PostgreSQL Update: Payment -> SUCCESS, Transaction -> sold, Equipment -> sold
    await db.query(
      `UPDATE payments 
       SET 
         payment_status = 'SUCCESS',
         provider_transaction_id = $1,
         paid_at = CURRENT_TIMESTAMP,
         provider_response = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [finalTrxId, JSON.stringify(verificationResult.rawResponse || {}), paymentId]
    );

    // Update Transaction status to 'sold' (paid, awaiting physical handover confirmation)
    await db.query(
      `UPDATE transactions 
       SET 
         status = 'sold',
         notes = COALESCE(notes, '') || ' [Paid via ' || $1 || ' | TrxID: ' || $2 || ']',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [payment.payment_method, finalTrxId, payment.transaction_id]
    );

    // Update Equipment Listing status to 'sold'
    await db.query(
      "UPDATE equipment_listings SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [payment.equipment_id]
    );

    // 6. Dispatch Notifications to Buyer and Seller
    try {
      // Buyer Notification
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, FALSE, $5, 'payment')`,
        [
          payment.buyer_id,
          'Payment Successful!',
          `Your payment of $${parseFloat(payment.amount).toFixed(2)} via ${payment.payment_method} for "${payment.equipment_title}" is confirmed (TrxID: ${finalTrxId}). Please coordinate physical handover with ${payment.seller_name}.`,
          NOTIFICATION_TYPES.PAYMENT_UPDATE || 'payment_update',
          paymentId,
        ]
      );

      // Seller Notification
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, FALSE, $5, 'payment')`,
        [
          payment.seller_id,
          'Payment Received!',
          `${payment.buyer_name} has paid $${parseFloat(payment.amount).toFixed(2)} via ${payment.payment_method} for "${payment.equipment_title}" (TrxID: ${finalTrxId}). The item is now marked sold.`,
          NOTIFICATION_TYPES.PAYMENT_UPDATE || 'payment_update',
          paymentId,
        ]
      );
    } catch (notifErr) {
      logger.warn('Failed to insert payment notifications', { error: notifErr.message });
    }

    logger.info('Payment verified and confirmed', { paymentId, transactionId: payment.transaction_id, finalTrxId });
  } else {
    // Record Payment Failure
    await db.query(
      `UPDATE payments 
       SET 
         payment_status = 'FAILED',
         failed_at = CURRENT_TIMESTAMP,
         provider_response = $1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(verificationResult?.rawResponse || {}), paymentId]
    );

    // Notify Buyer of Failure
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, FALSE, $5, 'payment')`,
        [
          payment.buyer_id,
          'Payment Verification Failed',
          `Your payment attempt of $${parseFloat(payment.amount).toFixed(2)} via ${payment.payment_method} could not be verified by the provider.`,
          NOTIFICATION_TYPES.PAYMENT_UPDATE || 'payment_update',
          paymentId,
        ]
      );
    } catch (notifErr) {
      logger.warn('Failed to insert payment failure notification', { error: notifErr.message });
    }
  }

  return getPaymentById(userId, userRole, paymentId);
};

/**
 * Get single payment details with authorization guard
 */
const getPaymentById = async (userId, userRole, paymentId) => {
  const query = `
    SELECT 
      p.id,
      p.transaction_id,
      p.buyer_id,
      p.seller_id,
      p.equipment_id,
      p.amount,
      p.payment_method,
      p.payment_status,
      p.provider_transaction_id,
      p.provider_reference,
      p.initiated_at,
      p.paid_at,
      p.failed_at,
      p.created_at,
      p.updated_at,
      e.title AS equipment_title,
      e.condition AS equipment_condition,
      (
        SELECT image_url 
        FROM equipment_images 
        WHERE equipment_id = e.id AND is_primary = TRUE 
        LIMIT 1
      ) AS equipment_primary_image,
      c.name AS category_name,
      buyer.full_name AS buyer_name,
      buyer.email AS buyer_email,
      seller.full_name AS seller_name,
      seller.email AS seller_email,
      t.status AS transaction_status
    FROM payments p
    JOIN transactions t ON p.transaction_id = t.id
    JOIN equipment_listings e ON p.equipment_id = e.id
    JOIN categories c ON e.category_id = c.id
    JOIN users buyer ON p.buyer_id = buyer.id
    JOIN users seller ON p.seller_id = seller.id
    WHERE p.id = $1
  `;
  const result = await db.query(query, [paymentId]);

  if (result.rows.length === 0) {
    const error = new Error('Payment record not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const p = result.rows[0];

  // Authorization Check: Must be buyer, seller, or admin
  const isBuyer = p.buyer_id === userId;
  const isSeller = p.seller_id === userId;
  const isAdmin = userRole === 'admin';

  if (!isBuyer && !isSeller && !isAdmin) {
    const error = new Error('Access denied. You are not authorized to view this payment record.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  return {
    ...p,
    amount: parseFloat(p.amount),
  };
};

/**
 * Get payment record for a given transaction ID
 */
const getPaymentByTransactionId = async (userId, userRole, transactionId) => {
  const query = `
    SELECT 
      p.id,
      p.transaction_id,
      p.buyer_id,
      p.seller_id,
      p.equipment_id,
      p.amount,
      p.payment_method,
      p.payment_status,
      p.provider_transaction_id,
      p.provider_reference,
      p.initiated_at,
      p.paid_at,
      p.failed_at,
      p.created_at
    FROM payments p
    WHERE p.transaction_id = $1
    ORDER BY p.created_at DESC
    LIMIT 1
  `;
  const result = await db.query(query, [transactionId]);
  if (result.rows.length === 0) {
    return null;
  }

  const p = result.rows[0];
  const isBuyer = p.buyer_id === userId;
  const isSeller = p.seller_id === userId;
  const isAdmin = userRole === 'admin';

  if (!isBuyer && !isSeller && !isAdmin) {
    const error = new Error('Access denied. You are not authorized to view this payment.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  return {
    ...p,
    amount: parseFloat(p.amount),
  };
};

/**
 * Buyer: View own payment history
 */
const getBuyerPayments = async (buyerId, filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const conditions = ['p.buyer_id = $1'];
  const params = [buyerId];
  let paramIdx = 2;

  if (filters.status && filters.status !== 'all') {
    conditions.push(`p.payment_status = $${paramIdx}`);
    params.push(filters.status.toUpperCase());
    paramIdx++;
  }

  if (filters.method && filters.method !== 'all') {
    conditions.push(`p.payment_method = $${paramIdx}`);
    params.push(filters.method.toUpperCase());
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await db.query(
    `SELECT COUNT(p.id) AS total FROM payments p ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      p.id,
      p.transaction_id,
      p.equipment_id,
      p.amount,
      p.payment_method,
      p.payment_status,
      p.provider_transaction_id,
      p.paid_at,
      p.created_at,
      e.title AS equipment_title,
      seller.full_name AS seller_name
    FROM payments p
    JOIN equipment_listings e ON p.equipment_id = e.id
    JOIN users seller ON p.seller_id = seller.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  const result = await db.query(query, queryParams);

  return {
    payments: result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount),
    })),
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Admin: Monitor all platform payments
 */
const adminGetAllPayments = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 15));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (filters.status && filters.status !== 'all') {
    conditions.push(`p.payment_status = $${paramIdx}`);
    params.push(filters.status.toUpperCase());
    paramIdx++;
  }

  if (filters.method && filters.method !== 'all') {
    conditions.push(`p.payment_method = $${paramIdx}`);
    params.push(filters.method.toUpperCase());
    paramIdx++;
  }

  if (filters.search) {
    conditions.push(`(e.title ILIKE $${paramIdx} OR buyer.full_name ILIKE $${paramIdx} OR p.provider_transaction_id ILIKE $${paramIdx})`);
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `SELECT COUNT(p.id) AS total 
     FROM payments p
     JOIN equipment_listings e ON p.equipment_id = e.id
     JOIN users buyer ON p.buyer_id = buyer.id
     ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      p.id,
      p.transaction_id,
      p.equipment_id,
      p.amount,
      p.payment_method,
      p.payment_status,
      p.provider_transaction_id,
      p.provider_reference,
      p.initiated_at,
      p.paid_at,
      p.failed_at,
      p.created_at,
      e.title AS equipment_title,
      buyer.id AS buyer_id,
      buyer.full_name AS buyer_name,
      buyer.email AS buyer_email,
      seller.id AS seller_id,
      seller.full_name AS seller_name,
      seller.email AS seller_email
    FROM payments p
    JOIN equipment_listings e ON p.equipment_id = e.id
    JOIN users buyer ON p.buyer_id = buyer.id
    JOIN users seller ON p.seller_id = seller.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  const result = await db.query(query, queryParams);

  return {
    payments: result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount),
    })),
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Admin: Get aggregated payment metrics and breakdown
 */
const adminGetPaymentStats = async () => {
  const statsQuery = `
    SELECT 
      COUNT(id) AS total_payments,
      COALESCE(SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS total_volume,
      COUNT(CASE WHEN payment_status = 'SUCCESS' THEN 1 END) AS successful_payments,
      COUNT(CASE WHEN payment_status = 'INITIATED' OR payment_status = 'PENDING' THEN 1 END) AS pending_payments,
      COUNT(CASE WHEN payment_status = 'FAILED' THEN 1 END) AS failed_payments,
      COUNT(CASE WHEN payment_method = 'BKASH' AND payment_status = 'SUCCESS' THEN 1 END) AS bkash_success_count,
      COALESCE(SUM(CASE WHEN payment_method = 'BKASH' AND payment_status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS bkash_volume,
      COUNT(CASE WHEN payment_method = 'NAGAD' AND payment_status = 'SUCCESS' THEN 1 END) AS nagad_success_count,
      COALESCE(SUM(CASE WHEN payment_method = 'NAGAD' AND payment_status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS nagad_volume
    FROM payments
  `;
  const result = await db.query(statsQuery);
  const row = result.rows[0];

  const totalPayments = parseInt(row.total_payments, 10);
  const successfulPayments = parseInt(row.successful_payments, 10);

  return {
    total_payments: totalPayments,
    total_volume: parseFloat(row.total_volume),
    successful_payments: successfulPayments,
    pending_payments: parseInt(row.pending_payments, 10),
    failed_payments: parseInt(row.failed_payments, 10),
    success_rate_percent: totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100) : 0,
    breakdown: {
      bkash: {
        count: parseInt(row.bkash_success_count, 10),
        volume: parseFloat(row.bkash_volume),
      },
      nagad: {
        count: parseInt(row.nagad_success_count, 10),
        volume: parseFloat(row.nagad_volume),
      },
    },
  };
};

module.exports = {
  initiatePayment,
  verifyPayment,
  getPaymentById,
  getPaymentByTransactionId,
  getBuyerPayments,
  adminGetAllPayments,
  adminGetPaymentStats,
};
