const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');
const geoObjectService = require('../services/GeoObjectService');
const RewardHistory = require('../models/RewardHistory');
const Player = require('../models/Player');
const gameConfig = require('../config/gameConfig');
const WebSocket = require('ws');

class GeoObjectHandler {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.playerService = new PlayerService();
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

                await this.startGeoObjectGeneration(data.data.player);
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

    async startGeoObjectGeneration(player) {
        try {
            if (!player || !player.data.location) {
                logger.warn(`No location data for player ${player.playerId}`);
                return;
            }
    
            const geoObject = await geoObjectService.generateGeoObject(player.playerId, player.data.location);
            if (geoObject) {
                const message = {
                    type: 'newGeoObject',
                    playerId: player.playerId,
                    data: geoObject
                };
        
                const ws = this.wsManager.clients.get(player.playerId);
                if (!ws) {
                    logger.error(`WebSocket not found for player ${player.playerId}`);
                    return;
                }
                if (ws.readyState !== WebSocket.OPEN) {
                    logger.error(`WebSocket for player ${player.playerId} is not open. ReadyState: ${ws.readyState}`);
                    return;
                }
    
                await this.wsManager.sendMessageToPlayer(message, player.playerId);
                logger.info(`GeoObject ${geoObject.id} sent to player ${player.playerId}`);
            }
        } catch (error) {
            logger.error('Error in geo object generation:', error);
        }
    }

    stopGeoObjectGeneration() {
        if (this.generationInterval) {
            clearInterval(this.generationInterval);
            this.generationInterval = null;
        }
    }

    async removeAllGeoObjects(playerId) {
        await geoObjectService.cleanupPlayerObjects(playerId)
    }

    async cleanup() {
        this.stopGeoObjectGeneration();
    }
}

module.exports = GeoObjectHandler;