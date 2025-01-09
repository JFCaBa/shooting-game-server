require("dotenv").config();
const jwt = require("jsonwebtoken");
const Player = require("../models/Player");
const logger = require("../utils/logger");
const { hashPasswordWithSalt } = require("../utils/passwordHelper");

class PlayerService {
  // MARK: - findPlayerById

  async findPlayerById(playerId) {
    try {
      return await Player.findOne({ playerId: playerId });
    } catch (error) {
      logger.error(
        `Error fetching player with ID ${playerId}: ${error.message}`
      );
      throw new Error("Player not found");
    }
  }

  // MARK: - forgotPassword
  async forgotPassword(email, playerId) {
    const player = await Player.findOne({ email: email, playerId: playerId });
    if (!player) {
      throw new Error("Player not found");
    }
    const token = jwt.sign(
      { playerId: player.playerId, email: player.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return token;
  }

  // MARK: - loginPlayer

  async loginPlayer(email, password) {
    try {
      const player = await Player.findOne({ email: email });
      if (!player) {
        logger.error(`Player email ${email}, not found`);
        throw new Error("Player not found");
      }
      const isValid =
        hashPasswordWithSalt(password, player.passwordSalt) ===
        player.passwordHash;
      if (!isValid) {
        logger.error(`Player hash not valid`);
        throw new Error("Player not found");
      }
      await Player.updateOne(
        { playerId: player.playerId },
        { $set: { lastActive: new Date() } }
      );
      const token = jwt.sign(
        { playerId: player.playerId, email: player.email },
        process.env.JWT_SECRET
      );
      return { token, playerId: player.playerId };
    } catch (error) {
      logger.error(
        `Error logging in player with email ${email} and id: ${playerId}: ${error.message}`
      );
      throw new Error("Player not found");
    }
  }

  // MARK: - updatePlayer

  async updatePlayerDetails(playerId, nickname, passwordHash, passwordSalt) {
    try {
      // Build the update object dynamically
      const updateFields = { nickname };

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
      console.log("Updated player: ", player);
      return player;
    } catch (error) {
      logger.error(
        `Error updating player details for ${playerId}: ${error.message}`
      );
      throw new Error("Failed to update player details");
    }
  }

  // MARK: - addPlayer

  async addPlayerDetails(
    playerId,
    nickname,
    email,
    passwordHash,
    passwordSalt
  ) {
    try {
      // Check if player already has an email
      const currentPlayer = await this.findPlayerById(playerId);
      if (currentPlayer?.email) {
        logger.error(`Player has email: ${currentPlayer?.email}`);
        throw new Error("PLAYER_HAS_EMAIL");
      }

      // Check if email is already used by another player
      if (email) {
        const existingPlayer = await Player.findOne({ email: email });
        if (existingPlayer) {
          throw new Error("EMAIL_EXISTS");
        }
      }

      // Build the update object dynamically
      const updateFields = { nickname };
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
      console.log("New Player created: ", player);
      return player;
    } catch (error) {
      logger.error(
        `Error adding player details for ${playerId}: ${error.message}`
      );
      throw error;
    }
  }

  // MARK: - getPlayerDetails

  async getPlayerDetails(playerId) {
    try {
      if (!playerId) {
        throw new Error("Invalid playerId");
      }
      const player = await Player.findOne({ playerId }).select(
        "nickname email playerId"
      );
      if (!player) {
        throw new Error("Player not found");
      }
      console.log("Player: ", player);
      return player;
    } catch (error) {
      logger.error(
        `Error fetching player details for ${playerId}: ${error.message}`
      );
      throw error;
    }
  }

  // MARK: - getTokenBalance

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

      logger.info(
        `Total balance for ${playerId}: mintedBalance = ${mintedBalance}, pendingBalance = ${pendingBalance}, totalBalance = ${totalBalance}`
      );
      return { mintedBalance, totalBalance };
    } catch (error) {
      logger.error(
        `Error getting token balance for ${playerId}: ${error.message}`,
        { stack: error.stack }
      );
      return { mintedBalance: 0, totalBalance: 0 };
    }
  }

  // MARK: - updateBalance

  async updateBalance(playerId, amount) {
    try {
      const balance = await Player.findOneAndUpdate(
        { playerId },
        {
          $inc: { pendingBalance: amount },
          $set: { lastUpdate: new Date() },
        },
        { upsert: true, new: true }
      );
      return balance;
    } catch (error) {
      logger.error("Error updating token balance:", error);
      throw error;
    }
  }

  // MARK: - adReward

  async adReward(playerId) {
    try {
      const reward = await Player.findOneAndUpdate(
        { playerId },
        {
          $inc: { pendingBalance: 10 },
          $set: { lastUpdate: new Date() },
        },
        { upsert: true, new: true }
      );

      logger.info("Reward result:", reward);
      return reward;
    } catch (error) {
      logger.error("Error updating token balance:", error);
      throw error;
    }
  }

  // MARK: - transferTokens

  async transferTokens(fromPlayerId, toWalletAddress, amount) {
    const fromPlayer = await this.findPlayerById(fromPlayerId);
    const toPlayer = await Player.findOne({ walletAddress: toWalletAddress });

    if (!fromPlayer) {
      throw new Error("Sender player not found");
    }
    if (!toPlayer) {
      throw new Error("Recipient player not found");
    }
    if (fromPlayer.tokens < amount) {
      throw new Error("Insufficient tokens");
    }

    fromPlayer.tokens -= amount;
    toPlayer.tokens += amount;

    try {
      await fromPlayer.save();
      await toPlayer.save();
      logger.info(
        `Successfully transferred ${amount} tokens from ${fromPlayerId} to ${toWalletAddress}`
      );
    } catch (error) {
      logger.error(`Error during token transfer: ${error.message}`);
      throw new Error("Token transfer failed");
    }
  }

  // MARK: - updatePlayerStatus

  async updatePlayerStatus(playerId, playerData) {
    try {
      const updatedPlayer = await Player.findOneAndUpdate(
        { playerId },
        {
          $set: {
            lastActive: new Date(),
            location: playerData?.location,
            heading: playerData?.heading,
          },
        },
        { upsert: true, new: true }
      );
      return updatedPlayer;
    } catch (error) {
      logger.error(
        `Error updating player status for ${playerId}: ${error.message}`
      );
      throw new Error("Failed to update player status");
    }
  }

  // MARK: - getPlayer

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

  // MARK: - createOrUpdatePlayer

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

  // MARK: - getActivePlayers

  async getActivePlayers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    try {
      return await Player.find({
        lastActive: { $gte: fiveMinutesAgo },
      });
    } catch (error) {
      logger.error(`Error fetching active players: ${error.message}`);
      throw new Error("Failed to retrieve active players");
    }
  }

  // MARK: - removeInactivePlayers

  async removeInactivePlayers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    try {
      const result = await Player.deleteMany({
        lastActive: { $lt: fiveMinutesAgo },
      });
      return result.deletedCount;
    } catch (error) {
      logger.error(`Error removing inactive players: ${error.message}`);
      throw new Error("Failed to remove inactive players");
    }
  }
}

module.exports = PlayerService;
