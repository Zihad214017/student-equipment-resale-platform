const db = require('../config/database');
const { PURCHASE_REQUEST_STATUS, NOTIFICATION_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Buyer: Submit a new purchase request
 * @param {string} buyerId 
 * @param {object} requestData 
 */
const createRequest = async (buyerId, requestData) => {
  const { equipment_id, proposed_price, offered_price, message } = requestData;

  // 1. Fetch Equipment and Seller Info
  const eqQuery = `
    SELECT 
      e.id, 
      e.seller_id, 
      e.title, 
      e.price, 
      e.status, 
      e.admin_approval_status,
      seller.full_name AS seller_name,
      buyer.full_name AS buyer_name
    FROM equipment_listings e
    JOIN users seller ON e.seller_id = seller.id
    CROSS JOIN (SELECT full_name FROM users WHERE id = $2) buyer
    WHERE e.id = $1
  `;
  const eqResult = await db.query(eqQuery, [equipment_id, buyerId]);

  if (eqResult.rows.length === 0) {
    const error = new Error('Equipment listing not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const equipment = eqResult.rows[0];

  // 2. Rule: Buyer cannot purchase their own listing
  if (equipment.seller_id === buyerId) {
    const error = new Error('You cannot purchase or submit requests for your own equipment listing.');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 3. Rule: Equipment must be approved and available
  if (equipment.admin_approval_status !== 'approved') {
    const error = new Error('This equipment listing is currently pending administrative verification.');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  if (equipment.status !== 'available') {
    const error = new Error(`This equipment is currently ${equipment.status} and cannot receive new purchase requests.`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 4. Rule: Prevent duplicate active (pending) requests from the same buyer
  const duplicateCheck = await db.query(
    `SELECT id FROM purchase_requests 
     WHERE equipment_id = $1 AND buyer_id = $2 AND status = 'pending'`,
    [equipment_id, buyerId]
  );

  if (duplicateCheck.rows.length > 0) {
    const error = new Error('You already have a pending purchase request for this equipment. Please wait for the seller to respond.');
    error.statusCode = 409;
    error.isOperational = true;
    throw error;
  }

  // 5. Calculate final proposed price
  const finalPrice = proposed_price !== undefined ? parseFloat(proposed_price) : (offered_price !== undefined ? parseFloat(offered_price) : parseFloat(equipment.price));

  // 6. Insert Purchase Request
  const insertQuery = `
    INSERT INTO purchase_requests (
      equipment_id,
      buyer_id,
      seller_id,
      proposed_price,
      message,
      status
    ) VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING id, equipment_id, buyer_id, seller_id, proposed_price, message, status, created_at, updated_at;
  `;

  const result = await db.query(insertQuery, [
    equipment_id,
    buyerId,
    equipment.seller_id,
    finalPrice,
    message || null,
  ]);

  const newRequest = result.rows[0];

  // 7. Generate Notification for Seller
  try {
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, FALSE, $5, 'purchase_request')`,
      [
        equipment.seller_id,
        'New Purchase Request Received',
        `${equipment.buyer_name} sent a purchase request for "${equipment.title}" at $${finalPrice.toFixed(2)}.`,
        NOTIFICATION_TYPES.REQUEST_RECEIVED || 'request_received',
        newRequest.id,
      ]
    );
  } catch (notifErr) {
    logger.warn('Failed to insert notification for purchase request', { error: notifErr.message });
  }

  logger.info('Purchase request submitted', { requestId: newRequest.id, buyerId, equipmentId: equipment_id });
  return getRequestById(buyerId, 'student', newRequest.id);
};

/**
 * Get single request details by ID with authorization guard
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} requestId 
 */
const getRequestById = async (userId, userRole, requestId) => {
  const query = `
    SELECT 
      pr.id,
      pr.equipment_id,
      pr.buyer_id,
      pr.seller_id,
      pr.proposed_price,
      pr.message,
      pr.status,
      pr.created_at,
      pr.updated_at,
      e.title AS equipment_title,
      e.price AS equipment_price,
      e.condition AS equipment_condition,
      e.status AS equipment_status,
      (
        SELECT image_url 
        FROM equipment_images 
        WHERE equipment_id = e.id AND is_primary = TRUE 
        LIMIT 1
      ) AS equipment_primary_image,
      c.name AS category_name,
      buyer.full_name AS buyer_name,
      buyer.email AS buyer_email,
      buyer.department AS buyer_department,
      buyer.avatar_url AS buyer_avatar,
      seller.full_name AS seller_name,
      seller.email AS seller_email,
      seller.department AS seller_department,
      seller.avatar_url AS seller_avatar
    FROM purchase_requests pr
    JOIN equipment_listings e ON pr.equipment_id = e.id
    JOIN categories c ON e.category_id = c.id
    JOIN users buyer ON pr.buyer_id = buyer.id
    JOIN users seller ON pr.seller_id = seller.id
    WHERE pr.id = $1
  `;

  const result = await db.query(query, [requestId]);
  if (result.rows.length === 0) {
    const error = new Error('Purchase request not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const reqRow = result.rows[0];

  // Authorization Check: Must be the buyer, the seller, or admin
  const isBuyer = reqRow.buyer_id === userId;
  const isSeller = reqRow.seller_id === userId;
  const isAdmin = userRole === 'admin';

  if (!isBuyer && !isSeller && !isAdmin) {
    const error = new Error('Access denied. You are not authorized to view this purchase request.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  return {
    ...reqRow,
    proposed_price: parseFloat(reqRow.proposed_price),
    equipment_price: parseFloat(reqRow.equipment_price),
  };
};

/**
 * Buyer: View own sent purchase requests
 * @param {string} buyerId 
 * @param {object} filters 
 */
const getBuyerRequests = async (buyerId, filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const conditions = ['pr.buyer_id = $1'];
  const params = [buyerId];
  let paramIdx = 2;

  if (filters.status && filters.status !== 'all') {
    conditions.push(`pr.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await db.query(
    `SELECT COUNT(id) AS total FROM purchase_requests pr ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      pr.id,
      pr.equipment_id,
      pr.seller_id,
      pr.proposed_price,
      pr.message,
      pr.status,
      pr.created_at,
      pr.updated_at,
      e.title AS equipment_title,
      e.price AS equipment_price,
      e.condition AS equipment_condition,
      e.status AS equipment_status,
      (
        SELECT image_url 
        FROM equipment_images 
        WHERE equipment_id = e.id AND is_primary = TRUE 
        LIMIT 1
      ) AS equipment_primary_image,
      c.name AS category_name,
      seller.full_name AS seller_name,
      seller.department AS seller_department,
      seller.avatar_url AS seller_avatar
    FROM purchase_requests pr
    JOIN equipment_listings e ON pr.equipment_id = e.id
    JOIN categories c ON e.category_id = c.id
    JOIN users seller ON pr.seller_id = seller.id
    ${whereClause}
    ORDER BY pr.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(query, queryParams);

  return {
    requests: result.rows.map(row => ({
      ...row,
      proposed_price: parseFloat(row.proposed_price),
      equipment_price: parseFloat(row.equipment_price),
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
 * Seller: View received purchase requests on own listings
 * @param {string} sellerId 
 * @param {object} filters 
 */
const getSellerRequests = async (sellerId, filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const conditions = ['pr.seller_id = $1'];
  const params = [sellerId];
  let paramIdx = 2;

  if (filters.status && filters.status !== 'all') {
    conditions.push(`pr.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  if (filters.equipment_id) {
    conditions.push(`pr.equipment_id = $${paramIdx}`);
    params.push(filters.equipment_id);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await db.query(
    `SELECT COUNT(id) AS total FROM purchase_requests pr ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const queryParams = [...params, limit, offset];
  const query = `
    SELECT 
      pr.id,
      pr.equipment_id,
      pr.buyer_id,
      pr.proposed_price,
      pr.message,
      pr.status,
      pr.created_at,
      pr.updated_at,
      e.title AS equipment_title,
      e.price AS equipment_price,
      e.condition AS equipment_condition,
      e.status AS equipment_status,
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
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
        FROM reviews 
        WHERE reviewee_id = buyer.id
      ) AS buyer_rating
    FROM purchase_requests pr
    JOIN equipment_listings e ON pr.equipment_id = e.id
    JOIN categories c ON e.category_id = c.id
    JOIN users buyer ON pr.buyer_id = buyer.id
    ${whereClause}
    ORDER BY pr.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const result = await db.query(query, queryParams);

  return {
    requests: result.rows.map(row => ({
      ...row,
      proposed_price: parseFloat(row.proposed_price),
      equipment_price: parseFloat(row.equipment_price),
      buyer_rating: parseFloat(row.buyer_rating || 0),
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
 * Seller: Accept or Reject a purchase request
 * @param {string} sellerId 
 * @param {string} userRole 
 * @param {string} requestId 
 * @param {object} responseData 
 */
const respondToRequest = async (sellerId, userRole, requestId, responseData) => {
  const { status, response_note } = responseData;

  // 1. Fetch Request with details
  const fetchQuery = `
    SELECT 
      pr.id,
      pr.equipment_id,
      pr.buyer_id,
      pr.seller_id,
      pr.proposed_price,
      pr.status,
      e.title AS equipment_title,
      e.status AS equipment_status,
      seller.full_name AS seller_name
    FROM purchase_requests pr
    JOIN equipment_listings e ON pr.equipment_id = e.id
    JOIN users seller ON pr.seller_id = seller.id
    WHERE pr.id = $1
  `;
  const res = await db.query(fetchQuery, [requestId]);

  if (res.rows.length === 0) {
    const error = new Error('Purchase request not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const request = res.rows[0];

  // 2. Ownership Guard: Only the seller who owns the listing (or admin) can respond
  if (request.seller_id !== sellerId && userRole !== 'admin') {
    const error = new Error('Access denied. You can only respond to purchase requests for your own listings.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // 3. Status Guard: Must be pending
  if (request.status !== 'pending') {
    const error = new Error(`Cannot respond to this request because it is already marked as ${request.status}.`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 4. Update purchase request status
  await db.query(
    'UPDATE purchase_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [status, requestId]
  );

  // 5. If Accepted: Update equipment status to 'reserved', create Transaction record, and reject competing requests
  if (status === 'accepted') {
    // 5.1 Update equipment status to 'reserved'
    await db.query(
      "UPDATE equipment_listings SET status = 'reserved', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [request.equipment_id]
    );

    // 5.2 Create Transaction Record in PostgreSQL (status = 'accepted')
    let transactionId = null;
    const existingTx = await db.query(
      'SELECT id FROM transactions WHERE purchase_request_id = $1',
      [requestId]
    );

    if (existingTx.rows.length === 0) {
      const txInsert = await db.query(
        `INSERT INTO transactions (
          purchase_request_id,
          equipment_id,
          buyer_id,
          seller_id,
          agreed_price,
          status,
          notes
        ) VALUES ($1, $2, $3, $4, $5, 'accepted', $6)
        RETURNING id`,
        [
          requestId,
          request.equipment_id,
          request.buyer_id,
          request.seller_id,
          request.proposed_price,
          response_note || null,
        ]
      );
      transactionId = txInsert.rows[0].id;
    } else {
      transactionId = existingTx.rows[0].id;
      await db.query(
        "UPDATE transactions SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [transactionId]
      );
    }

    // 5.3 Automatically reject any other competing pending requests on the same equipment
    const competingRes = await db.query(
      `UPDATE purchase_requests 
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
       WHERE equipment_id = $1 AND id <> $2 AND status = 'pending'
       RETURNING id, buyer_id`,
      [request.equipment_id, requestId]
    );

    // Notify competing buyers
    if (competingRes.rows.length > 0) {
      for (const compRow of competingRes.rows) {
        try {
          await db.query(
            `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
             VALUES ($1, $2, $3, $4, FALSE, $5, 'purchase_request')`,
            [
              compRow.buyer_id,
              'Purchase Request Notice',
              `The equipment "${request.equipment_title}" has been reserved for another student. Your pending request has been closed.`,
              NOTIFICATION_TYPES.REQUEST_STATUS || 'request_status',
              compRow.id,
            ]
          );
        } catch (nErr) {
          logger.warn('Failed to notify competing buyer', { error: nErr.message });
        }
      }
    }

    // Notify Accepted Buyer
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, FALSE, $5, 'transaction')`,
        [
          request.buyer_id,
          'Purchase Request Accepted!',
          `Great news! ${request.seller_name} accepted your request for "${request.equipment_title}". The item is now reserved for you.`,
          NOTIFICATION_TYPES.REQUEST_STATUS || 'request_status',
          transactionId || requestId,
        ]
      );
    } catch (nErr) {
      logger.warn('Failed to insert accepted notification', { error: nErr.message });
    }
  } else if (status === 'rejected') {
    // Notify Buyer: Rejected
    const reasonText = response_note ? ` Note from seller: "${response_note}"` : '';
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, FALSE, $5, 'purchase_request')`,
        [
          request.buyer_id,
          'Purchase Request Declined',
          `Your purchase request for "${request.equipment_title}" was declined by the seller.${reasonText}`,
          NOTIFICATION_TYPES.REQUEST_STATUS || 'request_status',
          requestId,
        ]
      );
    } catch (nErr) {
      logger.warn('Failed to insert rejected notification', { error: nErr.message });
    }
  }

  logger.info('Purchase request responded', { requestId, sellerId, status });
  return getRequestById(sellerId, userRole, requestId);
};

/**
 * Buyer: Cancel own pending purchase request
 * @param {string} buyerId 
 * @param {string} requestId 
 */
const cancelRequest = async (buyerId, requestId) => {
  const checkRes = await db.query(
    'SELECT id, buyer_id, seller_id, status, equipment_id FROM purchase_requests WHERE id = $1',
    [requestId]
  );

  if (checkRes.rows.length === 0) {
    const error = new Error('Purchase request not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const req = checkRes.rows[0];

  if (req.buyer_id !== buyerId) {
    const error = new Error('Access denied. You can only cancel your own purchase requests.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  if (req.status !== 'pending') {
    const error = new Error(`Cannot cancel request with status ${req.status}.`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  await db.query(
    "UPDATE purchase_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
    [requestId]
  );

  logger.info('Purchase request cancelled by buyer', { requestId, buyerId });
  return { id: requestId, status: 'cancelled', message: 'Purchase request cancelled successfully.' };
};

module.exports = {
  createRequest,
  getRequestById,
  getBuyerRequests,
  getSellerRequests,
  respondToRequest,
  cancelRequest,
};
