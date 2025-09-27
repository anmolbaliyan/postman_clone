const express = require('express');
const router = express.Router();
const { getFolders, getFolder, createFolder, updateFolder, deleteFolder } = require('../controllers/folderController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission } = require('./middleware/roleMiddleware');

/**
 * @route   GET /api/collections/:collectionId/folders
 * @desc    Get all folders in a collection
 * @access  Private (workspace member required)
 */
router.get('/collections/:collectionId/folders', authenticateToken, requireReadPermission, getFolders);

/**
 * @route   POST /api/collections/:collectionId/folders
 * @desc    Create a new folder in a collection
 * @access  Private (workspace member required)
 */
router.post('/collections/:collectionId/folders', authenticateToken, requireReadPermission, createFolder);

/**
 * @route   GET /api/folders/:id
 * @desc    Get a specific folder by ID
 * @access  Private (workspace member required)
 */
router.get('/folders/:id', authenticateToken, getFolder);

/**
 * @route   PUT /api/folders/:id
 * @desc    Update a folder
 * @access  Private (editor/admin/owner required)
 */
router.put('/folders/:id', authenticateToken, updateFolder);

/**
 * @route   DELETE /api/folders/:id
 * @desc    Delete a folder
 * @access  Private (admin/owner required)
 */
router.delete('/folders/:id', authenticateToken, deleteFolder);

module.exports = router;
