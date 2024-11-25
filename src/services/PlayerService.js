const Player = require('../models/Player');
const logger = require('../utils/logger');

class PlayerService {
  async updatePlayerStatus(playerId) {
    try {
      await Player.findOneAndUpdate(
        { playerId },
        { lastActive: new Date() },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error updating player status:', error);
    }
  }

  async getPlayerStats(playerId) {
    try {
      return await Player.findOne({ playerId });
    } catch (error) {
      logger.error('Error getting player stats:', error);
      return null;
    }
  }
}

module.exports = PlayerService;
