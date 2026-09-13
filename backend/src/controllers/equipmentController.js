const equipmentService = require('../services/equipmentService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Public: Search and filter marketplace listings
 * GET /api/v1/equipment
 */
const getMarketplace = async (req, res, next) => {
  try {
    const result = await equipmentService.getMarketplaceListings(req.query);
    return ApiResponse.success(
      res,
      'Marketplace equipment retrieved successfully.',
      result.equipment,
      200,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Public: Get single equipment details by ID
 * GET /api/v1/equipment/:id
 */
const getDetails = async (req, res, next) => {
  try {
    const equipment = await equipmentService.getListingDetailsById(req.params.id, req.user);
    return ApiResponse.success(res, 'Equipment details retrieved successfully.', equipment);
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated: Create a new equipment listing
 * POST /api/v1/equipment
 */
const create = async (req, res, next) => {
  try {
    const newListing = await equipmentService.createListing(req.user.id, req.body, req.files);
    return ApiResponse.created(res, 'Equipment listed successfully on the marketplace.', newListing);
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated: Get current seller's own listings
 * GET /api/v1/equipment/user/my-listings
 */
const getMyListings = async (req, res, next) => {
  try {
    const result = await equipmentService.getSellerOwnListings(req.user.id, req.query);
    return ApiResponse.success(
      res,
      'My equipment listings retrieved successfully.',
      result.equipment,
      200,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated: Update an existing listing (Owner or Admin)
 * PUT /api/v1/equipment/:id
 */
const update = async (req, res, next) => {
  try {
    const updated = await equipmentService.updateListing(
      req.user.id,
      req.user.role,
      req.params.id,
      req.body,
      req.files
    );
    return ApiResponse.success(res, 'Equipment listing updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated: Update listing availability status (Owner or Admin)
 * PATCH /api/v1/equipment/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const updated = await equipmentService.updateListingStatus(
      req.user.id,
      req.user.role,
      req.params.id,
      req.body.status
    );
    return ApiResponse.success(res, 'Equipment status updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated: Delete an equipment listing (Owner or Admin)
 * DELETE /api/v1/equipment/:id
 */
const remove = async (req, res, next) => {
  try {
    const result = await equipmentService.deleteListing(req.user.id, req.user.role, req.params.id);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: View all listings across all approval and availability statuses
 * GET /api/v1/admin/equipment
 */
const adminGetListings = async (req, res, next) => {
  try {
    const result = await equipmentService.adminGetAllListings(req.query);
    return ApiResponse.success(
      res,
      'All equipment listings retrieved for moderation.',
      result.equipment,
      200,
      result.pagination
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Moderate equipment listing (Approve / Reject)
 * PATCH /api/v1/admin/equipment/:id/approval
 */
const adminModerate = async (req, res, next) => {
  try {
    const moderated = await equipmentService.adminModerateListing(
      req.user.id,
      req.params.id,
      req.body
    );
    return ApiResponse.success(
      res,
      `Equipment listing ${moderated.admin_approval_status} successfully.`,
      moderated
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated: Upload images to an existing listing
 * POST /api/v1/equipment/:id/images
 */
const uploadImages = async (req, res, next) => {
  try {
    const updated = await equipmentService.uploadListingImages(
      req.user.id,
      req.user.role,
      req.params.id,
      req.files,
      req.body.images
    );
    return ApiResponse.success(res, 'Equipment images uploaded successfully.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated: Delete an image from a listing
 * DELETE /api/v1/equipment/:id/images/:imageId
 */
const deleteImage = async (req, res, next) => {
  try {
    const updated = await equipmentService.deleteListingImage(
      req.user.id,
      req.user.role,
      req.params.id,
      req.params.imageId
    );
    return ApiResponse.success(res, 'Equipment image deleted successfully.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated: Set primary photo for listing
 * PATCH /api/v1/equipment/:id/images/:imageId/primary
 */
const setPrimaryImage = async (req, res, next) => {
  try {
    const updated = await equipmentService.setListingPrimaryImage(
      req.user.id,
      req.user.role,
      req.params.id,
      req.params.imageId
    );
    return ApiResponse.success(res, 'Primary equipment image updated.', updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMarketplace,
  getDetails,
  create,
  getMyListings,
  update,
  updateStatus,
  remove,
  uploadImages,
  deleteImage,
  setPrimaryImage,
  adminGetListings,
  adminModerate,
};
