const express = require('express');
const router = express.Router();
const { getAllUsers, getUserProfile, updateUserProfile, deleteUser, searchUsers } = require('../controllers/userController');
const { authenticateToken } = require('./middleware/authMiddleware');

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private (admin required)
 */
router.get('/', authenticateToken, getAllUsers);

/**
 * @route   GET /api/users/search
 * @desc    Search users by email or username
 * @access  Private
 */
router.get('/search', authenticateToken, searchUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get specific user profile
 * @access  Private (self or admin required)
 */
router.get('/:id', authenticateToken, getUserProfile);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile
 * @access  Private (self or admin required)
 */
router.put('/:id', authenticateToken, updateUserProfile);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private (admin required)
 */
router.delete('/:id', authenticateToken, deleteUser);

module.exports = router;
