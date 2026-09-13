const ApiResponse = require('../utils/apiResponse');
const { USER_ROLES } = require('../config/constants');

/**
 * Role-Based Access Control Middleware Factory
 * @param  {...string} allowedRoles - Allowed roles e.g. ('admin') or ('student', 'admin')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required before authorization check');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]`
      );
    }

    next();
  };
};

/**
 * Shortcut middleware strictly requiring Administrator role
 */
const requireAdmin = authorizeRoles(USER_ROLES.ADMIN);

module.exports = {
  authorizeRoles,
  requireAdmin,
};
