const db = require('../config/database');
const { TRANSACTION_STATUS, NOTIFICATION_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

// Allowed status transition matrix
const ALLOWED_TRANSITIONS = {
  [TRANSACTION_STATUS.PENDING]: [TRANSACTION_STATUS.ACCEPTED, TRANSACTION_STATUS.REJECTED],
  [TRANSACTION_STATUS.ACCEPTED]: [TRANSACTION_STATUS.SOLD, TRANSACTION_STATUS.REJECTED],
  [TRANSACTION_STATUS.SOLD]: [TRANSACTION_STATUS.COMPLETED, TRANSACTION_STATUS.REJECTED],
  [TRANSACTION_STATUS.COMPLETED]: [], // Terminal state
  [TRANSACTION_STATUS.REJECTED]: [], // Terminal state
};

/**
 * Get single transaction details by ID with authorization guard
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} transactionId 
 */
const getTransactionById = async (userId, userRole, transactionId) => {
  const query = `
    SELECT 
      t.id,
      t.purchase_request_id,
      t.equipment_id,
      t.buyer_id,
      t.seller_id,
      t.agreed_price,
      t.status,
      t.meeting_location,
      t.notes,
      t.completed_at,
      t.created_at,
      t.updated_at,
      e.title AS equipment_title,
      e.price AS equipment_original_price,
      e.condition AS equipment_condition,
      e.status AS equipment_status,
      (
        SELECT image_url 
        FROM equipment_images 
        WHERE equipment_id = e.id AND is_primary = TRUE 
        LIMIT 1
      ) AS equipment_primary_image,
      c.name AS category_name,
      c.slug AS category_slug,
      buyer.full_name AS buyer_name,
      buyer.email AS buyer_email,
      buyer.department AS buyer_department,
      buyer.avatar_url AS buyer_avatar,
      seller.full_name AS seller_name,
      seller.email AS seller_email,
      seller.department AS seller_department,
      seller.avatar_url AS seller_avatar,
      (
        SELECT id FROM reviews WHERE transaction_id = t.id LIMIT 1
      ) AS review_id,
      (
        SELECT id FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS payment_id,
      (
        SELECT payment_status FROM payments WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      ) AS payment_status,
      (
        SELECT payment_method FROM payments WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      ) AS payment_method,
      (
        SELECT provider_transaction_id FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS provider_transaction_id,
      (
        SELECT paid_at FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS paid_at
    FROM transactions t
    JOIN equipment_listings e ON t.equipment_id = e.id
    JOIN categories c ON e.category_id = c.id
    JOIN users buyer ON t.buyer_id = buyer.id
    JOIN users seller ON t.seller_id = seller.id
    WHERE t.id = $1
  `;

  const result = await db.query(query, [transactionId]);
  if (result.rows.length === 0) {
    const error = new Error('Transaction record not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const tx = result.rows[0];

  // Authorization Check: Must be buyer, seller, or admin
  const isBuyer = tx.buyer_id === userId;
  const isSeller = tx.seller_id === userId;
  const isAdmin = userRole === 'admin';

  if (!isBuyer && !isSeller && !isAdmin) {
    const error = new Error('Access denied. You are not authorized to view this transaction.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  return {
    ...tx,
    agreed_price: parseFloat(tx.agreed_price),
    equipment_original_price: parseFloat(tx.equipment_original_price),
    has_review: !!tx.review_id,
  };
};

/**
 * Buyer: View own purchase transaction history
 * @param {string} buyerId 
 * @param {object} filters 
 */
const getBuyerTransactions = async (buyerId, filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const conditions = ['t.buyer_id = $1'];
  const params = [buyerId];
  let paramIdx = 2;

  if (filters.status && filters.status !== 'all') {
    conditions.push(`t.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await db.query(
    `SELECT COUNT(id) AS total FROM transactions t ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      t.id,
      t.purchase_request_id,
      t.equipment_id,
      t.seller_id,
      t.agreed_price,
      t.status,
      t.meeting_location,
      t.notes,
      t.completed_at,
      t.created_at,
      t.updated_at,
      e.title AS equipment_title,
      e.condition AS equipment_condition,
      (
        SELECT image_url 
        FROM equipment_images 
        WHERE equipment_id = e.id AND is_primary = TRUE 
        LIMIT 1
      ) AS equipment_primary_image,
      c.name AS category_name,
      seller.full_name AS seller_name,
      seller.department AS seller_department,
      seller.avatar_url AS seller_avatar,
      (
        SELECT id FROM reviews WHERE transaction_id = t.id LIMIT 1
      ) AS review_id,
      (
        SELECT id FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS payment_id,
      (
        SELECT payment_status FROM payments WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      ) AS payment_status,
      (
        SELECT payment_method FROM payments WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      ) AS payment_method,
      (
        SELECT provider_transaction_id FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS provider_transaction_id,
      (
        SELECT paid_at FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS paid_at
    FROM transactions t
    JOIN equipment_listings e ON t.equipment_id = e.id
    JOIN categories c ON e.category_id = c.id
    JOIN users seller ON t.seller_id = seller.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(query, queryParams);

  return {
    transactions: result.rows.map(row => ({
      ...row,
      agreed_price: parseFloat(row.agreed_price),
      has_review: !!row.review_id,
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
 * Seller: View own sales transaction history
 * @param {string} sellerId 
 * @param {object} filters 
 */
const getSellerTransactions = async (sellerId, filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const conditions = ['t.seller_id = $1'];
  const params = [sellerId];
  let paramIdx = 2;

  if (filters.status && filters.status !== 'all') {
    conditions.push(`t.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await db.query(
    `SELECT COUNT(id) AS total FROM transactions t ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      t.id,
      t.purchase_request_id,
      t.equipment_id,
      t.buyer_id,
      t.agreed_price,
      t.status,
      t.meeting_location,
      t.notes,
      t.completed_at,
      t.created_at,
      t.updated_at,
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
      buyer.department AS buyer_department,
      buyer.avatar_url AS buyer_avatar,
      (
        SELECT id FROM reviews WHERE transaction_id = t.id LIMIT 1
      ) AS review_id,
      (
        SELECT id FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS payment_id,
      (
        SELECT payment_status FROM payments WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      ) AS payment_status,
      (
        SELECT payment_method FROM payments WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      ) AS payment_method,
      (
        SELECT provider_transaction_id FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS provider_transaction_id,
      (
        SELECT paid_at FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS paid_at
    FROM transactions t
    JOIN equipment_listings e ON t.equipment_id = e.id
    JOIN categories c ON e.category_id = c.id
    JOIN users buyer ON t.buyer_id = buyer.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(query, queryParams);

  return {
    transactions: result.rows.map(row => ({
      ...row,
      agreed_price: parseFloat(row.agreed_price),
      has_review: !!row.review_id,
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
 * Admin: Monitor all platform transactions
 * @param {object} filters 
 */
const adminGetAllTransactions = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 15));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (filters.status && filters.status !== 'all') {
    conditions.push(`t.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  if (filters.search) {
    conditions.push(`(e.title ILIKE $${paramIdx} OR buyer.full_name ILIKE $${paramIdx} OR seller.full_name ILIKE $${paramIdx})`);
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `SELECT COUNT(t.id) AS total 
     FROM transactions t
     JOIN equipment_listings e ON t.equipment_id = e.id
     JOIN users buyer ON t.buyer_id = buyer.id
     JOIN users seller ON t.seller_id = seller.id
     ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      t.id,
      t.purchase_request_id,
      t.equipment_id,
      t.agreed_price,
      t.status,
      t.meeting_location,
      t.notes,
      t.completed_at,
      t.created_at,
      t.updated_at,
      e.title AS equipment_title,
      c.name AS category_name,
      buyer.id AS buyer_id,
      buyer.full_name AS buyer_name,
      buyer.email AS buyer_email,
      seller.id AS seller_id,
      seller.full_name AS seller_name,
      seller.email AS seller_email,
      (
        SELECT id FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS payment_id,
      (
        SELECT payment_status FROM payments WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      ) AS payment_status,
      (
        SELECT payment_method FROM payments WHERE transaction_id = t.id ORDER BY created_at DESC LIMIT 1
      ) AS payment_method,
      (
        SELECT provider_transaction_id FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS provider_transaction_id,
      (
        SELECT paid_at FROM payments WHERE transaction_id = t.id AND payment_status = 'SUCCESS' LIMIT 1
      ) AS paid_at
    FROM transactions t
    JOIN equipment_listings e ON t.equipment_id = e.id
    JOIN categories c ON e.category_id = c.id
    JOIN users buyer ON t.buyer_id = buyer.id
    JOIN users seller ON t.seller_id = seller.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(query, queryParams);

  return {
    transactions: result.rows.map(row => ({
      ...row,
      agreed_price: parseFloat(row.agreed_price),
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
 * Update transaction status with transition validation and equipment synchronization
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} transactionId 
 * @param {object} updateData 
 */
const updateTransactionStatus = async (userId, userRole, transactionId, updateData) => {
  const { status: targetStatus, meeting_location, notes } = updateData;

  // 1. Fetch existing transaction record
  const fetchQuery = `
    SELECT 
      t.id,
      t.equipment_id,
      t.buyer_id,
      t.seller_id,
      t.status,
      t.agreed_price,
      e.title AS equipment_title,
      seller.full_name AS seller_name,
      buyer.full_name AS buyer_name
    FROM transactions t
    JOIN equipment_listings e ON t.equipment_id = e.id
    JOIN users seller ON t.seller_id = seller.id
    JOIN users buyer ON t.buyer_id = buyer.id
    WHERE t.id = $1
  `;
  const result = await db.query(fetchQuery, [transactionId]);

  if (result.rows.length === 0) {
    const error = new Error('Transaction record not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const tx = result.rows[0];
  const currentStatus = tx.status;
  const isBuyer = tx.buyer_id === userId;
  const isSeller = tx.seller_id === userId;
  const isAdmin = userRole === 'admin';

  // 2. Authorization Check
  if (!isBuyer && !isSeller && !isAdmin) {
    const error = new Error('Access denied. You are not authorized to update this transaction.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // 3. Prevent duplicate same-status updates
  if (currentStatus === targetStatus) {
    // If status is identical, update metadata (meeting location/notes) without error
    if (meeting_location !== undefined || notes !== undefined) {
      await db.query(
        `UPDATE transactions 
         SET 
           meeting_location = COALESCE($1, meeting_location),
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [meeting_location || null, notes || null, transactionId]
      );
    }
    return getTransactionById(userId, userRole, transactionId);
  }

  // 4. Validate Status Transition Rule
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!isAdmin && !allowedNext.includes(targetStatus)) {
    const error = new Error(
      `Invalid status transition: Cannot change transaction from "${currentStatus}" to "${targetStatus}". Allowed next statuses: [${allowedNext.join(', ')}]`
    );
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 5. Role-Specific Action Guard:
  // - Only Seller or Admin can mark as 'sold'
  if (targetStatus === TRANSACTION_STATUS.SOLD && !isSeller && !isAdmin) {
    const error = new Error('Only the seller can mark an item as sold.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // - Only Buyer or Admin can mark as 'completed'
  if (targetStatus === TRANSACTION_STATUS.COMPLETED && !isBuyer && !isAdmin) {
    const error = new Error('Only the buyer can confirm delivery and mark the transaction as completed.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // 6. Execute Transaction Status Update
  const completedAtValue = targetStatus === TRANSACTION_STATUS.COMPLETED ? 'CURRENT_TIMESTAMP' : 'completed_at';

  await db.query(
    `UPDATE transactions 
     SET 
       status = $1,
       meeting_location = COALESCE($2, meeting_location),
       notes = COALESCE($3, notes),
       completed_at = ${targetStatus === TRANSACTION_STATUS.COMPLETED ? 'CURRENT_TIMESTAMP' : 'completed_at'},
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [targetStatus, meeting_location || null, notes || null, transactionId]
  );

  // 7. Synchronize Equipment Listing Status
  if (targetStatus === TRANSACTION_STATUS.SOLD) {
    await db.query(
      "UPDATE equipment_listings SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [tx.equipment_id]
    );

    // Notify Buyer
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, FALSE, $5, 'transaction')`,
        [
          tx.buyer_id,
          'Item Marked as Sold',
          `${tx.seller_name} marked "${tx.equipment_title}" as sold to you. Please confirm receipt to complete the transaction.`,
          NOTIFICATION_TYPES.TRANSACTION_UPDATE || 'transaction_update',
          transactionId,
        ]
      );
    } catch (nErr) {
      logger.warn('Failed to insert sold notification', { error: nErr.message });
    }
  } else if (targetStatus === TRANSACTION_STATUS.COMPLETED) {
    await db.query(
      "UPDATE equipment_listings SET status = 'sold', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [tx.equipment_id]
    );

    // Notify Seller
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, FALSE, $5, 'transaction')`,
        [
          tx.seller_id,
          'Transaction Completed!',
          `${tx.buyer_name} confirmed receipt of "${tx.equipment_title}". The transaction is now complete.`,
          NOTIFICATION_TYPES.TRANSACTION_UPDATE || 'transaction_update',
          transactionId,
        ]
      );
    } catch (nErr) {
      logger.warn('Failed to insert completed notification', { error: nErr.message });
    }
  } else if (targetStatus === TRANSACTION_STATUS.REJECTED) {
    // If rejected, check if another active transaction exists for this equipment. If not, reset equipment to available
    const activeCheck = await db.query(
      `SELECT id FROM transactions 
       WHERE equipment_id = $1 AND id <> $2 AND status IN ('accepted', 'sold', 'completed')`,
      [tx.equipment_id, transactionId]
    );

    if (activeCheck.rows.length === 0) {
      await db.query(
        "UPDATE equipment_listings SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [tx.equipment_id]
      );
    }

    // Notify Counterpart
    const targetUserId = isBuyer ? tx.seller_id : tx.buyer_id;
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, FALSE, $5, 'transaction')`,
        [
          targetUserId,
          'Transaction Cancelled',
          `The transaction for "${tx.equipment_title}" was marked as cancelled/rejected.`,
          NOTIFICATION_TYPES.TRANSACTION_UPDATE || 'transaction_update',
          transactionId,
        ]
      );
    } catch (nErr) {
      logger.warn('Failed to insert rejected notification', { error: nErr.message });
    }
  }

  logger.info('Transaction status updated', { transactionId, status: targetStatus, userId });
  return getTransactionById(userId, userRole, transactionId);
};

module.exports = {
  getTransactionById,
  getBuyerTransactions,
  getSellerTransactions,
  adminGetAllTransactions,
  updateTransactionStatus,
};
