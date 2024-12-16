const express = require('express');
const router = express.Router();
const serviceAuthMiddleware = require('../middleware/serviceAuthMiddleware');

// Public routes
router.get('/config', (req, res) => {
    // Public access to configuration
});

// Protected routes - require service authentication
router.put('/config', serviceAuthMiddleware, (req, res) => {
    // Only CMS can update configuration
});

module.exports = router;