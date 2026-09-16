const userService = require('../services/userService');
const adminService = require('../services/adminService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Admin: Get paginated list of all users with search and filters
 * GET /api/v1/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const result = await userService.adminGetUsers(req.query);
    return ApiResponse.success(res, 'Users retrieved successfully.', result.users, 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get detailed user profile & audit history
 * GET /api/v1/admin/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.adminGetUserById(req.params.id);
    return ApiResponse.success(res, 'User details retrieved successfully.', user);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Toggle user active / deactivated status
 * PATCH /api/v1/admin/users/:id/toggle-status
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const updated = await userService.adminToggleUserStatus(
      req.user.id,
      req.params.id,
      req.body.is_active
    );
    return ApiResponse.success(
      res,
      `User account ${updated.is_active ? 'activated' : 'deactivated'} successfully.`,
      updated
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update user details
 * PUT /api/v1/admin/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const updated = await userService.adminUpdateUser(
      req.user.id,
      req.params.id,
      req.body
    );
    return ApiResponse.success(res, 'User updated successfully by administrator.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get Platform-wide Statistics & Dashboard Reports
 * GET /api/v1/admin/reports & GET /api/v1/admin/dashboard
 */
const getPlatformStatistics = async (req, res, next) => {
  try {
    const stats = await adminService.getPlatformStatistics();
    return ApiResponse.success(res, 'Platform statistics and reports retrieved successfully.', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create a new student or admin user
 * POST /api/v1/admin/users
 */
const createUser = async (req, res, next) => {
  try {
    const newUser = await userService.adminCreateUser(req.user.id, req.body);
    return ApiResponse.created(res, 'User created successfully by administrator.', newUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  toggleUserStatus,
  updateUser,
  createUser,
  getPlatformStatistics,
};
