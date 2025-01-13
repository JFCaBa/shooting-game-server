const logger = require("../utils/logger");
const PlayerService = require("../services/PlayerService");
const geoObjectService = require("../services/GeoObjectService");
const InventoryService = require("../services/InventoryService");
const RewardHistory = require("../models/RewardHistory");
const Player = require("../models/Player");
const gameConfig = require("../config/gameConfig");
const WebSocket = require("ws");

class GeoObjectHandler {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.playerService = new PlayerService();
    this.inventoryService = new InventoryService();
    this.generationInterval = null;
  }

  async handleGeoObjectHit(data, playerId) {
    logger.info(`Player ${playerId} hit geo object ${data.id}`);
    try {
      const result = await geoObjectService.validateGeoObjectHit(
        data.id,
        playerId
      );

      if (result.success) {
        // Add item to player's inventory
        const inventory = await this.inventoryService.addItemToInventory(
          playerId,
          result.geoObject
        );

        // Update player's balance and save reward history
        await this.playerService.updateMintedBalance(playerId, result.reward);
        await new RewardHistory({
          playerId,
          rewardType: "GEO_OBJECT",
          amount: result.reward,
        }).save();

        // Update player stats
        await Player.findOneAndUpdate(
          { playerId },
          { $inc: { "stats.geoObjectsCollected": 1 } }
        );

        // Send confirmation to player with inventory update
        await this.wsManager.sendMessageToPlayer(
          {
            type: "geoObjectShootConfirmed",
            playerId: playerId,
            data: {
              ...data,
              inventory: inventory.items,
              reward: result.reward,
            },
          },
          playerId
        );

        logger.info(
          `Player ${playerId} collected geo object ${data.id} for ${result.reward} tokens`
        );
      } else {
        await this.wsManager.sendMessageToPlayer(
          {
            type: "geoObjectShootRejected",
            playerId: playerId,
            data,
            metadata: {
              reason: "Object not found or already collected",
            },
          },
          playerId
        );
      }
    } catch (error) {
      logger.error("Error handling geo object hit:", error);
      throw error;
    }
  }

  async startGeoObjectGeneration(player) {
    if (!player || !player.playerId || !player.location) {
      return;
    }

    try {
      const geoObject = await geoObjectService.generateGeoObject(
        player.playerId,
        player.location
      );
      if (geoObject) {
        const message = {
          type: "newGeoObject",
          playerId: player.playerId,
          data: geoObject,
        };

        const ws = this.wsManager.clients.get(player.playerId);
        if (!ws) {
          logger.error(`WebSocket not found for player ${player.playerId}`);
          return;
        }
        if (ws.readyState !== WebSocket.OPEN) {
          logger.error(
            `WebSocket for player ${player.playerId} is not open. ReadyState: ${ws.readyState}`
          );
          return;
        }

        await this.wsManager.sendMessageToPlayer(message, player.playerId);
      }
    } catch (error) {
      logger.error("Error in geo object generation:", error);
    }
  }

  stopGeoObjectGeneration() {
    if (this.generationInterval) {
      clearInterval(this.generationInterval);
      this.generationInterval = null;
    }
  }

  async removeAllGeoObjects(playerId) {
    await geoObjectService.cleanupPlayerObjects(playerId);
  }

  async cleanup() {
    this.stopGeoObjectGeneration();
  }
}

module.exports = GeoObjectHandler;
