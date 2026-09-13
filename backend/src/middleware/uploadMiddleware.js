const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiResponse = require('../utils/apiResponse');

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `equipment-${uniqueSuffix}${ext}`);
  },
});

// File Filter Configuration (MIME type check)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only valid image files (JPEG, PNG, WebP, GIF) are allowed.'), false);
  }
};

// Multer Upload Instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // Maximum 5 images per upload
  },
});

// Middleware Wrapper with Error Handling
const uploadEquipmentImages = (req, res, next) => {
  const uploadArray = upload.array('images', 5);

  uploadArray(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return ApiResponse.badRequest(res, 'File too large. Maximum image size is 5MB.');
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return ApiResponse.badRequest(res, 'Too many files. Maximum 5 images allowed per listing.');
      }
      return ApiResponse.badRequest(res, `Upload error: ${err.message}`);
    } else if (err) {
      return ApiResponse.badRequest(res, err.message);
    }
    next();
  });
};

module.exports = {
  upload,
  uploadEquipmentImages,
};
