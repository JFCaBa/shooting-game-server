const express = require('express');
const playerController = require('../controllers/playerController');

const router = express.Router();

router.get('/players/:playerId/tokens', playerController.getTokenBalance);
router.post('/players/transfer', playerController.transferTokens);

module.exports = router;