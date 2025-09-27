const express = require('express');
const router = express.Router();
const { getWorkspaceRoles, assignRole, updateUserRole, removeUserFromWorkspace } = require('../controllers/roleController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission, requireEditPermission } = require('./middleware/roleMiddleware');

/**
 * @route   GET /api/workspaces/:id/roles
 * @desc    Get workspace roles and members
 * @access  Private (workspace member required)
 */
router.get('/workspaces/:id/roles', authenticateToken, requireReadPermission, getWorkspaceRoles);

/**
 * @route   POST /api/workspaces/:id/roles
 * @desc    Assign role to user in workspace
 * @access  Private (admin/owner required)
 */
router.post('/workspaces/:id/roles', authenticateToken, requireEditPermission, assignRole);

/**
 * @route   PUT /api/workspaces/:id/roles/:userId
 * @desc    Update user role in workspace
 * @access  Private (admin/owner required)
 */
router.put('/workspaces/:id/roles/:userId', authenticateToken, requireEditPermission, updateUserRole);

/**
 * @route   DELETE /api/workspaces/:id/roles/:userId
 * @desc    Remove user from workspace
 * @access  Private (admin/owner required)
 */
router.delete('/workspaces/:id/roles/:userId', authenticateToken, requireEditPermission, removeUserFromWorkspace);

module.exports = router;
