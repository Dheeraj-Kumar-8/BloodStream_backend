const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);
router.get('/overview', authorize('admin'), analyticsController.overview);
router.get('/donor-performance', authorize('admin'), analyticsController.donorPerformance);
router.get('/recipient-insights', authorize('admin'), analyticsController.recipientInsights);
router.get('/delivery-metrics', authorize('admin'), analyticsController.deliveryMetrics);

module.exports = router;
