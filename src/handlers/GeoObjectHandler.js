const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');
const AchievementService = require('../services/AchievementService');
const RewardHistory = require('../models/RewardHistory');
const Player = require('../models/Player');
const gameConfig = require('../config/gameConfig');
const geoObjectService = require('../services/GeoObjectService');

class GeoObjectHandler {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.playerService = new PlayerService();
        this.activeObjects = new Map();
        this.generationInterval = null;
    }

    async handleGeoObjectHit(data, playerId) {
        try {
            const result = await geoObjectService.validateGeoObjectHit(data);
            
            if (result.success) {
                // Update player's balance and save reward history
                await this.playerService.updateBalance(playerId, result.reward);
                await new RewardHistory({
                    playerId,
                    rewardType: 'GEO_OBJECT',
                    amount: result.reward
                }).save();

                // Update player stats
                await Player.findOneAndUpdate(
                    { playerId },
                    { $inc: { 'stats.geoObjectsCollected': 1 } }
                );

                // Track achievement
                const player = await Player.findOne({ playerId });
                if (player) {
                    await AchievementService.trackAchievement(
                        playerId, 
                        'geoObjectsCollected', 
                        player.stats.geoObjectsCollected + 1
                    );
                }

                // Send confirmation to player
                await this.wsManager.sendMessageToPlayer({
                    type: 'geoObjectShootConfirmed',
                    playerId: playerId,
                    data: {
                        geoObject: data.data.geoObject,
                        reward: result.reward
                    }
                }, playerId);

                logger.info(`Player ${playerId} collected geo object ${data.data.geoObject.id} for ${result.reward} tokens`);
            } else {
                await this.wsManager.sendMessageToPlayer({
                    type: 'geoObjectShootRejected',
                    playerId: playerId,
                    data: {
                        geoObject: data.data.geoObject,
                        reason: 'Object not found or already collected'
                    }
                }, playerId);
            }
        } catch (error) {
            logger.error('Error handling geo object hit:', error);
            throw error;
        }
    }

    async startGeoObjectGeneration() {
        if (this.generationInterval) {
            clearInterval(this.generationInterval);
        }

        this.generationInterval = setInterval(async () => {
            try {
                await geoObjectService.removeExpiredObjects();

                const types = ['weapon', 'target', 'powerup'];
                const type = types[Math.floor(Math.random() * types.length)];
                
                const coordinate = {
                    latitude: this.randomInRange(-90, 90),
                    longitude: this.randomInRange(-180, 180),
                    altitude: this.randomInRange(0, 100)
                };

                const geoObject = await geoObjectService.generateGeoObject(type, coordinate);
                
                // Broadcast new object to all connected players
                const message = {
                    type: 'newGeoObject',
                    data: {
                        geoObject: geoObject.toJSON()
                    }
                };

                this.wsManager.broadcastToAll(message);
                logger.info(`Generated new geo object of type ${type}`);
                
            } catch (error) {
                logger.error('Error in geo object generation:', error);
            }
        }, 300000); // Generate every 5 minutes
    }

    stopGeoObjectGeneration() {
        if (this.generationInterval) {
            clearInterval(this.generationInterval);
            this.generationInterval = null;
        }
    }

    randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    async cleanup() {
        this.stopGeoObjectGeneration();
        await geoObjectService.removeExpiredObjects();
    }
}

module.exports = GeoObjectHandler;