const express = require('express');
const bloodBankController = require('../controllers/bloodbank.controller');
const { authenticate, authorize } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/', bloodBankController.listBloodBanks);
router.post('/', authorize('admin'), bloodBankController.createBloodBank);
router.put('/:bloodBankId', authorize('admin'), bloodBankController.updateBloodBank);
router.get('/:bloodBankId', bloodBankController.getBloodBank);

module.exports = router;
