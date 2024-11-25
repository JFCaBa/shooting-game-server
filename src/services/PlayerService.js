const Player = require('../models/Player');
const logger = require('../utils/logger');

class PlayerService {
  async updatePlayerStatus(playerId, playerData) {
    try {
      return await Player.findOneAndUpdate(
        { playerId },
        { 
          $set: {
            lastActive: new Date(),
            location: playerData?.location,
            heading: playerData?.heading
          }
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error('Error updating player status:', error);
    }
  }

  async getActivePlayers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return await Player.find({
      lastActive: { $gte: fiveMinutesAgo }
    });
  }

  async removeInactivePlayers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return await Player.deleteMany({
      lastActive: { $lt: fiveMinutesAgo }
    });
  }
}

module.exports = PlayerService;