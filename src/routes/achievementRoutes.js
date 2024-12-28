const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const serviceAuthMiddleware = require('../middleware/serviceAuthMiddleware');
const playerAuthMiddleware = require('../middleware/playerAuthMiddleware');

router.get('/players/:playerId/achievements', playerAuthMiddleware, achievementController.getAchievements);
router.get('/achievements/config', playerAuthMiddleware, achievementController.getConfig);
router.post('/achievements/track',serviceAuthMiddleware, achievementController.trackProgress);

module.exports = router;