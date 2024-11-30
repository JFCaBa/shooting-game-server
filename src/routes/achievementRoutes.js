const express = require('express');
const router = express.Router();
const AchievementController = require('../controllers/AchievementController');

router.get('/players/:playerId/achievements', AchievementController.getAchievements);
router.post('/achievements/track', AchievementController.trackProgress);

module.exports = router;
