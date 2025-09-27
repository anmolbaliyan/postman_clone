const express = require('express');
const router = express.Router();
const { executeRequest, getRequestHistory, getWorkspaceHistory, deleteHistoryEntry } = require('../controllers/requestHistoryController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission } = require('./middleware/roleMiddleware');

/**
 * @route   POST /api/requests/:id/execute
 * @desc    Execute a request and save the history
 * @access  Private (workspace member required)
 */
router.post('/requests/:id/execute', authenticateToken, executeRequest);

/**
 * @route   GET /api/requests/:id/history
 * @desc    Get request execution history
 * @access  Private (workspace member required)
 */
router.get('/requests/:id/history', authenticateToken, getRequestHistory);

/**
 * @route   GET /api/workspaces/:id/history
 * @desc    Get workspace execution history
 * @access  Private (workspace member required)
 */
router.get('/workspaces/:id/history', authenticateToken, requireReadPermission, getWorkspaceHistory);

/**
 * @route   DELETE /api/history/:id
 * @desc    Delete specific history entry
 * @access  Private (executor or admin/owner required)
 */
router.delete('/history/:id', authenticateToken, deleteHistoryEntry);

module.exports = router;
