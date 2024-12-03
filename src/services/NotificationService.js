const Player = require('../models/Player');
const FirebaseService = require('./FirebaseService');
const logger = require('../utils/logger');

class NotificationService {
    async notifyPlayersAboutNewJoin(playerData) {
        try {
            // Fetch all players except the one joining (exclude playerId) and ensure they have valid push tokens
            const allPlayers = await Player.find({
                playerId: { $ne: playerData.playerId }, // Exclude the joining player
                pushToken: { $exists: true, $ne: null }, // Only players with push tokens
            });
    
            // Extract valid tokens and remove duplicates
            const validTokens = [
                ...new Set(
                    allPlayers.map(player => player.pushToken).filter(Boolean)
                ),
            ];
    
            if (validTokens.length > 0) {
                // Notify all other players about the new join
                await FirebaseService.sendPlayerJoinedNotification(validTokens, playerData);
                logger.info(`Join notification sent to ${validTokens.length} unique players`);
            } else {
                logger.info('No players with valid push tokens found');
            }
        } catch (error) {
            logger.error('Error sending join notifications:', error);
            throw error;
        }
    }

    async notifyPlayerLocation(player, nearbyPlayers) {
        try {
            const tokens = nearbyPlayers
                .map(p => p.pushToken)
                .filter(Boolean);

            if (tokens.length > 0) {
                await FirebaseService.sendPlayerLocationUpdate(tokens, {
                    playerId: player.playerId,
                    location: player.location
                });
            }
        } catch (error) {
            logger.error('Error sending location notifications:', error);
            throw error;
        }
    }
}

module.exports = new NotificationService();