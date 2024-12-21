const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');
const droneService = require('../services/DroneService');
const RewardHistory = require('../models/RewardHistory');
const gameConfig = require('../config/gameConfig');

class DroneHandler {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.playerService = new PlayerService();
        this.droneGenerationInterval = null;
    }

    async handleShotDrone(data, playerId) {
        const isHit = await droneService.validateDroneShot(data);
        if (isHit) {
            await Player.findOneAndUpdate(
                { playerId },
                { 
                    $inc: { 'stats.droneHits': 1 },
                    $set: { lastUpdate: new Date() }
                }
            );

            await RewardHistory.create({
                playerId: playerId,
                rewardType: 'DRONE',
                amount: gameConfig.TOKENS.DRONE, 
            })
            await this.playerService.updateMintedBalance(playerId, gameConfig.TOKENS.DRONE);
            await this.wsManager.sendMessageToPlayer({
                type: 'droneShootConfirmed',
                playerId: playerId,
                data: {
                    droneId: data.data.drone.droneId,
                    position: data.data.drone.position,
                    reward: gameConfig.TOKENS.DRONE
                }
            }, playerId);
        } else {
            await this.wsManager.sendMessageToPlayer({
                type: 'droneShootRejected',
                playerId: playerId,
                data: {
                    droneId: data.data.drone.droneId,
                    position: data.data.drone.position,
                    reward: 0
                }
            }, playerId);
        }
    }

    startDroneGeneration() {
        if (this.droneGenerationInterval) {
            clearInterval(this.droneGenerationInterval);
        }

        this.droneGenerationInterval = setInterval(async () => {
            try {
                for (const [playerId, ws] of this.wsManager.clients.entries()) {
                    const currentDroneCount = droneService.getDroneCount(playerId);
                    if (currentDroneCount >= gameConfig.MAX_DRONES_PER_PLAYER) {
                        continue;
                    }

                    const drone = await droneService.generateDrone(playerId);
                    if (drone) {
                        const message = {
                            type: 'newDrone',
                            playerId: playerId,
                            data: {
                                droneId: drone.droneId,
                                position: drone.position,
                                reward: gameConfig.TOKENS.DRONE,
                            },
                        };

                        await this.wsManager.sendMessageToPlayer(message, playerId);
                        logger.info(`Generated new drone for player ${playerId}`);
                    }
                }
            } catch (error) {
                logger.error(`Drone generation error: ${error.message}`);
            }
        }, 10000); // Generate every 10 seconds
    }

    stopDroneGeneration() {
        if (this.droneGenerationInterval) {
            clearInterval(this.droneGenerationInterval);
            this.droneGenerationInterval = null;
        }
    }

    async removePlayerDrones(playerId) {
        try {
            await droneService.removePlayerDrones(playerId);
        } catch (error) {
            logger.error(`Error removing drones for player ${playerId}:`, error);
        }
    }

    async cleanup() {
        this.stopDroneGeneration();
    }
}

module.exports = DroneHandler;