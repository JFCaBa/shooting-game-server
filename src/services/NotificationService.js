const Player = require('../models/Player');
const FirebaseService = require('./FirebaseService');
const logger = require('../utils/logger');

class NotificationService {
    async notifyPlayersAboutNewJoin(playerData, playerId) {
        try {
            const allPlayers = await Player.find({
                playerId: { $ne: playerData.playerId },
                pushToken: { $exists: true, $ne: null }
            });

            const validTokens = allPlayers
                .filter(player => player.pushToken && player.pushToken.length > 0 && player.playerId != playerId)
                .map(player => player.pushToken);

            if (validTokens.length > 0) {
                await FirebaseService.sendPlayerJoinedNotification(validTokens, playerData);
                logger.info(`Sent join notifications to ${validTokens.length} players`);
            } else {
                logger.info('No players with valid push tokens found');
            }
        } catch (error) {
            logger.error('Error sending join notifications:', error);
        }
    }
}

module.exports = NotificationService;