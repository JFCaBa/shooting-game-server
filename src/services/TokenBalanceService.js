const logger = require('../utils/logger');

class TokenBalanceService {
  constructor() {
    this.TokenBalance = require('../models/TokenBalance');
  }

  async updateBalance(playerId, amount) {
    try {
      // Add tokens to the pending balance
      const balance = await this.TokenBalance.findOneAndUpdate(
        { playerId },
        {
          $inc: { pendingBalance: amount },
          $set: { lastUpdate: new Date() }
        },
        { upsert: true, new: true }
      );
  
      // Optionally, transfer from pending to minted after some action/confirmation
    //   if (balance.pendingBalance >= 0) {
    //     balance.mintedBalance += balance.pendingBalance;
    //     balance.pendingBalance = 0;  // Reset pending balance
    //     await balance.save();  // Save the balance after moving tokens to minted
    //   }
  
      return balance;
    } catch (error) {
      logger.error('Error updating token balance:', error);
      throw error;
    }
  }

  async getBalance(playerId) {
    try {
      const balance = await this.TokenBalance 
        .findOne({ playerId })
        .select('mintedBalance pendingBalance')
        .lean();
        return balance;
    } catch (error) {
      logger.error('Error getting token balance:', error);
      throw error;
    } 
  }
}

module.exports = TokenBalanceService;