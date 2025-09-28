const express = require('express');
const router = express.Router();
const { executeRequest, getRequestHistory, getHistoryEntry, deleteHistoryEntry } = require('../controllers/requestHistoryController');
const { authenticateToken } = require('./middleware/authMiddleware');

router.post('/requests/:id/execute', authenticateToken, executeRequest);
router.get('/requests/:id/history', authenticateToken, getRequestHistory);
router.get('/history/:id', authenticateToken, getHistoryEntry);
router.delete('/history/:id', authenticateToken, deleteHistoryEntry);

module.exports = router;