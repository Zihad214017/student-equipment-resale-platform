const db = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const logger = require('../utils/logger');

/**
 * Fetch authenticated user's own profile and stats
 * @param {string} userId 
 */
const getOwnProfile = async (userId) => {
  const userResult = await db.query(
    `SELECT id, student_id, full_name, email, role, phone, department, avatar_url, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const user = userResult.rows[0];

  // 1. Seller Rating Stats
  const ratingResult = await db.query(
    `SELECT 
       COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating, 
       COUNT(id) AS total_reviews
     FROM reviews 
     WHERE reviewee_id = $1`,
    [userId]
  );

  // 2. Marketplace Activity Stats
  const statsResult = await db.query(
    `SELECT 
       (SELECT COUNT(*) FROM equipment_listings WHERE seller_id = $1) AS total_listings,
       (SELECT COUNT(*) FROM equipment_listings WHERE seller_id = $1 AND status = 'available') AS active_listings,
       (SELECT COUNT(*) FROM purchase_requests WHERE buyer_id = $1) AS sent_requests,
       (SELECT COUNT(*) FROM purchase_requests WHERE seller_id = $1) AS received_requests,
       (SELECT COUNT(*) FROM transactions WHERE buyer_id = $1 OR seller_id = $1) AS total_transactions
    `,
    [userId]
  );

  const stats = statsResult.rows[0] || {};

  user.rating_summary = {
    average_rating: parseFloat(ratingResult.rows[0]?.average_rating || 0),
    total_reviews: parseInt(ratingResult.rows[0]?.total_reviews || 0, 10),
  };

  user.activity_stats = {
    total_listings: parseInt(stats.total_listings || 0, 10),
    active_listings: parseInt(stats.active_listings || 0, 10),
    sent_requests: parseInt(stats.sent_requests || 0, 10),
    received_requests: parseInt(stats.received_requests || 0, 10),
    total_transactions: parseInt(stats.total_transactions || 0, 10),
  };

  return user;
};

/**
 * Update authenticated user's own profile
 * @param {string} userId 
 * @param {object} profileData 
 */
const updateOwnProfile = async (userId, profileData) => {
  const { full_name, phone, department, avatar_url } = profileData;

  const updateQuery = `
    UPDATE users 
    SET 
      full_name = COALESCE($1, full_name),
      phone = COALESCE($2, phone),
      department = COALESCE($3, department),
      avatar_url = COALESCE($4, avatar_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, student_id, full_name, email, role, phone, department, avatar_url, is_active, created_at, updated_at;
  `;

  const result = await db.query(updateQuery, [
    full_name !== undefined ? full_name : null,
    phone !== undefined ? phone : null,
    department !== undefined ? department : null,
    avatar_url !== undefined ? avatar_url : null,
    userId,
  ]);

  if (result.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  logger.info('User updated own profile', { userId });
  return result.rows[0];
};

/**
 * Change authenticated user's own password
 * @param {string} userId 
 * @param {object} passwordData 
 */
const changeOwnPassword = async (userId, passwordData) => {
  const { current_password, new_password } = passwordData;

  const userResult = await db.query('SELECT id, password_hash FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const user = userResult.rows[0];

  // Verify current password
  const isMatch = await comparePassword(current_password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Current password does not match.');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // Hash new password
  const newHash = await hashPassword(new_password);

  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newHash, userId]
  );

  logger.info('User changed password successfully', { userId });
  return { success: true };
};

/**
 * View relevant seller information (public / authenticated)
 * Returns seller details, rating score, active listings, and reviews received
 * @param {string} sellerId 
 */
const getSellerPublicProfile = async (sellerId) => {
  // 1. Fetch Seller Profile
  const sellerResult = await db.query(
    `SELECT id, student_id, full_name, department, avatar_url, created_at, is_active
     FROM users 
     WHERE id = $1`,
    [sellerId]
  );

  if (sellerResult.rows.length === 0) {
    const error = new Error('Seller not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const seller = sellerResult.rows[0];

  if (!seller.is_active) {
    const error = new Error('This seller profile is currently inactive.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  // 2. Fetch Aggregated Ratings
  const ratingResult = await db.query(
    `SELECT 
       COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
       COUNT(id) AS total_reviews,
       COUNT(CASE WHEN rating = 5 THEN 1 END) AS five_star_count,
       COUNT(CASE WHEN rating = 4 THEN 1 END) AS four_star_count,
       COUNT(CASE WHEN rating = 3 THEN 1 END) AS three_star_count,
       COUNT(CASE WHEN rating = 2 THEN 1 END) AS two_star_count,
       COUNT(CASE WHEN rating = 1 THEN 1 END) AS one_star_count
     FROM reviews 
     WHERE reviewee_id = $1`,
    [sellerId]
  );

  const ratingRow = ratingResult.rows[0] || {};
  seller.rating_summary = {
    average_rating: parseFloat(ratingRow.average_rating || 0),
    total_reviews: parseInt(ratingRow.total_reviews || 0, 10),
    breakdown: {
      5: parseInt(ratingRow.five_star_count || 0, 10),
      4: parseInt(ratingRow.four_star_count || 0, 10),
      3: parseInt(ratingRow.three_star_count || 0, 10),
      2: parseInt(ratingRow.two_star_count || 0, 10),
      1: parseInt(ratingRow.one_star_count || 0, 10),
    },
  };

  // 3. Fetch Seller's Active Equipment Listings
  const listingsResult = await db.query(
    `SELECT 
       e.id,
       e.title,
       e.description,
       e.condition,
       e.price,
       e.original_price,
       e.brand,
       e.model_year,
       e.is_negotiable,
       e.status,
       e.created_at,
       c.name AS category_name,
       c.slug AS category_slug,
       (SELECT image_url FROM equipment_images WHERE equipment_id = e.id AND is_primary = TRUE LIMIT 1) AS primary_image
     FROM equipment_listings e
     JOIN categories c ON e.category_id = c.id
     WHERE e.seller_id = $1 AND e.status = 'available' AND e.admin_approval_status = 'approved'
     ORDER BY e.created_at DESC`,
    [sellerId]
  );

  seller.active_listings = listingsResult.rows;

  // 4. Fetch Reviews Received by Seller
  const reviewsResult = await db.query(
    `SELECT 
       r.id,
       r.rating,
       r.comment,
       r.created_at,
       reviewer.id AS reviewer_id,
       reviewer.full_name AS reviewer_name,
       reviewer.avatar_url AS reviewer_avatar,
       e.id AS equipment_id,
       e.title AS equipment_title
     FROM reviews r
     JOIN users reviewer ON r.reviewer_id = reviewer.id
     JOIN equipment_listings e ON r.equipment_id = e.id
     WHERE r.reviewee_id = $1
     ORDER BY r.created_at DESC
     LIMIT 10`,
    [sellerId]
  );

  seller.recent_reviews = reviewsResult.rows;

  return seller;
};

/**
 * Admin: Get Paginated List of Users with Filters
 * @param {object} filters 
 */
const adminGetUsers = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (filters.search) {
    conditions.push(`(full_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR student_id ILIKE $${paramIdx})`);
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  if (filters.role) {
    conditions.push(`role = $${paramIdx}`);
    params.push(filters.role);
    paramIdx++;
  }

  if (filters.is_active !== undefined) {
    const isActiveBool = filters.is_active === 'true' || filters.is_active === true;
    conditions.push(`is_active = $${paramIdx}`);
    params.push(isActiveBool);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await db.query(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  // Get paginated users
  const queryParams = [...params, limit, offset];
  const usersResult = await db.query(
    `SELECT 
       id, 
       student_id, 
       full_name, 
       email, 
       role, 
       phone, 
       department, 
       avatar_url, 
       is_active, 
       created_at, 
       updated_at,
       (SELECT COUNT(*) FROM equipment_listings WHERE seller_id = users.id) AS listings_count,
       (SELECT COUNT(*) FROM transactions WHERE buyer_id = users.id OR seller_id = users.id) AS transactions_count
     FROM users 
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    queryParams
  );

  return {
    users: usersResult.rows,
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
 * Admin: View Specific User Profile & Complete Administrative Audit Record
 * @param {string} userId 
 */
const adminGetUserById = async (userId) => {
  const user = await getOwnProfile(userId);

  // Fetch recent audit logs relating to this user
  const auditLogsResult = await db.query(
    `SELECT id, action, details, ip_address, created_at
     FROM audit_logs
     WHERE target_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );

  user.audit_history = auditLogsResult.rows;
  return user;
};

/**
 * Admin: Toggle User Active/Deactivated Status
 * @param {string} adminId 
 * @param {string} targetUserId 
 * @param {boolean} isActive 
 */
const adminToggleUserStatus = async (adminId, targetUserId, isActive) => {
  // Prevent self-deactivation if admin
  if (adminId === targetUserId && !isActive) {
    const error = new Error('You cannot deactivate your own administrative account.');
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  const result = await db.query(
    `UPDATE users 
     SET is_active = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, student_id, full_name, email, role, is_active, updated_at`,
    [isActive, targetUserId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const updatedUser = result.rows[0];

  // Log in audit_logs
  await db.query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
     VALUES ($1, $2, 'user', $3, $4)`,
    [
      adminId,
      isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      targetUserId,
      JSON.stringify({ target_email: updatedUser.email, target_student_id: updatedUser.student_id, is_active: isActive }),
    ]
  );

  logger.info(`Admin toggled user status: ${isActive ? 'ACTIVE' : 'DEACTIVATED'}`, {
    adminId,
    targetUserId,
    isActive,
  });

  return updatedUser;
};

/**
 * Admin: Update User Information
 * @param {string} adminId 
 * @param {string} targetUserId 
 * @param {object} updateData 
 */
const adminUpdateUser = async (adminId, targetUserId, updateData) => {
  const { full_name, department, phone, role, is_active } = updateData;

  const result = await db.query(
    `UPDATE users 
     SET 
       full_name = COALESCE($1, full_name),
       department = COALESCE($2, department),
       phone = COALESCE($3, phone),
       role = COALESCE($4, role),
       is_active = COALESCE($5, is_active),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING id, student_id, full_name, email, role, department, phone, is_active, updated_at`,
    [
      full_name !== undefined ? full_name : null,
      department !== undefined ? department : null,
      phone !== undefined ? phone : null,
      role !== undefined ? role : null,
      is_active !== undefined ? is_active : null,
      targetUserId,
    ]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const updatedUser = result.rows[0];

  // Audit log
  await db.query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
     VALUES ($1, 'USER_MODIFIED_BY_ADMIN', 'user', $2, $3)`,
    [adminId, targetUserId, JSON.stringify({ changes: updateData })]
  );

  logger.info('Admin updated user details', { adminId, targetUserId });
  return updatedUser;
};

module.exports = {
  getOwnProfile,
  updateOwnProfile,
  changeOwnPassword,
  getSellerPublicProfile,
  adminGetUsers,
  adminGetUserById,
  adminToggleUserStatus,
  adminUpdateUser,
};
