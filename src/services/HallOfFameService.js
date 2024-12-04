const Player = require('../models/Player');
const logger = require('../utils/logger');

class HallOfFameService {
    async getTopPlayersByKills(limit = 10) {
        try {
            return await Player.find()
                .sort({ 'stats.kills': -1 })
                .limit(limit)
                .select('playerId stats.kills stats.hits');
        } catch (error) {
            logger.error('Error getting top players by kills:', error);
            throw error;
        }
    }

    async getTopPlayersByHits(limit = 10) {
        try {
            return await Player.find()
                .sort({ 'stats.hits': -1 })
                .limit(limit)
                .select('playerId stats.kills stats.hits');
        } catch (error) {
            logger.error('Error getting top players by hits:', error);
            throw error;
        }
    }
}

module.exports = HallOfFameService;