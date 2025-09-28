const express = require('express');
const router = express.Router();
const { getRequests, getRequest, createRequest, updateRequest, deleteRequest } = require('../controllers/requestController');
const { authenticateToken } = require('./middleware/authMiddleware');

router.get('/collections/:collectionId/requests', authenticateToken, getRequests);
router.get('/requests/:id', authenticateToken, getRequest);
router.post('/collections/:collectionId/requests', authenticateToken, createRequest);
router.put('/requests/:id', authenticateToken, updateRequest);
router.delete('/requests/:id', authenticateToken, deleteRequest);

module.exports = router;