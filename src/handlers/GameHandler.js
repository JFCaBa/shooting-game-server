const logger = require("../utils/logger");
const PlayerService = require("../services/PlayerService");
const AchievementService = require("../services/AchievementService");
const RewardHistory = require("../models/RewardHistory");
const Player = require("../models/Player");
const gameConfig = require("../config/gameConfig");

class GameHandler {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.playerService = new PlayerService();
    this.playerStats = new Map();
    this.SURVIVAL_RADIUS = 0.1; // 100 meters
  }

  // MARK: - handleReload
  async handleReload(playerId) {
    if (!playerId) {
      return;
    }

    // TODO: Remove the wrap when players updated
    const player = await Player.findOne({ playerId: playerId });

    if (player) {
      // If `currentAmmo` field is missing, initialize it
      if (
        player.stats.currentAmmo === undefined ||
        player.stats.currentAmmo === null ||
        player.stats.currentAmmo <= 1
      ) {
        player.stats.currentAmmo = gameConfig.STATS.AMMUNITION;
        logger.info(`Reloaded: ${player.stats}`);
        await player.save();
      }

      await this.handleStatsRequest(playerId);
    }
  }

  // MARK: - handleKill

  async handleKill(data, playerId, senderId) {
    if ((!playerId, !senderId)) {
      return;
    }

    try {
      // Get the sender's stats
      const senderStats = await this.getPlayerStats(senderId);
      const playerStats = await this.getPlayerStats(playerId);
      if (!senderStats.kills) senderStats.kills = 0;

      // Increment sender kills
      senderStats.kills++;
      this.playerStats.set(senderId, senderStats);

      // Restart player survival time
      playerStats.survivalStart = Date.now();
      this.playerStats.set(playerId, playerStats);

      // Update sender's kill count in DB
      await Player.findOneAndUpdate(
        { playerId: senderId },
        { $inc: { "stats.kills": 1 } }
      );

      // Update target's death count
      await Player.findOneAndUpdate(
        { playerId: playerId },
        { $inc: { "stats.deaths": 1 } }
      );

      // TODO: Remove the wrap when players updated
      const player = await Player.findOne({ playerId: playerId });

      if (player) {
        // If `currentLives` field is missing, initialize it
        if (
          player.stats.currentLives === undefined ||
          player.stats.currentLives === null ||
          player.stats.currentLives <= 0
        ) {
          player.stats.currentLives = gameConfig.STATS.LIVES;
          await player.save();
        }

        await Player.findOneAndUpdate(
          { playerId: playerId },
          { $inc: { "stats.currentLives": -1 } }
        );
      }

      await RewardHistory.create({
        playerId: senderId,
        rewardType: "KILL",
        amount: gameConfig.TOKENS.KILL,
      });

      // Track achievement with the updated kill count
      logger.info(
        `Tracking kill achievement for ${senderId}, kills: ${senderStats.kills}`
      );
      await AchievementService.trackAchievement(
        senderId,
        "kills",
        senderStats.kills
      );

      // Notify target about the kill
      if (senderId && this.wsManager.clients?.has(senderId)) {
        this.wsManager.clients.get(senderId).send(JSON.stringify(data));
      }
    } catch (error) {
      logger.error(`Error handling kill: ${error}`);
      throw error;
    }
  }

  // MARK: - handleHitCofirmed

  async handleHitConfirmed(data, senderId) {
    if (!senderId) {
      return;
    }

    try {
      const senderStats = await this.getPlayerStats(senderId);
      if (!senderStats.hits) senderStats.hits = 0;
      if (!senderStats.accuracy) senderStats.accuracy = 0;

      senderStats.hits++;
      senderStats.shoots = senderStats.shoots || senderStats.hits; // Ensure shoots is never less than hits
      this.playerStats.set(senderId, senderStats);

      this.updateAccuracy(senderId, senderStats);

      logger.info(
        `Tracking hit achievement for ${senderId}, hits: ${senderStats.hits}`
      );
      await AchievementService.trackAchievement(
        senderId,
        "hits",
        senderStats.hits
      );

      // Update hits in the data base
      await Player.findOneAndUpdate(
        { playerId: senderId },
        { $inc: { "stats.hits": 1 } }
      );

      logger.info(
        `Tracking accuracy achievement for ${senderId}, accuracy: ${senderStats.accuracy}`
      );
      await AchievementService.trackAchievement(
        senderId,
        "accuracy",
        senderStats.accuracy
      );

      // Update hit count for sender
      await Player.findOneAndUpdate(
        { playerId: senderId },
        { $inc: { "stats.hits": 1 } }
      );

      await RewardHistory.create({
        playerId: senderId,
        rewardType: "HIT",
        amount: gameConfig.TOKENS.HIT,
      });

      // Send the message to the player so the app will update the score
      if (senderId && this.wsManager.clients?.has(senderId)) {
        this.wsManager.clients.get(senderId).send(JSON.stringify(data));
      }
    } catch (error) {
      logger.error("Error handling hit:", error);
      throw error;
    }
  }

  // MARK: - handleShot

  async handleShot(data, playerId) {
    if (!playerId) {
      return;
    }

    // TODO: Remove the wrap when players updated
    const player = await Player.findOne({ playerId: playerId });
    if (player) {
      // If `shoots` field is missing, initialize it with 0
      if (player.stats.shoots === undefined || player.stats.shoots === null) {
        player.stats.shoots = 0;
        await player.save(); // Save the updated player document with initialized `shoots`
      }

      try {
        // Now increment the `shoots` field
        await Player.findOneAndUpdate(
          { playerId: playerId },
          {
            $inc: {
              "stats.shoots": 1,
              "stats.currentAmmo": -1,
            },
          }
        );
      } catch (error) {
        logger.error(`Error handling shoot: ${error}`);
        throw error;
      }
    }

    const stats = this.getPlayerStats(playerId);
    stats.shoots = (stats.shoots || 0) + 1;
    await this.updateAccuracy(stats, player);
    this.playerStats.set(playerId, stats);
  }

  // MARK: - updateAccuracy

  async updateAccuracy(stats, player) {
    try {
      // Ensure the accuracy field is initialized in the player stats
      if (typeof player.stats.accuracy === "undefined") {
        player.stats.accuracy = 0;
      }

      // Ensure stats.shoots and stats.hits are valid numbers
      if (typeof stats.shoots !== "number" || typeof stats.hits !== "number") {
        stats.accuracy = 0; // Default to 0 if stats are invalid
      } else {
        // Ensure there are shoots to calculate accuracy
        if (stats.shoots > 0) {
          // Avoid division by zero or NaN results
          stats.accuracy = Math.min(
            100,
            Math.round((stats.hits / stats.shoots) * 100)
          );
        } else {
          // If there are no shoots, set accuracy to 0
          stats.accuracy = 0;
        }
      }

      // Update player's accuracy in the database
      player.stats.accuracy = stats.accuracy;

      // Save the updated player stats
      await player.save();
    } catch (error) {
      logger.error(
        `Error updating accuracy for player ${player.playerId}: ${error.message}`
      );
      // Default to 0 if any error occurs
      player.stats.accuracy = 0;
      await player.save(); // Save with default accuracy
    }
  }

  // MARK: - getPlayerStats

  async getPlayerStats(playerId) {
    if (!playerId) {
      return;
    }

    try {
      const player = await Player.findOne({ playerId });
      if (!player) {
        logger.warn(
          `Player ${playerId} not found. Initializing default stats.`
        );
        return {
          shoots: 0,
          hits: 0,
          kills: 0,
          deaths: 0,
          accuracy: 0,
          survivalStart: Date.now(),
          ammunition: 0,
        };
      }
      return player.stats || {};
    } catch (error) {
      logger.error(`Error fetching stats for player ${playerId}:`, error);
      return {
        shoots: 0,
        hits: 0,
        kills: 0,
        deaths: 0,
        accuracy: 0,
        survivalStart: Date.now(),
        ammunition: 0,
      };
    }
  }

  // MARK: - handleShootConfirmed

  handleShotConfirmed(data, playerId) {
    if (!playerId) {
      return;
    }

    const stats = this.getPlayerStats(playerId);
    stats.shoots++;
    this.updateAccuracy(playerId, stats);
  }
  // MARK: - handleDisconnect

  handleDisconnect(playerId) {
    if (!playerId) {
      return;
    }

    const now = new Date().toISOString();
    const leaveMessage = {
      type: "leave",
      playerId,
      data: {
        player: {
          id: playerId,
          location: {
            latitude: 0,
            longitude: 0,
            altitude: 0,
            accuracy: 0,
          },
          heading: 0,
          timestamp: now,
        },
        shotId: null,
        hitPlayerId: null,
        damage: null,
      },
      timestamp: now,
    };

    this.wsManager.broadcastToAll(leaveMessage, playerId);
    this.wsManager.clients.delete(playerId);
    this.playerStats.delete(playerId);
  }

  // MARK: - nearByPlayers

  async nearByPlayers(playerId) {
    if (!playerId) {
      return [];
    }

    try {
      const player = await Player.findOne({ playerId });
      if (!player?.location?.latitude || !player?.location?.longitude) {
        return [];
      }

      const activePlayers = await Player.find({
        playerId: { $ne: playerId },
        lastActive: { $gte: new Date(Date.now() - 5 * 60000) }, // Players active in the last 5 minutes
      });

      const playerLat = Math.round(player.location.latitude * 1000) / 1000;
      const playerLon = Math.round(player.location.longitude * 1000) / 1000;

      return activePlayers.filter((otherPlayer) => {
        if (
          !otherPlayer.location?.latitude ||
          !otherPlayer.location?.longitude
        ) {
          return false;
        }

        const otherLat =
          Math.round(otherPlayer.location.latitude * 1000) / 1000;
        const otherLon =
          Math.round(otherPlayer.location.longitude * 1000) / 1000;

        return playerLat === otherLat && playerLon === otherLon;
      });
    } catch (error) {
      logger.error(`Error finding nearby players for ${playerId}:`, error);
      return [];
    }
  }

  // MARK: - hasNearbyPlayers

  async hasNearbyPlayers(playerId) {
    const nearbyPlayers = await this.nearByPlayers(playerId);
    return nearbyPlayers.length > 0;
  }
  // MARK: - setSurvivalTracking

  startSurvivalTracking(playerId) {
    if (!playerId) {
      return;
    }
    const trackInterval = 60000; // 1 minute
    const interval = setInterval(async () => {
      if (!this.playerStats.has(playerId)) {
        clearInterval(interval);
        return;
      }

      const stats = this.playerStats.get(playerId);
      const hasNearby = await this.hasNearbyPlayers(playerId);

      if (!hasNearby) {
        stats.survivalStart = Date.now(); // Reset survival time when no players nearby
        this.playerStats.set(playerId, stats);
        return;
      }

      // Initialize survival start if doesn't exist
      if (!stats.survivalStart) {
        stats.survivalStart = Date.now();
        this.playerStats.set(playerId, stats);
        logger.info(`Initialized survival start time for player ${playerId}`);
        return;
      }

      const startTime = new Date(stats.survivalStart).getTime();
      const survivalTime = Math.floor((Date.now() - startTime) / 1000);

      if (isNaN(survivalTime)) {
        logger.error(`Invalid survival calculation for player ${playerId}:`, {
          survivalStart: stats.survivalStart,
          startTime,
          now: Date.now(),
        });
        return;
      }

      await AchievementService.trackAchievement(
        playerId,
        "survivalTime",
        survivalTime
      );
    }, trackInterval);
  }

  // MARK: - initPlayerStats

  async initPlayerStats(playerId) {
    if (!playerId) {
      return;
    }

    try {
      const existingPlayer = await Player.findOne({ playerId });

      const baseStats = {
        id: playerId,
        hits: existingPlayer?.stats?.hits || 0,
        kills: existingPlayer?.stats?.kills || 0,
        deaths: existingPlayer?.stats?.deaths || 0,
        shoots: existingPlayer?.stats?.shoots || 0,
        accuracy: 0,
        survivalStart: existingPlayer?.stats?.survivalStart || Date.now(),
        location: {
          latitude: existingPlayer.location.latitude || 0,
          longitude: existingPlayer.location.longitude || 0,
          altitude: existingPlayer.location.altitude || 0,
          accuracy: existingPlayer.location.accuracy || 0,
        },
        heading: 0,
        currentAmmo: existingPlayer.stats.currentAmmo || 30,
        currentLives: existingPlayer.stats.currentLives || 10,
      };

      this.playerStats.set(playerId, baseStats);
      logger.info(
        `Loaded stats for player ${playerId}: lives=${baseStats.currentLives}, ammo:=${baseStats.currentAmmo}`
      );
    } catch (error) {
      logger.error(`Error loading stats for player ${playerId}:`, error);
      this.playerStats.set(playerId, {
        id: playerId,
        shoots: 0,
        hits: 0,
        kills: 0,
        deaths: 0,
        accuracy: 0,
        survivalStart: new Date().toISOString(),
        location: {
          latitude: 0,
          longitude: 0,
          altitude: 0,
          accuracy: 0,
        },
        heading: 0,
      });
    }
  }

  // MARK: - handleJoin

  async handleJoin(player, ws) {
    if (player.playerId && !this.wsManager.clients.has(player.playerId)) {
      logger.info(`Registering new player: ${player.playerId}`);

      // Add the new player to WebSocket manager
      this.wsManager.clients.set(player.playerId, ws);

      try {
        // Update player location if provided
        if (player.location) {
          await this.updatePlayerLocation(player.location, player.playerId);

          // Announce the new joined player only to nearby players
          const announcementMessage = {
            type: "announced",
            playerId: player.playerId,
            data: player,
            timestamp: new Date().toISOString(),
          };

          // Fetch the list of nearby players
          const nearbyPlayers = await this.nearByPlayers(player.playerId);

          // Send the announcement only to nearby players
          if (nearbyPlayers.length > 0) {
            for (const nearbyPlayer of nearbyPlayers) {
              if (
                nearbyPlayer.playerId !== player.playerId &&
                nearbyPlayer.location
              ) {
                await this.wsManager.sendMessageToPlayer(
                  announcementMessage,
                  nearbyPlayer.playerId
                );
              }
            }
          }

          // Send each nearby player's data to the new joined player
          for (const nearbyPlayer of nearbyPlayers) {
            if (
              nearbyPlayer.playerId !== player.playerId &&
              nearbyPlayer.location
            ) {
              const messageToJoinedPlayer = {
                type: "announced",
                playerId: nearbyPlayer.playerId,
                data: nearbyPlayer,
                timestamp: new Date().toISOString(),
              };
              await this.wsManager.sendMessageToPlayer(
                messageToJoinedPlayer,
                player.playerId
              );
            }
          }
        }

        // Fetch or create the player in the database
        await this.playerService.getPlayer(player.playerId);

        // Initialize on memory player stats
        await this.initPlayerStats(player.playerId);

        // Optionally, start survival tracking (commented out for now)
        // this.startSurvivalTracking(player.playerId);
      } catch (error) {
        // Improved error handling with more detailed logging
        const errorMessage = error?.message || "Unknown error occurred";
        logger.error(`Error registering new player: ${errorMessage}`);
        console.error("Complete error details:", error);
      }
    } else {
      logger.info(`Player ${player.playerId} is already connected.`);
    }

    await Player.findOneAndUpdate(
      { playerId: player.playerId },
      { $set: { lastActive: new Date() } }
    );

    // Send the player stats
    await this.handleStatsRequest(player.playerId);
  }

  // MARK: - updatePlayerLocation

  async updatePlayerLocation(location, playerId) {
    if (!playerId || !location) {
      return;
    }

    const updatedLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: location.altitude,
      updatedAt: new Date(),
    };

    try {
      await Player.findOneAndUpdate(
        { playerId: playerId },
        {
          $set: {
            location: updatedLocation,
            lastActive: new Date(), // Update lastActive to the current timestamp
          },
        },
        { new: true } // Return the updated document
      );
    } catch (error) {
      logger.error(`Error updating player location: ${error.message}`);
      throw error;
    }
  }

  // MARK: - replenishAmmoAndLives
  async replenishAmmoAndLives(playerId) {
    try {
      // Fetch the player from the database
      const player = await Player.findOne({ playerId: playerId });

      if (player) {
        const currentTime = new Date();
        const lastActiveTime = new Date(player.lastActive);

        // Check if the player was last active more than 5 minutes ago
        const timeDifference = (currentTime - lastActiveTime) / (1000 * 60); // in minutes

        if (timeDifference > 5) {
          // Replenish ammo and lives if more than 5 minutes have passed
          player.stats.currentAmmo = gameConfig.STATS.AMMUNITION;
          player.stats.currentLives = gameConfig.STATS.LIVES;

          // Update lastActive to the current time to reflect the "reload"
          player.lastActive = currentTime;

          // Save the updated player document
          await player.save();

          logger.info(`Replenished ammo and lives for player ${playerId}`);
        }
      }
    } catch (error) {
      logger.error(
        `Error replenishing ammo and lives for player ${playerId}: ${error.message}`
      );
    }
  }

  // MARK: - handleStatsRequest

  async handleStatsRequest(playerId) {
    try {
      // Replenish ammo and lives if needed
      await this.replenishAmmoAndLives(playerId);

      // Fetch the player stats
      const stats = await this.getPlayerStats(playerId);

      // Send the stats message
      const statsMessage = {
        playerId: playerId,
        type: "stats",
        data: {
          kind: "stats",
          ...stats,
        },
      };

      await this.wsManager.clients
        .get(playerId)
        .send(JSON.stringify(statsMessage));
    } catch (error) {
      logger.error(
        `Error handling stats request for player ${playerId}: ${error.message}`
      );
    }
  }

  // MARK: - getAllPlayers

  async getAllPlayers() {
    try {
      // Fetch all players from the Player collection in MongoDB
      const players = await Player.find(
        {},
        {
          playerId: 1, // Include only necessary fields
          location: 1,
          stats: 1,
          lastActive: 1,
        }
      );

      return players.map((player) => ({
        playerId: player.playerId,
        location: player.location,
        stats: player.stats,
        lastActive: player.lastActive,
      }));
    } catch (error) {
      logger.error(`Error fetching all players: ${error.message}`);
      return []; // Return an empty array if there's an error
    }
  }
}

module.exports = GameHandler;
