const Player = require('../models/Player');
const logger = require('../utils/logger');

class PlayerService {
    async findPlayerById(playerId) {
      try {
          return await Player.findOne({ playerId });
      } catch (error) {
          logger.error(`Error fetching player with ID ${playerId}: ${error.message}`);
          throw new Error('Player not found');
      }
    }

    async updatePlayerDetails(playerId, nickName, passwordHash, passwordSalt) {
      try {
          // Build the update object dynamically
          const updateFields = { nickName };
  
          if (passwordHash) {
              updateFields.passwordHash = passwordHash;
          }
  
          if (passwordSalt) {
              updateFields.passwordSalt = passwordSalt;
          }
  
          // Find and update the player
          const player = await Player.findOneAndUpdate(
              { playerId },
              { $set: updateFields },
              { new: true } // Return the updated document
          );
  
          return player;
      } catch (error) {
          logger.error(`Error updating player details for ${playerId}: ${error.message}`);
          throw new Error('Failed to update player details');
      }
  }

    async addPlayerDetails(playerId, nickName, email, passwordHash, passwordSalt) {
        try {
            // Check if player already has an email
            const currentPlayer = await Player.findOne({ playerId });
            if (currentPlayer?.email) {
                throw new Error('PLAYER_HAS_EMAIL');
            }
            
            // Check if email is already used by another player
            if (email) {
                const existingPlayer = await Player.findOne({ email });
                if (existingPlayer) {
                    throw new Error('EMAIL_EXISTS');
                }
            }

            // Build the update object dynamically
            const updateFields = { nickName };
            if (email) updateFields.email = email;
            if (passwordHash && passwordSalt) {
                updateFields.passwordHash = passwordHash;
                updateFields.passwordSalt = passwordSalt;
            }

            const player = await Player.findOneAndUpdate(
                { playerId },
                { $set: updateFields },
                { upsert: true, new: true }
            );
            return player;
        } catch (error) {
            if (error.message === 'EMAIL_EXISTS') {
                throw error;
            }
            logger.error(`Error adding player details for ${playerId}: ${error.message}`);
            throw new Error('Failed to add player details');
        }
    }

    async getPlayerDetails(playerId) {
      try {
          const player = await Player 
              .findOne({ playerId })        
              .select('nickName email');
          return player;
      } catch (error) {
          logger.error(`Error fetching player details for ${playerId}: ${error.message}`);
          throw new Error('Failed to fetch player details');
      }
    }

    async getTokenBalance(playerId) {
        try {
            const player = await this.findPlayerById(playerId);

            if (!player) {
                logger.error(`Player with ID ${playerId} not found`);
                return { mintedBalance: 0, totalBalance: 0 };
            }

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
            const balance = await Player.findOneAndUpdate(
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

    async adReward(playerId) {
        try {
            const reward = await Player.findOneAndUpdate(
                { playerId },
                {
                    $inc: { pendingBalance: 10 },
                    $set: { lastUpdate: new Date() }
                },
                { upsert: true, new: true }
            );

            logger.info('Reward result:', reward);
            return reward;
        } catch (error) {
            logger.error('Error updating token balance:', error);
            throw error;
        }
    }

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
                player = await this.createOrUpdatePlayer(playerId);
            }
            return player;
        } catch (error) {
            throw new Error(`Error fetching player: ${error.message}`);
        }
    }

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

    async removeInactivePlayers() {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        try {
            const result = await Player.deleteMany({
                lastActive: { $lt: fiveMinutesAgo }
            });
            return result.deletedCount;
        } catch (error) {
            logger.error(`Error removing inactive players: ${error.message}`);
            throw new Error('Failed to remove inactive players');
        }
    }
}

module.exports = PlayerService;