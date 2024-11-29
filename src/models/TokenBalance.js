const mongoose = require('mongoose');

const tokenBalanceSchema = new mongoose.Schema({
    playerId: {
      type: String,
      required: true,
      unique: true
    },
    pendingBalance: {
      type: Number,
      default: 0
    },
    mintedBalance: {
      type: Number,
      default: 0
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  });
  
  module.exports = mongoose.model('TokenBalance', tokenBalanceSchema);
  