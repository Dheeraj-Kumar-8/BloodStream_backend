const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const requestRoutes = require('./request.routes');
const deliveryRoutes = require('./delivery.routes');
const notificationRoutes = require('./notification.routes');
const analyticsRoutes = require('./analytics.routes');
const bloodBankRoutes = require('./bloodbank.routes');
const appointmentRoutes = require('./appointment.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/requests', requestRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/bloodbanks', bloodBankRoutes);
router.use('/appointments', appointmentRoutes);

module.exports = router;
