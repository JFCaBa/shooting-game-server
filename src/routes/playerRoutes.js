const express = require('express');
const playerController = require('../controllers/playerController');

const router = express.Router();

// GET
router.get('/players/:playerId/tokens', playerController.getTokenBalance);
router.get('/players/:playerId/stats', playerController.getPlayerStats);
// POST
router.post('/players/transfer', playerController.transferTokens);
router.post('/players/adReward', playerController.adReward)
// PUT
router.put('/players/addWallet', playerController.addWalletAddress);
router.put('/players/addPlayerDetails', playerController.addPlayerDetails);

module.exports = router;