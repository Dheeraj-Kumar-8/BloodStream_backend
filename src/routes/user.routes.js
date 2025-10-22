const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.me);
router.put('/me', userController.updateProfile);
router.get('/me/health', authorize('donor', 'admin'), userController.getHealthMetrics);
router.post('/me/health', authorize('donor', 'admin'), userController.addHealthMetric);
router.get('/', authorize('admin'), userController.listUsers);
router.get('/donors/nearby', authorize('recipient', 'admin'), userController.nearbyDonors);
router.get('/donors/availability', authorize('admin'), userController.donorAvailability);

module.exports = router;
