const express = require('express');
const TokenController = require('../controllers/TokenController');
const serviceAuthMiddleware = require('../middleware/serviceAuthMiddleware');
const playerAuthMiddleware = require('../middleware/playerAuthMiddleware');


const router = express.Router();
const tokenController = new TokenController();

router.get('/balance/:walletAddress', playerAuthMiddleware, (req, res) => tokenController.getBalance(req, res));
router.post('/claim/:walletAddress', serviceAuthMiddleware, (req, res) => tokenController.claimTokens(req, res));

module.exports = router;
