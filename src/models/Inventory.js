// src/models/Inventory.js
const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["weapon", "target", "powerup"],
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  collectedAt: {
    type: Date,
    default: Date.now,
  },
  used: {
    type: Boolean,
    default: false,
  },
  usedAt: {
    type: Date,
  },
});

const inventorySchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true,
  },
  items: [inventoryItemSchema],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Inventory", inventorySchema);

