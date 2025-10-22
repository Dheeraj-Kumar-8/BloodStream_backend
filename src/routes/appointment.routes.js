const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { authenticate, authorize } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('donor', 'admin'), appointmentController.createAppointment);
router.get('/', appointmentController.listAppointments);
router.put('/:appointmentId', authorize('donor', 'admin'), appointmentController.updateAppointment);

module.exports = router;
