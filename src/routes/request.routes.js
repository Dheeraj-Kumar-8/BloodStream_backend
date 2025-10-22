const express = require('express');
const requestController = require('../controllers/request.controller');
const { authenticate, authorize } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('recipient', 'admin'), requestController.createRequest);
router.get('/', requestController.listRequests);
router.get('/:requestId', requestController.getRequest);
router.post('/:requestId/match', authorize('admin'), requestController.matchDonors);
router.post('/:requestId/escalate', authorize('admin'), requestController.escalateEmergency);
router.post('/:requestId/accept', authorize('donor'), requestController.acceptRequest);
router.post('/:requestId/decline', authorize('donor'), requestController.declineRequest);

module.exports = router;
