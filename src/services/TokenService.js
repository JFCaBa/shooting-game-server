const Token = require('../models/Token');
const logger = require('../utils/logger');

class TokenService {
    static TOKENS_PER_HIT = 1;
    static TOKENS_PER_KILL = 5;

    async getTokenBalance(walletAddress) {
        try {
            const token = await Token.findOne({ walletAddress });
            return {
                balance: token?.balance || 0,
                pendingBalance: token?.pendingBalance || 0
            };
        } catch (error) {
            logger.error('Error getting token balance:', error);
            throw error;
        }
    }

    async addTokensForHit(walletAddress) {
        try {
            await Token.findOneAndUpdate(
                { walletAddress },
                { 
                    $inc: { pendingBalance: TokenService.TOKENS_PER_HIT },
                    $set: { lastUpdated: new Date() }
                },
                { upsert: true }
            );
            logger.info(`Added ${TokenService.TOKENS_PER_HIT} tokens for hit to ${walletAddress}`);
        } catch (error) {
            logger.error('Error adding tokens for hit:', error);
            throw error;
        }
    }

    async addTokensForKill(walletAddress) {
        try {
            await Token.findOneAndUpdate(
                { walletAddress },
                { 
                    $inc: { pendingBalance: TokenService.TOKENS_PER_KILL },
                    $set: { lastUpdated: new Date() }
                },
                { upsert: true }
            );
            logger.info(`Added ${TokenService.TOKENS_PER_KILL} tokens for kill to ${walletAddress}`);
        } catch (error) {
            logger.error('Error adding tokens for kill:', error);
            throw error;
        }
    }

    async claimTokens(walletAddress) {
        try {
            const token = await Token.findOne({ walletAddress });
            if (!token) return { claimed: 0 };

            const amountToClaim = token.pendingBalance;
            token.balance += token.pendingBalance;
            token.pendingBalance = 0;
            token.lastUpdated = new Date();
            await token.save();

            return { claimed: amountToClaim };
        } catch (error) {
            logger.error('Error claiming tokens:', error);
            throw error;
        }
    }
}

module.exports = TokenService;