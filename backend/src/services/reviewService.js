const db = require('../config/database');
const { NOTIFICATION_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Submit a review for a completed transaction
 * @param {string} reviewerId 
 * @param {object} reviewData 
 */
const createReview = async (reviewerId, reviewData) => {
  const { transaction_id, rating, comment } = reviewData;

  // 1. Fetch transaction record
  const txQuery = `
    SELECT 
      t.id,
      t.equipment_id,
      t.buyer_id,
      t.seller_id,
      t.status,
      e.title AS equipment_title,
      buyer.full_name AS buyer_name,
      seller.full_name AS seller_name
    FROM transactions t
    JOIN equipment_listings e ON t.equipment_id = e.id
    JOIN users buyer ON t.buyer_id = buyer.id
    JOIN users seller ON t.seller_id = seller.id
    WHERE t.id = $1
  `;
  const txResult = await db.query(txQuery, [transaction_id]);

  if (txResult.rows.length === 0) {
    const error = new Error('Transaction not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const tx = txResult.rows[0];

  // 2. Rule: Transaction must be in 'completed' status
  if (tx.status !== 'completed') {
    const error = new Error(
      `Reviews can only be submitted after a transaction is completed. Current transaction status is "${tx.status}".`
    );
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 3. Rule: Only the buyer of this transaction can submit a review
  if (tx.buyer_id !== reviewerId) {
    const error = new Error('Access denied. Only the buyer who purchased the equipment can submit a review for this transaction.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // 4. Rule: Self-review check (buyer cannot review themselves)
  if (tx.seller_id === reviewerId) {
    const error = new Error('You cannot review your own account.');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 5. Rule: Check for duplicate review on the same transaction
  const dupCheck = await db.query(
    'SELECT id FROM reviews WHERE transaction_id = $1',
    [transaction_id]
  );
  if (dupCheck.rows.length > 0) {
    const error = new Error('You have already submitted a review for this transaction. Duplicate reviews are not allowed.');
    error.statusCode = 409;
    error.isOperational = true;
    throw error;
  }

  // 6. Insert review into PostgreSQL
  const insertQuery = `
    INSERT INTO reviews (
      transaction_id,
      equipment_id,
      reviewer_id,
      reviewee_id,
      rating,
      comment
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, transaction_id, equipment_id, reviewer_id, reviewee_id, rating, comment, created_at, updated_at;
  `;

  const result = await db.query(insertQuery, [
    transaction_id,
    tx.equipment_id,
    reviewerId,
    tx.seller_id,
    parseInt(rating, 10),
    comment || null,
  ]);

  const newReview = result.rows[0];

  // 7. Dispatch Notification to Seller
  try {
    const starString = '★'.repeat(newReview.rating);
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, FALSE, $5, 'review')`,
      [
        tx.seller_id,
        'New Review Received!',
        `${tx.buyer_name} left you a ${newReview.rating}-star rating (${starString}) for "${tx.equipment_title}".`,
        NOTIFICATION_TYPES.REVIEW_RECEIVED || 'review_received',
        newReview.id,
      ]
    );
  } catch (notifErr) {
    logger.warn('Failed to insert review notification', { error: notifErr.message });
  }

  logger.info('Review submitted successfully', { reviewId: newReview.id, rating: newReview.rating, sellerId: tx.seller_id });
  return getReviewById(newReview.id);
};

/**
 * Get review by ID
 * @param {string} reviewId 
 */
const getReviewById = async (reviewId) => {
  const query = `
    SELECT 
      r.id,
      r.transaction_id,
      r.equipment_id,
      r.reviewer_id,
      r.reviewee_id,
      r.rating,
      r.comment,
      r.created_at,
      r.updated_at,
      e.title AS equipment_title,
      e.price AS equipment_price,
      reviewer.full_name AS reviewer_name,
      reviewer.department AS reviewer_department,
      reviewer.avatar_url AS reviewer_avatar,
      seller.full_name AS seller_name,
      seller.department AS seller_department,
      seller.avatar_url AS seller_avatar
    FROM reviews r
    JOIN equipment_listings e ON r.equipment_id = e.id
    JOIN users reviewer ON r.reviewer_id = reviewer.id
    JOIN users seller ON r.reviewee_id = seller.id
    WHERE r.id = $1
  `;

  const result = await db.query(query, [reviewId]);
  if (result.rows.length === 0) {
    const error = new Error('Review not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const row = result.rows[0];
  return {
    ...row,
    rating: parseInt(row.rating, 10),
    equipment_price: parseFloat(row.equipment_price),
  };
};

/**
 * Get all reviews for a seller with calculated rating stats & star breakdown
 * @param {string} sellerId 
 * @param {object} filters 
 */
const getSellerReviews = async (sellerId, filters = {}) => {
  // 1. Verify seller exists
  const userCheck = await db.query('SELECT id, full_name, avatar_url, department FROM users WHERE id = $1', [sellerId]);
  if (userCheck.rows.length === 0) {
    const error = new Error('Seller not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }
  const seller = userCheck.rows[0];

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  // 2. Compute aggregated metrics & star distribution in a single query
  const statsQuery = `
    SELECT 
      COUNT(id) AS total_reviews,
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
      COUNT(CASE WHEN rating = 5 THEN 1 END) AS count_5_star,
      COUNT(CASE WHEN rating = 4 THEN 1 END) AS count_4_star,
      COUNT(CASE WHEN rating = 3 THEN 1 END) AS count_3_star,
      COUNT(CASE WHEN rating = 2 THEN 1 END) AS count_2_star,
      COUNT(CASE WHEN rating = 1 THEN 1 END) AS count_1_star
    FROM reviews
    WHERE reviewee_id = $1
  `;
  const statsRes = await db.query(statsQuery, [sellerId]);
  const stats = statsRes.rows[0];
  const totalReviews = parseInt(stats.total_reviews, 10);
  const totalPages = Math.ceil(totalReviews / limit);

  const ratingSummary = {
    seller_id: sellerId,
    seller_name: seller.full_name,
    average_rating: parseFloat(stats.average_rating || 0),
    total_reviews: totalReviews,
    distribution: {
      5: parseInt(stats.count_5_star, 10),
      4: parseInt(stats.count_4_star, 10),
      3: parseInt(stats.count_3_star, 10),
      2: parseInt(stats.count_2_star, 10),
      1: parseInt(stats.count_1_star, 10),
    },
  };

  // 3. Query paginated reviews list
  const query = `
    SELECT 
      r.id,
      r.transaction_id,
      r.equipment_id,
      r.reviewer_id,
      r.rating,
      r.comment,
      r.created_at,
      e.title AS equipment_title,
      reviewer.full_name AS reviewer_name,
      reviewer.department AS reviewer_department,
      reviewer.avatar_url AS reviewer_avatar
    FROM reviews r
    JOIN equipment_listings e ON r.equipment_id = e.id
    JOIN users reviewer ON r.reviewer_id = reviewer.id
    WHERE r.reviewee_id = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const reviewsRes = await db.query(query, [sellerId, limit, offset]);

  return {
    rating_summary: ratingSummary,
    reviews: reviewsRes.rows.map(row => ({
      ...row,
      rating: parseInt(row.rating, 10),
    })),
    pagination: {
      totalItems: totalReviews,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get review by equipment listing ID
 * @param {string} equipmentId 
 */
const getEquipmentReview = async (equipmentId) => {
  const query = `
    SELECT 
      r.id,
      r.transaction_id,
      r.equipment_id,
      r.rating,
      r.comment,
      r.created_at,
      reviewer.full_name AS reviewer_name,
      reviewer.avatar_url AS reviewer_avatar
    FROM reviews r
    JOIN users reviewer ON r.reviewer_id = reviewer.id
    WHERE r.equipment_id = $1
    ORDER BY r.created_at DESC
    LIMIT 1
  `;
  const result = await db.query(query, [equipmentId]);
  if (result.rows.length === 0) {
    return null;
  }
  return {
    ...result.rows[0],
    rating: parseInt(result.rows[0].rating, 10),
  };
};

/**
 * Delete a review (Reviewer or Admin)
 * @param {string} userId 
 * @param {string} userRole 
 * @param {string} reviewId 
 */
const deleteReview = async (userId, userRole, reviewId) => {
  const existing = await db.query('SELECT id, reviewer_id FROM reviews WHERE id = $1', [reviewId]);
  if (existing.rows.length === 0) {
    const error = new Error('Review not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  if (existing.rows[0].reviewer_id !== userId && userRole !== 'admin') {
    const error = new Error('Access denied. You can only delete your own reviews.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  await db.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
  logger.info('Review deleted', { reviewId, userId });

  return { id: reviewId, message: 'Review deleted successfully.' };
};

module.exports = {
  createReview,
  getReviewById,
  getSellerReviews,
  getEquipmentReview,
  deleteReview,
};
