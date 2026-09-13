const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const validate = require('../validators/validator');
const {
  createEquipmentSchema,
  updateEquipmentSchema,
  updateEquipmentStatusSchema,
} = require('../validators/equipmentValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { uploadEquipmentImages } = require('../middleware/uploadMiddleware');

// 1. Seller Own Listings (Must precede /:id parameter route)
router.get('/user/my-listings', authenticateJWT, equipmentController.getMyListings);

// 2. Public Marketplace Catalog & Item Details
router.get('/', equipmentController.getMarketplace);
router.get('/:id', equipmentController.getDetails);

// 3. Create Equipment Listing (Supports multipart file uploads or JSON)
router.post(
  '/',
  authenticateJWT,
  uploadEquipmentImages,
  validate(createEquipmentSchema),
  equipmentController.create
);

// 4. Update Equipment Listing (Owner or Admin)
router.put(
  '/:id',
  authenticateJWT,
  uploadEquipmentImages,
  validate(updateEquipmentSchema),
  equipmentController.update
);

// 5. Image Management Routes (Owner or Admin)
router.post(
  '/:id/images',
  authenticateJWT,
  uploadEquipmentImages,
  equipmentController.uploadImages
);
router.delete(
  '/:id/images/:imageId',
  authenticateJWT,
  equipmentController.deleteImage
);
router.patch(
  '/:id/images/:imageId/primary',
  authenticateJWT,
  equipmentController.setPrimaryImage
);

// 6. Update Availability Status (Owner or Admin)
router.patch(
  '/:id/status',
  authenticateJWT,
  validate(updateEquipmentStatusSchema),
  equipmentController.updateStatus
);

// 7. Delete / Archive Equipment Listing (Owner or Admin)
router.delete('/:id', authenticateJWT, equipmentController.remove);

module.exports = router;
