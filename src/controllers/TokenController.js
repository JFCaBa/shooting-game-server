const TokenService = require('../services/TokenService');
const logger = require('../utils/logger');

class TokenController {
    constructor() {
        this.tokenService = new TokenService();
    }

    async getBalance(req, res) {
        try {
            const { walletAddress } = req.params;
            const balance = await this.tokenService.getBalance(walletAddress);
            res.json(balance);
        } catch (error) {
            logger.error('Error in getBalance:', error);
            res.status(500).json({ error: 'Failed to get token balance' });
        }
    }

    async claimTokens(req, res) {
        try {
            const { walletAddress } = req.params;
            const result = await this.tokenService.claimTokens(walletAddress);
            res.json(result);
        } catch (error) {
            logger.error('Error in claimTokens:', error);
            res.status(500).json({ error: 'Failed to claim tokens' });
        }
    }
}

module.exports = TokenController;