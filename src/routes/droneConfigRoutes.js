const express = require('express');
const router = express.Router();
const droneConfigController = require('../controllers/droneConfigController');
const serviceAuthMiddleware = require('../middleware/serviceAuthMiddleware');

// Public route for getting config
router.get('/drone-config', serviceAuthMiddleware, droneConfigController.getConfig);

// Protected route for updating config
router.put('/drone-config', serviceAuthMiddleware, droneConfigController.updateConfig);

module.exports = router;