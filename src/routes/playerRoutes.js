const express = require('express');
const playerController = require('../controllers/playerController');
const playerAuthMiddleware = require('../middleware/playerAuthMiddleware');

const router = express.Router();

// GET
router.get('/players/:playerId/tokens', playerController.getTokenBalance);
router.get('/players/:playerId/stats', playerController.getPlayerStats);
router.get('/players/:playerId/details', playerAuthMiddleware, playerController.getPlayerDetails);
// POST
router.post('/players/transfer', playerAuthMiddleware, playerController.transferTokens);
router.post('/players/adReward', playerAuthMiddleware, playerController.adReward)
// PUT
router.put('/players/addWallet', playerAuthMiddleware, playerController.addWalletAddress);
router.put('/players/addPlayerDetails', playerController.addPlayerDetails);
router.put('/players/updatePlayerDetails', playerAuthMiddleware, playerController.updatePlayerDetails);

module.exports = router;