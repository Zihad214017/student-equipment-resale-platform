const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../validators/validator');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../validators/authValidator');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { authorizeRoles, requireAdmin } = require('../middleware/rbacMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { USER_ROLES } = require('../config/constants');

// Public Authentication Endpoints
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Protected User Endpoints
router.get('/me', authenticateJWT, authController.getMe);
router.put('/profile', authenticateJWT, validate(updateProfileSchema), authController.updateProfile);
router.put('/change-password', authenticateJWT, validate(changePasswordSchema), authController.changePassword);

// Protected RBAC Example Endpoints
router.get('/admin-only', authenticateJWT, requireAdmin, authController.getAdminOnlyData);
router.get('/student-only', authenticateJWT, authorizeRoles(USER_ROLES.STUDENT), authController.getStudentOnlyData);

module.exports = router;
