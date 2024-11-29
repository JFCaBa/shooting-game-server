const express = require('express');
const TokenController = require('../controllers/TokenController');

const router = express.Router();
const tokenController = new TokenController();

router.get('/balance/:walletAddress', (req, res) => tokenController.getBalance(req, res));
router.post('/claim/:walletAddress', (req, res) => tokenController.claimTokens(req, res));

module.exports = router;
