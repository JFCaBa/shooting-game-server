const logger = require('../utils/logger');

class TokenBalanceService {
  constructor() {
    this.TokenBalance = require('../models/TokenBalance');
  }

  async updateBalance(playerId, amount) {
    try {
      const balance = await this.TokenBalance.findOneAndUpdate(
        { playerId },
        {
          $inc: { pendingBalance: amount },
          $set: { lastUpdate: new Date() }
        },
        { upsert: true, new: true }
      );
      return balance;
    } catch (error) {
      logger.error('Error updating token balance:', error);
      throw error;
    }
  }
}

module.exports = TokenBalanceService;