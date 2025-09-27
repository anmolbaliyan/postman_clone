const express = require('express');
const router = express.Router();
const { getCollections, getCollection, createCollection, updateCollection, deleteCollection } = require('../controllers/collectionController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission, requireEditPermission } = require('./middleware/roleMiddleware');

/**
 * @route   GET /api/workspaces/:workspaceId/collections
 * @desc    Get all collections in a workspace
 * @access  Private (workspace member required)
 */
router.get('/workspaces/:workspaceId/collections', authenticateToken, requireReadPermission, getCollections);

/**
 * @route   POST /api/workspaces/:workspaceId/collections
 * @desc    Create a new collection in a workspace
 * @access  Private (workspace member required)
 */
router.post('/workspaces/:workspaceId/collections', authenticateToken, requireReadPermission, createCollection);

/**
 * @route   GET /api/collections/:id
 * @desc    Get a specific collection by ID
 * @access  Private (workspace member required)
 */
router.get('/collections/:id', authenticateToken, getCollection);

/**
 * @route   PUT /api/collections/:id
 * @desc    Update a collection
 * @access  Private (editor/admin/owner required)
 */
router.put('/collections/:id', authenticateToken, updateCollection);

/**
 * @route   DELETE /api/collections/:id
 * @desc    Delete a collection
 * @access  Private (admin/owner required)
 */
router.delete('/collections/:id', authenticateToken, deleteCollection);

module.exports = router;
