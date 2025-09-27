const express = require('express');
const router = express.Router();
const { getEnvironments, getEnvironment, createEnvironment, updateEnvironment, deleteEnvironment } = require('../controllers/environmentController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission } = require('./middleware/roleMiddleware');

/**
 * @route   GET /api/workspaces/:workspaceId/environments
 * @desc    Get all environments in a workspace
 * @access  Private (workspace member required)
 */
router.get('/workspaces/:workspaceId/environments', authenticateToken, requireReadPermission, getEnvironments);

/**
 * @route   POST /api/workspaces/:workspaceId/environments
 * @desc    Create a new environment in a workspace
 * @access  Private (workspace member required)
 */
router.post('/workspaces/:workspaceId/environments', authenticateToken, requireReadPermission, createEnvironment);

/**
 * @route   GET /api/environments/:id
 * @desc    Get a specific environment by ID
 * @access  Private (workspace member required)
 */
router.get('/environments/:id', authenticateToken, getEnvironment);

/**
 * @route   PUT /api/environments/:id
 * @desc    Update an environment
 * @access  Private (editor/admin/owner required)
 */
router.put('/environments/:id', authenticateToken, updateEnvironment);

/**
 * @route   DELETE /api/environments/:id
 * @desc    Delete an environment
 * @access  Private (admin/owner required)
 */
router.delete('/environments/:id', authenticateToken, deleteEnvironment);

module.exports = router;
