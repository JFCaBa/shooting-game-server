const logger = require("../utils/logger");
const PlayerService = require("../services/PlayerService");
const droneService = require("../services/DroneService");
const RewardHistory = require("../models/RewardHistory");
const Player = require("../models/Player"); // Add this import
const gameConfig = require("../config/gameConfig");

class DroneHandler {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.playerService = new PlayerService();
    this.droneGenerationInterval = null;
  }

  // MARK: - handleShotDrone

  async handleShotDrone(data, playerId) {
    try {
      const isValid = await droneService.validateDroneShot(data);
      if (isValid) {
        // Add reward tokens to player
        await this.playerService.updateBalance(
          playerId,
          gameConfig.TOKENS.DRONE
        );

        // Record reward history
        await new RewardHistory({
          playerId,
          rewardType: "DRONE",
          amount: gameConfig.TOKENS.DRONE,
        }).save();

        // Update player stats for drones
        await Player.findOneAndUpdate(
          { playerId },
          { $inc: { "stats.droneHits": 1 } }
        );

        // Send confirmation to player
        await this.wsManager.sendMessageToPlayer(
          {
            type: "droneShootConfirmed",
            playerId: playerId,
            data: {
              kind: "drone",
              droneId: data.data.droneId,
              position: data.data.position,
              reward: gameConfig.TOKENS.DRONE,
            },
          },
          playerId
        );

        logger.info(
          `Player ${playerId} shot drone and received ${gameConfig.TOKENS.DRONE} tokens`
        );
      } else {
        await this.wsManager.sendMessageToPlayer(
          {
            type: "droneShootRejected",
            playerId: playerId,
            data: {
              kind: "drone",
              droneId: data.data.droneId,
              position: data.data.position,
              reward: 0,
            },
          },
          playerId
        );
      }
    } catch (error) {
      logger.error("Error handling drone shot:", error);
      throw error;
    }
  }

  // MARK: - startDroneGeneration
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

          await this.generateDrone(playerId);
        }
      } catch (error) {
        logger.error(`Drone generation error: ${error.message}`);
      }
    }, 10000); // Generate every 10 seconds
  }

  // MARK: - generateDrone

  async generateDrone(playerId) {
    if (!playerId) return;

    try {
      const drone = await droneService.generateDrone(playerId);
      if (drone) {
        const message = {
          type: "newDrone",
          playerId: playerId,
          data: {
            kind: "drone",
            droneId: drone.droneId,
            position: drone.position,
            reward: gameConfig.TOKENS.DRONE,
          },
        };

        await this.wsManager.sendMessageToPlayer(message, playerId);
        // logger.info(`Generated new drone for player ${playerId}`);
      }
    } catch (error) {
      logger.error(`Drone generation error: ${error.message}`);
    }
  }

  // MARK: - stopDroneGeneration

  stopDroneGeneration() {
    if (this.droneGenerationInterval) {
      clearInterval(this.droneGenerationInterval);
      this.droneGenerationInterval = null;
    }
  }

  // MARK: - removePlayerDrones
  async removePlayerDrones(playerId) {
    if (!playerId) {
      return;
    }

    try {
      await droneService.removePlayerDrones(playerId);
    } catch (error) {
      logger.error(`Error removing drones for player ${playerId}:`, error);
    }
  }

  // MARK: - cleanup

  async cleanup() {
    this.stopDroneGeneration();
  }
}

module.exports = DroneHandler;
