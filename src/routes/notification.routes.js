const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.post('/:notificationId/read', notificationController.markRead);
router.post('/mark-all', notificationController.markAllRead);

module.exports = router;
