const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/otp/send', authController.sendOtp);
router.post('/otp/verify', authController.verifyOtp);
router.post('/logout', authenticate, authController.logout);
router.get('/session', authenticate, authController.session);
router.post('/refresh', authController.refresh);

module.exports = router;
