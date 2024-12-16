const express = require('express');
const droneConfigController = require('../controllers/droneConfigController');
const { authenticate } = require('../middleware/auth'); // If you have auth middleware

const router = express.Router();

// Get current drone spawn configuration
router.get('/drone-config', authenticate, droneConfigController.getConfig);

// Update drone spawn configuration
router.put('/drone-config', authenticate, droneConfigController.updateConfig);

// Reset to default configuration
router.post('/drone-config/reset', authenticate, droneConfigController.resetConfig);

module.exports = router;