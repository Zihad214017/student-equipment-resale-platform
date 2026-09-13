const { verifyToken } = require('../utils/jwt');
const ApiResponse = require('../utils/apiResponse');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 * Validates JWT token from Authorization header and attaches authenticated user to req.user
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Authentication token missing or malformed');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Authentication token has expired');
      }
      return ApiResponse.unauthorized(res, 'Invalid authentication token');
    }

    // Verify user still exists and is active in database
    const userResult = await db.query(
      'SELECT id, student_id, full_name, email, role, phone, department, avatar_url, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return ApiResponse.unauthorized(res, 'User account no longer exists');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return ApiResponse.forbidden(res, 'User account has been deactivated. Please contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication Middleware Error', { error: error.message });
    return ApiResponse.unauthorized(res, 'Authentication failed');
  }
};

module.exports = {
  authenticateJWT,
};
