const express = require('express');
const router = express.Router();
const { getWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, getWorkspaceMembers } = require('../controllers/workspaceController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission, requireEditPermission, requireWorkspaceOwner } = require('./middleware/roleMiddleware');

/**
 * @route   GET /api/workspaces
 * @desc    Get all workspaces for the authenticated user
 * @access  Private
 */
router.get('/', authenticateToken, getWorkspaces);

/**
 * @route   POST /api/workspaces
 * @desc    Create a new workspace
 * @access  Private
 */
router.post('/', authenticateToken, createWorkspace);

/**
 * @route   GET /api/workspaces/:id
 * @desc    Get a specific workspace by ID
 * @access  Private (workspace member required)
 */
router.get('/:id', authenticateToken, requireReadPermission, getWorkspace);

/**
 * @route   PUT /api/workspaces/:id
 * @desc    Update a workspace
 * @access  Private (admin/owner required)
 */
router.put('/:id', authenticateToken, requireEditPermission, updateWorkspace);

/**
 * @route   DELETE /api/workspaces/:id
 * @desc    Delete a workspace
 * @access  Private (owner required)
 */
router.delete('/:id', authenticateToken, requireWorkspaceOwner, deleteWorkspace);

/**
 * @route   GET /api/workspaces/:id/members
 * @desc    Get workspace members
 * @access  Private (workspace member required)
 */
router.get('/:id/members', authenticateToken, requireReadPermission, getWorkspaceMembers);

module.exports = router;
