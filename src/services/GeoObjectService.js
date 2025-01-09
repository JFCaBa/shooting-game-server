const GeoObject = require("../models/GeoObject");
const logger = require("../utils/logger");
const crypto = require("crypto");
const gameConfig = require("../config/gameConfig");

class GeoObjectService {
  constructor() {
    this.activeGeoObjects = new Map(); // player -> geoObject
  }

  // MARK: - getRandomLocation

  getRandomLocation(baseLocation, minDistance, maxDistance) {
    // Generate a random offset between minDistance and maxDistance
    const getRandomOffset = () =>
      minDistance + Math.random() * (maxDistance - minDistance);

    // Calculate offset
    const lat = baseLocation.latitude + getRandomOffset();
    const lon = baseLocation.longitude + getRandomOffset();

    return {
      accuracy: 0,
      latitude: lat,
      longitude: lon,
      altitude: baseLocation.altitude || 0,
    };
  }

  // MARK: - generateGeoObject

  async generateGeoObject(playerId, playerLocation) {
    try {
      // Check if player already has an active object
      const existingObject = this.activeGeoObjects.get(playerId);
      if (existingObject) {
        return null;
      }

      const id = crypto.randomBytes(16).toString("hex");
      const type =
        gameConfig.GEO_OBJECT.TYPES[
          Math.floor(Math.random() * gameConfig.GEO_OBJECT.TYPES.length)
        ];

      // const type = gameConfig.GEO_OBJECT.TYPES[2];

      const coordinate = this.getRandomLocation(
        playerLocation,
        gameConfig.GEO_OBJECT.MIN_RADIUS,
        gameConfig.GEO_OBJECT.MAX_RADIUS
      );

      const geoObject = new GeoObject({
        id,
        type,
        coordinate,
        metadata: {
          reward: this.getRewardForType(type),
          spawnedAt: new Date(),
        },
      });

      await geoObject.save();
      this.activeGeoObjects.set(playerId, geoObject);

      // logger.info(
      //   `Generated new geo object for player ${playerId} of type ${type}`
      // );
      return geoObject;
    } catch (error) {
      logger.error("Error generating geo object:", error);
      throw error;
    }
  }

  // MARK: - getRewardForType

  getRewardForType(type) {
    const rewards = {
      weapon: gameConfig.TOKENS.WEAPON || 5,
      target: gameConfig.TOKENS.TARGET || 3,
      powerup: gameConfig.TOKENS.POWERUP || 4,
    };
    return rewards[type] || 0;
  }

  // MARK: - validateGeoObjectHit

  async validateGeoObjectHit(objectId, playerId) {
    if (!objectId || !playerId) {
      logger.warn("Missing objectId or playerId in request");
      return false;
    }

    try {
      const geoObject = this.activeGeoObjects.get(playerId);

      if (!geoObject || geoObject.id !== objectId) {
        logger.warn(
          `GeoObject ${objectId} not found or doesn't belong to player ${playerId}`
        );
        return false;
      }

      // Remove from memory and database
      this.activeGeoObjects.delete(playerId);
      await GeoObject.findOneAndDelete({ id: objectId });

      logger.info(
        `GeoObject ${objectId} successfully collected by player ${playerId}`
      );
      return {
        success: true,
        reward: geoObject.metadata.reward,
      };
    } catch (error) {
      logger.error(
        `Error validating geo object hit for player ${playerId}:`,
        error
      );
      return false;
    }
  }

  // MARK: - cleanupPlayerObjects

  async cleanupPlayerObjects(playerId) {
    try {
      const geoObject = this.activeGeoObjects.get(playerId);
      if (geoObject) {
        this.activeGeoObjects.delete(playerId);
        await GeoObject.findOneAndDelete({ id: geoObject.id });
        logger.info(`Cleaned up geo object for player ${playerId}`);
      }
    } catch (error) {
      logger.error(
        `Error cleaning up geo objects for player ${playerId}:`,
        error
      );
    }
  }
}

module.exports = new GeoObjectService();
