const express = require('express');
const router = express.Router();
const { getWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, getWorkspaceMembers } = require('../controllers/workspaceController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission, requireEditPermission, requireWorkspaceOwner } = require('./middleware/roleMiddleware');

router.get('/', authenticateToken, getWorkspaces);
router.post('/', authenticateToken, createWorkspace);
router.get('/:id', authenticateToken, requireReadPermission, getWorkspace);
router.put('/:id', authenticateToken, requireEditPermission, updateWorkspace);
router.delete('/:id', authenticateToken, requireWorkspaceOwner, deleteWorkspace);
router.get('/:id/members', authenticateToken, requireReadPermission, getWorkspaceMembers);

module.exports = router;