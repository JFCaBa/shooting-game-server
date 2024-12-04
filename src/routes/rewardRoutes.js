const express = require('express');
const rewardController = require('../controllers/rewardController');

const router = express.Router();

router.post('/rewards/:playerId', rewardController.addReward);
router.get('/rewards/:playerId', rewardController.getPlayerRewards);
router.get('/rewards/config', rewardController.getRewardConfig);

module.exports = router;