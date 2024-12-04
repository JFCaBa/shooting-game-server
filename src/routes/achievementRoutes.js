const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');

router.get('/players/:playerId/achievements', achievementController.getAchievements);
router.get('/achievements/config', achievementController.getConfig);
router.post('/achievements/track', achievementController.trackProgress);

module.exports = router;