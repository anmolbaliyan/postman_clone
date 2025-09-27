const express = require('express');
const router = express.Router();
const { getRequests, getRequest, createRequest, updateRequest, deleteRequest } = require('../controllers/requestController');
const { authenticateToken } = require('./middleware/authMiddleware');
const { requireReadPermission } = require('./middleware/roleMiddleware');

/**
 * @route   GET /api/collections/:collectionId/requests
 * @desc    Get all requests in a collection
 * @access  Private (workspace member required)
 */
router.get('/collections/:collectionId/requests', authenticateToken, getRequests);

/**
 * @route   POST /api/collections/:collectionId/requests
 * @desc    Create a new request in a collection
 * @access  Private (workspace member required)
 */
router.post('/collections/:collectionId/requests', authenticateToken, requireReadPermission, createRequest);

/**
 * @route   GET /api/requests/:id
 * @desc    Get a specific request by ID
 * @access  Private (workspace member required)
 */
router.get('/requests/:id', authenticateToken, getRequest);

/**
 * @route   PUT /api/requests/:id
 * @desc    Update a request
 * @access  Private (editor/admin/owner required)
 */
router.put('/requests/:id', authenticateToken, updateRequest);

/**
 * @route   DELETE /api/requests/:id
 * @desc    Delete a request
 * @access  Private (admin/owner required)
 */
router.delete('/requests/:id', authenticateToken, deleteRequest);

module.exports = router;
