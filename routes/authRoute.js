const express = require('express');
const router = express.Router();
const { register, login, getProfile, refreshToken } = require('../controllers/authController');
const { authenticateToken } = require('./middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.post('/refresh', refreshToken);

module.exports = router;