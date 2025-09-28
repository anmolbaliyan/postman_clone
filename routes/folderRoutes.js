const express = require('express');
const router = express.Router();
const { getFolders, getFolder, createFolder, updateFolder, deleteFolder } = require('../controllers/folderController');
const { authenticateToken } = require('./middleware/authMiddleware');

router.get('/collections/:collectionId/folders', authenticateToken, getFolders);
router.get('/folders/:id', authenticateToken, getFolder);
router.post('/collections/:collectionId/folders', authenticateToken, createFolder);
router.put('/folders/:id', authenticateToken, updateFolder);
router.delete('/folders/:id', authenticateToken, deleteFolder);

module.exports = router;