const GeoObject = require('../models/GeoObject');
const logger = require('../utils/logger');
const crypto = require('crypto');
const gameConfig = require('../config/gameConfig');

class GeoObjectService {
    constructor() {
        this.activeGeoObjects = new Map();
    }

    async generateGeoObject(type, coordinate) {
        try {
            const id = crypto.randomBytes(16).toString('hex');
            
            const geoObject = new GeoObject({
                id,
                type,
                coordinate,
                metadata: {
                    reward: this.getRewardForType(type),
                    spawnedAt: new Date(),
                    expiresAt: this.calculateExpiryTime(type)
                }
            });

            await geoObject.save();
            this.activeGeoObjects.set(id, geoObject);
            return geoObject;
        } catch (error) {
            logger.error('Error generating geo object:', error);
            throw error;
        }
    }

    getRewardForType(type) {
        const rewards = {
            'weapon': gameConfig.TOKENS.WEAPON || 5,
            'target': gameConfig.TOKENS.TARGET || 10,
            'powerup': gameConfig.TOKENS.POWERUP || 1
        };
        return rewards[type] || 0;
    }

    calculateExpiryTime(type) {
        const durations = {
            'weapon': 1800000,  // 30 minutes
            'target': 3600000,  // 1 hour
            'powerup': 900000   // 15 minutes
        };
        return new Date(Date.now() + (durations[type] || 3600000));
    }

    async validateGeoObjectHit(data) {
        const objectId = data.data?.geoObject?.id;
        const playerId = data.playerId;

        if (!objectId || !playerId) {
            logger.warn('Missing objectId or playerId in request');
            return false;
        }

        try {
            const geoObject = this.activeGeoObjects.get(objectId);

            if (!geoObject) {
                logger.warn(`GeoObject ${objectId} not found or already collected`);
                return false;
            }

            if (geoObject.metadata.expiresAt && geoObject.metadata.expiresAt < new Date()) {
                logger.warn(`GeoObject ${objectId} has expired`);
                await this.removeGeoObject(objectId);
                return false;
            }

            // Remove from memory and database
            this.activeGeoObjects.delete(objectId);
            await GeoObject.findOneAndDelete({ id: objectId });

            logger.info(`GeoObject ${objectId} successfully collected by player ${playerId}`);
            return {
                success: true,
                reward: geoObject.metadata.reward
            };
        } catch (error) {
            logger.error(`Error validating geo object hit for player ${playerId}:`, error);
            return false;
        }
    }

    async removeGeoObject(objectId) {
        try {
            this.activeGeoObjects.delete(objectId);
            await GeoObject.findOneAndDelete({ id: objectId });
        } catch (error) {
            logger.error('Error removing geo object:', error);
        }
    }

    async removeExpiredObjects() {
        const now = new Date();
        for (const [id, geoObject] of this.activeGeoObjects.entries()) {
            if (geoObject.metadata.expiresAt && geoObject.metadata.expiresAt < now) {
                await this.removeGeoObject(id);
            }
        }
    }
}

module.exports = new GeoObjectService();