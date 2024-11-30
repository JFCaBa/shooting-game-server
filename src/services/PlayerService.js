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

    async getTokenBalance(playerId) {
        try {
            const player = await this.findPlayerById(playerId);
            logger.info(`Fetched player data for ${playerId}:`, player);

            if (!player) {
                logger.error(`Player with ID ${playerId} not found`);
                return 0;
            }

            const mintedBalance = player.mintedBalance || 0;
            const pendingBalance = player.pendingBalance || 0;
            const totalBalance = mintedBalance + pendingBalance;

            logger.info(`Total balance for ${playerId}: mintedBalance = ${mintedBalance}, pendingBalance = ${pendingBalance}, totalBalance = ${totalBalance}`);
            return totalBalance;
        } catch (error) {
            logger.error(`Error getting token balance for ${playerId}: ${error.message}`);
            return 0;
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
                { 
                    upsert: true, 
                    new: true, 
                    setDefaultsOnInsert: true 
                }
            );

            if (balance.pendingBalance >= 0) {
                balance.mintedBalance += balance.pendingBalance;
                balance.pendingBalance = 0;
                await balance.save();
            }

            return balance;
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
            const updateData = {
                lastActive: new Date()
            };

            if (playerData?.location) {
                updateData.location = playerData.location;
            }
            if (playerData?.heading) {
                updateData.heading = playerData.heading;
            }
            if (playerData?.walletAddress) {
                updateData.walletAddress = playerData.walletAddress;
            }

            const updatedPlayer = await Player.findOneAndUpdate(
                { playerId },
                { $set: updateData },
                { 
                    upsert: true, 
                    new: true,
                    setDefaultsOnInsert: true
                }
            );
            
            return updatedPlayer;
        } catch (error) {
            logger.error(`Error updating player status for ${playerId}: ${error.message}`);
            throw new Error('Failed to update player status');
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