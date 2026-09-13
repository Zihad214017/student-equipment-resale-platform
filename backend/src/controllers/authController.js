const authService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Handle user registration
 * POST /api/auth/register or POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    return ApiResponse.created(
      res,
      'Registration successful. Welcome to Smart Student Equipment Platform!',
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login
 * POST /api/auth/login or POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return ApiResponse.success(res, 'Login successful.', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me or GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const profile = await authService.getUserProfile(req.user.id);
    return ApiResponse.success(res, 'User profile retrieved successfully.', profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user profile
 * PUT /api/auth/profile or PUT /api/v1/users/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await authService.updateUserProfile(req.user.id, req.body);
    return ApiResponse.success(res, 'Profile updated successfully.', updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * Change authenticated user password
 * PUT /api/auth/change-password or PUT /api/v1/users/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    await authService.changeUserPassword(req.user.id, req.body);
    return ApiResponse.success(res, 'Password changed successfully. Please keep your credentials secure.');
  } catch (error) {
    next(error);
  }
};

/**
 * Protected Admin-Only Example Route Handler
 * GET /api/auth/admin-only
 */
const getAdminOnlyData = async (req, res) => {
  return ApiResponse.success(res, 'Admin authorization verified.', {
    admin_id: req.user.id,
    admin_email: req.user.email,
    role: req.user.role,
    system_metrics: {
      platform_status: 'operational',
      security_level: 'high',
      server_time: new Date().toISOString(),
    },
  });
};

/**
 * Protected Student/Buyer/Seller Example Route Handler
 * GET /api/auth/student-only
 */
const getStudentOnlyData = async (req, res) => {
  return ApiResponse.success(res, 'Student authorization verified.', {
    user_id: req.user.id,
    student_id: req.user.student_id,
    role: req.user.role,
    department: req.user.department,
    marketplace_access: 'full',
  });
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getAdminOnlyData,
  getStudentOnlyData,
};
