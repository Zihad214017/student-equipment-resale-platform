const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// All notification operations strictly require authentication
router.use(authenticateJWT);

// 1. Unread count and mark-all-read routes (must precede /:id)
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.put('/read-all', notificationController.markAllRead);

// 2. List notifications (with pagination & is_read filter)
router.get('/', notificationController.getNotifications);

// 3. Mark single notification as read
router.patch('/:id/read', notificationController.markRead);
router.put('/:id/read', notificationController.markRead);

// 4. Delete notification
router.delete('/:id', notificationController.remove);

module.exports = router;
