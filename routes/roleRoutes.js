const express = require('express');
const router = express.Router();
const { getWorkspaceRoles, assignRole, updateUserRole, removeUserFromWorkspace } = require('../controllers/roleController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission, requireEditPermission } = require('./middleware/roleMiddleware');

router.get('/workspaces/:id/roles', authenticateToken, requireReadPermission, getWorkspaceRoles);
router.post('/workspaces/:id/roles', authenticateToken, requireEditPermission, assignRole);
router.put('/workspaces/:id/roles/:userId', authenticateToken, requireEditPermission, updateUserRole);
router.delete('/workspaces/:id/roles/:userId', authenticateToken, requireEditPermission, removeUserFromWorkspace);

module.exports = router;