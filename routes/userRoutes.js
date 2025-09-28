const express = require('express');
const router = express.Router();
const { getAllUsers, getUserProfile, updateUserProfile, deleteUser, searchUsers } = require('../controllers/userController');
const { authenticateToken } = require('./middleware/authMiddleware');

router.get('/', authenticateToken, getAllUsers);
router.get('/search', authenticateToken, searchUsers);
router.get('/:id', authenticateToken, getUserProfile);
router.put('/:id', authenticateToken, updateUserProfile);
router.delete('/:id', authenticateToken, deleteUser);

module.exports = router;