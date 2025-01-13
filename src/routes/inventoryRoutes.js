const express = require("express");
const inventoryController = require("../controllers/inventoryController");
const router = express.Router();
const playerAuthMiddleware = require("../middleware/playerAuthMiddleware");

router.get(
  "/players/:playerId/inventory",
  playerAuthMiddleware, inventoryController.getInventory
);
router.post(
  "/players/:playerId/inventory/use/:itemId", playerAuthMiddleware,
  inventoryController.useItem
);
router.get(
  "/geo-objects/list",
  playerAuthMiddleware, inventoryController.getNearbyGeoObjects
);

module.exports = router;
