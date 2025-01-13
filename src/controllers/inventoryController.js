// src/controllers/inventoryController.js
const InventoryService = require("../services/InventoryService");
const logger = require("../utils/logger");

exports.getInventory = async (req, res) => {
  try {
    const { playerId } = req.params;
    const inventory = await InventoryService.getPlayerInventory(playerId);
    res.json(inventory);
  } catch (error) {
    logger.error("Error in getInventory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.useItem = async (req, res) => {
  try {
    const { playerId, itemId } = req.params;
    const item = await InventoryService.useItem(playerId, itemId);
    res.json(item);
  } catch (error) {
    logger.error("Error in useItem:", error);
    if (error.message.includes("not found")) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

exports.getNearbyGeoObjects = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng || !radius) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const geoObjects = await InventoryService.getNearbyGeoObjects(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    );
    res.json(geoObjects);
  } catch (error) {
    logger.error("Error in getNearbyGeoObjects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
