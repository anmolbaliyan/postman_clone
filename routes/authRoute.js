const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, logout } = require('../controllers/authController');
const { authenticateToken } = require('./middleware/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, updateProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

module.exports = router;
