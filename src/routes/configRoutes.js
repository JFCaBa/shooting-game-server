const express = require('express');
const router = express.Router();
const serviceAuthMiddleware = require('../middleware/serviceAuthMiddleware');

// Public routes
router.get('/config', serviceAuthMiddleware, (req, res) => {
});

// Protected routes - require service authentication
router.put('/config', serviceAuthMiddleware, (req, res) => {
});

module.exports = router;