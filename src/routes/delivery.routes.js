const express = require('express');
const deliveryController = require('../controllers/delivery.controller');
const { authenticate, authorize } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('admin', 'delivery'), deliveryController.listDeliveries);
router.post('/', authorize('admin'), deliveryController.createDelivery);
router.get('/:deliveryId', deliveryController.getDelivery);
router.post('/:deliveryId/status', authorize('delivery', 'admin'), deliveryController.updateStatus);
router.post('/:deliveryId/track', authorize('delivery', 'admin'), deliveryController.addTrackingEvent);

module.exports = router;
