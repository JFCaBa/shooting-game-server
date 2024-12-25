const gameConfig = require('../config/gameConfig');
const Player = require('../models/Player');
const logger = require('../utils/logger');

class PlayerService {

  // Helper function to find a player
  async findPlayerById(playerId) {
    try {
        return await Player.findOne({ playerId });
    } catch (error) {
        logger.error(`Error fetching player with ID ${playerId}: ${error.message}`);
        throw new Error('Player not found');
    }
  }

  async addPlayerDetails(playerId, nickName, email, password) {  
    try { 
        const player = await Player.findOneAndUpdate(
            { playerId },
            { $set: { nickName, email, password } },
            { upsert: true, new: true }           
        );
        return player;
    } catch (error) {
          logger.error(`Error adding player details for ${playerId}: ${error.message}`);
          throw new Error('Failed to add player details');
    }
  }

  async addWalletAddress(playerId, walletAddress) {
    try {
        const player = await Player.findOneAndUpdate(
            { playerId },
            { $set: { walletAddress } },
            { upsert: true, new: true }
        );
        return player;
    } catch (error) {
        logger.error(`Error adding wallet address for ${playerId}: ${error.message}`);
        throw new Error('Failed to add wallet address');
    }
  }

  // Get the token balance of a player
  async getTokenBalance(playerId) {
    try {
        const player = await this.findPlayerById(playerId);

        // Ensure player exists
        if (!player) {
            logger.error(`Player with ID ${playerId} not found`);
            return { mintedBalance: 0, totalBalance: 0 }; // Return default values
        }

        // Ensure balances are numbers
        const mintedBalance = Number(player.mintedBalance || 0);
        const pendingBalance = Number(player.pendingBalance || 0);
        const totalBalance = mintedBalance + pendingBalance;

        logger.info(`Total balance for ${playerId}: mintedBalance = ${mintedBalance}, pendingBalance = ${pendingBalance}, totalBalance = ${totalBalance}`);
        return { mintedBalance, totalBalance };
    } catch (error) {
        logger.error(`Error getting token balance for ${playerId}: ${error.message}`, { stack: error.stack });
        return { mintedBalance: 0, totalBalance: 0 };
    }
  }

  async updateBalance(playerId, amount) {
    try {
      // Add tokens to the pending balance
      const balance = await Player.findOneAndUpdate(
        { playerId },
        {
          $inc: { pendingBalance: amount },
          $set: { lastUpdate: new Date() }
        },
        { upsert: true, new: true }
      );
  
      // Optionally, transfer from pending to minted after some action/confirmation
      // if (balance.pendingBalance >= 0) {
      //   balance.mintedBalance += balance.pendingBalance;
      //   balance.pendingBalance = 0;  // Reset pending balance
      //   await balance.save();  // Save the balance after moving tokens to minted
      // }
  
      return balance;
    } catch (error) {
      logger.error('Error updating token balance:', error);
      throw error;
    }
  }

  async updateMintedBalance(playerId, amount) {
    try {
      // Add tokens to the pending balance
      const balance = await Player.findOneAndUpdate(
        { playerId },
        {
          $inc: { mintedBalance: amount },
          $set: { lastUpdate: new Date() }
        },
        { upsert: true, new: true }
      );
  
      // Optionally, transfer from pending to minted after some action/confirmation
      // if (balance.pendingBalance >= 0) {
      //   balance.mintedBalance += balance.pendingBalance;
      //   balance.pendingBalance = 0;  // Reset pending balance
      //   await balance.save();  // Save the balance after moving tokens to minted
      // }
  
      return balance;
    } catch (error) {
      logger.error('Error updating token balance:', error);
      throw error;
    }
  }

  async adReward(playerId) {
    try {
        const reward = await Player.findOneAndUpdate(
            { playerId },
            {
                $inc: { pendingBalance: gameConfig.TOKENS.AD }, 
                $set: { lastUpdate: new Date() }
            },
            { upsert: true, new: true } // Options: upsert and return the updated document
        );

        logger.info('Reward result:', reward);
        return reward;
    } catch (error) {
        logger.error('Error updating token balance:', error);
        throw error;
    }
  }

  // Transfer tokens between players
  async transferTokens(fromPlayerId, toWalletAddress, amount) {
    const fromPlayer = await this.findPlayerById(fromPlayerId);
    const toPlayer = await Player.findOne({ walletAddress: toWalletAddress });

    if (!fromPlayer) {
      throw new Error('Sender player not found');
    }
    if (!toPlayer) {
      throw new Error('Recipient player not found');
    }
    if (fromPlayer.tokens < amount) {
      throw new Error('Insufficient tokens');
    }

    // Begin transfer
    fromPlayer.tokens -= amount;
    toPlayer.tokens += amount;

    try {
      await fromPlayer.save();
      await toPlayer.save();
      logger.info(`Successfully transferred ${amount} tokens from ${fromPlayerId} to ${toWalletAddress}`);
    } catch (error) {
      logger.error(`Error during token transfer: ${error.message}`);
      throw new Error('Token transfer failed');
    }
  }

  // Update the status of a player (location, heading, last active)
  async updatePlayerStatus(playerId, playerData) {
    try {
      const updatedPlayer = await Player.findOneAndUpdate(
        { playerId },
        { 
          $set: {
            lastActive: new Date(),
            location: playerData?.location,
            heading: playerData?.heading
          }
        },
        { upsert: true, new: true }
      );
      return updatedPlayer;
    } catch (error) {
      logger.error(`Error updating player status for ${playerId}: ${error.message}`);
      throw new Error('Failed to update player status');
    }
  }

  async getPlayer(playerId) {
    try {
        let player = await Player.findOne({ playerId });
        if (!player) {
            // If the player is not found, create a new one
            player = await this.createOrUpdatePlayer(playerId);
        }
        return player;
    } catch (error) {
        throw new Error(`Error fetching player: ${error.message}`);
    }
  }

  // Method to create or update player
  async createOrUpdatePlayer(playerId) {
    try {
        const player = await Player.findOneAndUpdate(
            { playerId },
            { $set: { playerId, lastUpdate: new Date() } },
            { upsert: true, new: true }
        );
        if (player) {
            logger.info(`Player created/updated: ${playerId}`);
        } else {
            logger.warn(`Player creation failed for: ${playerId}`);
        }
        return player;
    } catch (error) {
        throw new Error(`Error creating/updating player: ${error.message}`);
    }
  }

  // Retrieve all active players (active in the last 5 minutes)
  async getActivePlayers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    try {
      return await Player.find({
        lastActive: { $gte: fiveMinutesAgo }
      });
    } catch (error) {
      logger.error(`Error fetching active players: ${error.message}`);
      throw new Error('Failed to retrieve active players');
    }
  }

  // Remove players who have been inactive for more than 5 minutes
  async removeInactivePlayers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    try {
      const result = await Player.deleteMany({
        lastActive: { $lt: fiveMinutesAgo }
      });
      return result.deletedCount;  // Return the number of players removed
    } catch (error) {
      logger.error(`Error removing inactive players: ${error.message}`);
      throw new Error('Failed to remove inactive players');
    }
  }
}

module.exports = PlayerService;