const Player = require("../models/Player");
const FirebaseService = require("./FirebaseService");
const logger = require("../utils/logger");

const COORDINATE_PRECISION = 1; // Approximately 11km at equator

class NotificationService {
  async notifyPlayersAboutNewJoin(player) {
    if (!player?.location) {
      return;
    }

    try {
      if (!player?.location?.latitude || !player?.location?.longitude) {
        logger.info(
          "Player location not available, skipping proximity notifications"
        );
        return;
      }

      const playerLat =
        Math.round(
          player.location.latitude * Math.pow(10, COORDINATE_PRECISION)
        ) / Math.pow(10, COORDINATE_PRECISION);
      const playerLon =
        Math.round(
          player.location.longitude * Math.pow(10, COORDINATE_PRECISION)
        ) / Math.pow(10, COORDINATE_PRECISION);

      // Find nearby players with valid push tokens
      const nearbyPlayers = await Player.find({
        playerId: { $ne: player.playerId },
        pushToken: { $exists: true, $ne: null },
        lastActive: { $gte: new Date(Date.now() - 5 * 60000) },
        "location.latitude": { $exists: true },
        "location.longitude": { $exists: true },
      });

      const validNearbyPlayers = nearbyPlayers.filter((otherPlayer) => {
        const otherLat =
          Math.round(
            otherPlayer.location.latitude * Math.pow(10, COORDINATE_PRECISION)
          ) / Math.pow(10, COORDINATE_PRECISION);
        const otherLon =
          Math.round(
            otherPlayer.location.longitude * Math.pow(10, COORDINATE_PRECISION)
          ) / Math.pow(10, COORDINATE_PRECISION);
        return playerLat === otherLat && playerLon === otherLon;
      });

      const validTokens = [
        ...new Set(validNearbyPlayers.map((p) => p.pushToken).filter(Boolean)),
      ];

      if (validTokens.length > 0) {
        await FirebaseService.sendPlayerJoinedNotification(validTokens, player);
        logger.info(
          `Join notification sent to ${validTokens.length} nearby players`
        );
      } else {
        logger.info("No nearby players with valid push tokens found");
      }
    } catch (error) {
      logger.error("Error sending join notifications:", error);
      throw error;
    }
  }

  async notifyPlayerLocation(player, nearbyPlayers) {
    try {
      const tokens = nearbyPlayers.map((p) => p.pushToken).filter(Boolean);

      if (tokens.length > 0) {
        await FirebaseService.sendPlayerLocationUpdate(tokens, {
          playerId: player.playerId,
          location: player.location,
        });
      }
    } catch (error) {
      logger.error("Error sending location notifications:", error);
      throw error;
    }
  }

  async hasNearbyPlayers(playerId) {
    try {
      const player = await Player.findOne({ playerId });
      if (!player?.location?.latitude || !player?.location?.longitude)
        return false;

      const activePlayers = await Player.find({
        playerId: { $ne: playerId },
        lastActive: { $gte: new Date(Date.now() - 5 * 60000) },
      });

      const playerLat =
        Math.round(
          player.location.latitude * Math.pow(10, COORDINATE_PRECISION)
        ) / Math.pow(10, COORDINATE_PRECISION);
      const playerLon =
        Math.round(
          player.location.longitude * Math.pow(10, COORDINATE_PRECISION)
        ) / Math.pow(10, COORDINATE_PRECISION);

      return activePlayers.some((otherPlayer) => {
        if (!otherPlayer.location?.latitude || !otherPlayer.location?.longitude)
          return false;
        const otherLat =
          Math.round(
            otherPlayer.location.latitude * Math.pow(10, COORDINATE_PRECISION)
          ) / Math.pow(10, COORDINATE_PRECISION);
        const otherLon =
          Math.round(
            otherPlayer.location.longitude * Math.pow(10, COORDINATE_PRECISION)
          ) / Math.pow(10, COORDINATE_PRECISION);
        return playerLat === otherLat && playerLon === otherLon;
      });
    } catch (error) {
      logger.error(`Error checking nearby players for ${playerId}:`, error);
      return false;
    }
  }
}

module.exports = new NotificationService();
