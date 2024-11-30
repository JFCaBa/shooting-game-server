const Player = require('../models/Player');
const logger = require('../utils/logger');

module.exports = class UserService {
    async createPlayer(walletAddress) {
        try {
            const player = new Player({
                playerId: walletAddress,
                walletAddress: walletAddress,
                stats: {
                    kills: 0,
                    hits: 0,
                    deaths: 0
                },
                lastActive: new Date()
            });

            await player.save();
            logger.info(`Created new player with wallet: ${walletAddress}`);
            return player;
        } catch (error) {
            logger.error('Error creating player:', error);
            throw error;
        }
    }
}
