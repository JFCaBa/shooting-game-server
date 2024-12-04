const express = require('express');
const playerController = require('../controllers/playerController');


const router = express.Router();

router.get('/players/:playerId/tokens', playerController.getTokenBalance);
router.post('/players/transfer', playerController.transferTokens);
router.post('/players/adReward', playerController.adReward)
router.get('/players/:playerId/stats', playerController.getPlayerStats);

module.exports = router;