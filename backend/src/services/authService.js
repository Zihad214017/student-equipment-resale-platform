const db = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { USER_ROLES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Register a new student or administrator
 */
const registerUser = async (userData) => {
  const {
    student_id,
    full_name,
    email,
    password,
    phone,
    department,
    avatar_url,
  } = userData;

  // Security: Public registration can strictly ONLY create student accounts.
  const assignedRole = USER_ROLES.STUDENT;

  // 1. Check for duplicate email
  const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (emailCheck.rows.length > 0) {
    const error = new Error('An account with this email address already exists. Please login instead.');
    error.statusCode = 409;
    error.isOperational = true;
    throw error;
  }

  // 2. Check for duplicate student/university ID
  const studentIdCheck = await db.query('SELECT id FROM users WHERE student_id = $1', [student_id]);
  if (studentIdCheck.rows.length > 0) {
    const error = new Error('An account with this Student / University ID already exists.');
    error.statusCode = 409;
    error.isOperational = true;
    throw error;
  }

  // 3. Hash password with Bcrypt
  const passwordHash = await hashPassword(password);

  // 4. Insert into PostgreSQL
  const insertQuery = `
    INSERT INTO users (
      student_id, full_name, email, password_hash, phone, department, role, avatar_url, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
    RETURNING id, student_id, full_name, email, role, phone, department, avatar_url, is_active, created_at;
  `;

  const result = await db.query(insertQuery, [
    student_id,
    full_name,
    email,
    passwordHash,
    phone || null,
    department || null,
    assignedRole,
    avatar_url || null,
  ]);

  const newUser = result.rows[0];

  logger.info('User registered successfully', {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    studentId: newUser.student_id,
  });

  // 5. Generate signed JWT token
  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    student_id: newUser.student_id,
  });

  return {
    user: newUser,
    token,
  };
};

/**
 * Authenticate user credentials and return JWT token
 */
const loginUser = async (credentials) => {
  const { email, password } = credentials;

  // Find user by email
  const userResult = await db.query(
    `SELECT id, student_id, full_name, email, password_hash, role, phone, department, avatar_url, is_active 
     FROM users WHERE email = $1`,
    [email]
  );

  if (userResult.rows.length === 0) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.isOperational = true;
    throw error;
  }

  const user = userResult.rows[0];

  // Check if account is active
  if (!user.is_active) {
    const error = new Error('This account has been deactivated. Please contact campus administration.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  // Verify Bcrypt password hash
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.isOperational = true;
    throw error;
  }

  // Remove sensitive hash from payload
  delete user.password_hash;

  logger.info('User logged in successfully', {
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Generate JWT token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    student_id: user.student_id,
  });

  return {
    user,
    token,
  };
};

/**
 * Fetch profile with aggregated seller ratings and transaction stats
 */
const getUserProfile = async (userId) => {
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

  // 2. User Marketplace Stats (Listings, Sent Requests, Transactions)
  const statsResult = await db.query(
    `SELECT 
       (SELECT COUNT(*) FROM equipment_listings WHERE seller_id = $1) AS total_listings,
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
    sent_requests: parseInt(stats.sent_requests || 0, 10),
    received_requests: parseInt(stats.received_requests || 0, 10),
    total_transactions: parseInt(stats.total_transactions || 0, 10),
  };

  return user;
};

/**
 * Update user profile details
 */
const updateUserProfile = async (userId, profileData) => {
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

  logger.info('User profile updated', { userId });
  return result.rows[0];
};

/**
 * Change user password securely
 */
const changeUserPassword = async (userId, passwordData) => {
  const { current_password, new_password } = passwordData;

  // Retrieve current user hash
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

  // Update password in DB
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newHash, userId]
  );

  logger.info('User password changed successfully', { userId });
  return { success: true };
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
};
