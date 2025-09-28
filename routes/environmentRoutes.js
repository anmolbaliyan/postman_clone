const express = require('express');
const router = express.Router();
const { getEnvironments, getEnvironment, createEnvironment, updateEnvironment, deleteEnvironment } = require('../controllers/environmentController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission, requireEditPermission } = require('./middleware/roleMiddleware');

router.get('/workspaces/:workspaceId/environments', authenticateToken, requireReadPermission, getEnvironments);
router.get('/environments/:id', authenticateToken, getEnvironment);
router.post('/workspaces/:workspaceId/environments', authenticateToken, requireEditPermission, createEnvironment);
router.put('/environments/:id', authenticateToken, requireEditPermission, updateEnvironment);
router.delete('/environments/:id', authenticateToken, requireEditPermission, deleteEnvironment);

module.exports = router;