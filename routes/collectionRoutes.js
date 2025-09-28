const express = require('express');
const router = express.Router();
const { getCollections, getCollection, createCollection, updateCollection, deleteCollection } = require('../controllers/collectionController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission } = require('./middleware/roleMiddleware');

router.get('/workspaces/:workspaceId/collections', authenticateToken, requireReadPermission, getCollections);
router.post('/workspaces/:workspaceId/collections', authenticateToken, requireReadPermission, createCollection);
router.get('/collections/:id', authenticateToken, getCollection);
router.put('/collections/:id', authenticateToken, updateCollection);
router.delete('/collections/:id', authenticateToken, deleteCollection);

module.exports = router;