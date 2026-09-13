const userService = require('../services/userService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get authenticated user's own profile
 * GET /api/v1/users/profile or GET /api/v1/users/me
 */
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await userService.getOwnProfile(req.user.id);
    return ApiResponse.success(res, 'User profile retrieved successfully.', profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user's own profile
 * PUT /api/v1/users/profile
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateOwnProfile(req.user.id, req.body);
    return ApiResponse.success(res, 'Profile updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Change authenticated user's own password
 * PUT /api/v1/users/change-password
 */
const changeMyPassword = async (req, res, next) => {
  try {
    await userService.changeOwnPassword(req.user.id, req.body);
    return ApiResponse.success(res, 'Password changed successfully. Please keep your credentials secure.');
  } catch (error) {
    next(error);
  }
};

/**
 * View relevant seller information (public or authenticated)
 * GET /api/v1/users/sellers/:id
 */
const getSellerProfile = async (req, res, next) => {
  try {
    const seller = await userService.getSellerPublicProfile(req.params.id);
    return ApiResponse.success(res, 'Seller information retrieved successfully.', seller);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  getSellerProfile,
};
