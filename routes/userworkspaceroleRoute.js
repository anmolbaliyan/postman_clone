const express = require('express');
const router = express.Router();
const {
    getMembers,
    addMember,
    updateMemberRole,
    removeMember
} = require('../controllers/userworkspaceroleController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission, requireEditPermission } = require('./middleware/roleMiddleware');

// List members and their roles in a workspace
router.get('/workspaces/:id/members', authenticateToken, requireReadPermission, getMembers);

// Add a member (assign role) to a workspace
router.post('/workspaces/:id/members', authenticateToken, requireEditPermission, addMember);

// Update a member's role in a workspace
router.put('/workspaces/:id/members/:userId', authenticateToken, requireEditPermission, updateMemberRole);

// Remove a member from a workspace
router.delete('/workspaces/:id/members/:userId', authenticateToken, requireEditPermission, removeMember);

module.exports = router;


