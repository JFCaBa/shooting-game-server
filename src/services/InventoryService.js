// src/services/InventoryService.js
const Inventory = require("../models/Inventory");
const GeoObject = require("../models/GeoObject");
const logger = require("../utils/logger");

class InventoryService {
  async getPlayerInventory(playerId) {
    try {
      let inventory = await Inventory.findOne({ playerId });
      if (!inventory) {
        inventory = new Inventory({ playerId, items: [] });
        await inventory.save();
      }
      return inventory;
    } catch (error) {
      logger.error(`Error fetching inventory for player ${playerId}:`, error);
      throw error;
    }
  }

  async addItemToInventory(playerId, geoObject) {
    try {
      const inventory = await this.getPlayerInventory(playerId);

      inventory.items.push({
        itemId: geoObject._id,
        type: geoObject.type,
        metadata: geoObject.metadata,
      });

      inventory.lastUpdated = new Date();
      await inventory.save();

      return inventory;
    } catch (error) {
      logger.error(
        `Error adding item to inventory for player ${playerId}:`,
        error
      );
      throw error;
    }
  }

  async useItem(playerId, itemId) {
    try {
      const inventory = await Inventory.findOne({ playerId });
      if (!inventory) {
        throw new Error("Inventory not found");
      }

      const item = inventory.items.find(
        (item) => item.itemId === itemId && !item.used
      );
      if (!item) {
        throw new Error("Item not found or already used");
      }

      item.used = true;
      item.usedAt = new Date();
      inventory.lastUpdated = new Date();

      await inventory.save();
      return item;
    } catch (error) {
      logger.error(`Error using item ${itemId} for player ${playerId}:`, error);
      throw error;
    }
  }

  async getNearbyGeoObjects(latitude, longitude, radius) {
    try {
      return await GeoObject.find({
        location: {
          $nearSphere: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: radius,
          },
        },
        collected: false,
      });
    } catch (error) {
      logger.error("Error fetching nearby geo objects:", error);
      throw error;
    }
  }
}

module.exports = new InventoryService();
