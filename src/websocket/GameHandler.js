const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');
const AchievementService = require('../services/AchievementService');
const RewardService = require('../services/RewardService');
const gameConfig = require('../config/gameConfig');
const Player = require('../models/Player');

class GameHandler {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.playerService = new PlayerService();
        this.playerStats = new Map();
    }

    async handleKill(data, senderId) {
        try {
            // Get the sender's stats
            const senderStats = await this.getPlayerStats(senderId);
            if (!senderStats.kills) senderStats.kills = 0;
            
            // Increment kills
            senderStats.kills++;
            this.playerStats.set(senderId, senderStats);

            // Update sender's kill count in DB
            await Player.findOneAndUpdate(
                { playerId: senderId },
                { $inc: { 'stats.kills': 1 } }
            );

            // Update target's death count
            if (data.senderId) {
                await Player.findOneAndUpdate(
                    { playerId: data.senderId },
                    { $inc: { 'stats.deaths': 1 } }
                );
            }

            // Track achievement with the updated kill count
            logger.info(`Tracking kill achievement for ${senderId}, kills: ${senderStats.kills}`);
            const achievement = await AchievementService.trackAchievement(senderId, 'kills', senderStats.kills);
            
            if (achievement) {
                // Notify achievement if unlocked
                if (this.wsManager.clients?.has(senderId)) {
                    this.wsManager.clients.get(senderId).send(JSON.stringify({
                        type: 'achievement',
                        achievement
                    }));
                }
            }

            // Notify target about the kill
            if (data.senderId && this.wsManager.clients?.has(data.senderId)) {
                this.wsManager.clients.get(data.senderId).send(JSON.stringify(data));
            }

        } catch (error) {
            logger.error('Error handling kill:', error);
            throw error;
        }
    }

    async handleHitConfirmed(data, playerId) {
        const { senderId, type } = data;
        let stats = this.getPlayerStats(senderId);

        try {
            stats.hits++;
            stats.shots = stats.shots || stats.hits; // Ensure shots is never less than hits

            this.updateAccuracy(senderId, stats);

            logger.info(`Tracking hit achievement for ${senderId}, hits: ${stats.hits}`);
            await AchievementService.trackAchievement(senderId, 'hits', stats.hits);
            
            if (stats.accuracy) {
                logger.info(`Tracking accuracy achievement for ${senderId}, accuracy: ${stats.accuracy}`);
                await AchievementService.trackAchievement(senderId, 'accuracy', stats.accuracy);
            }

            // Update hit count for player
            await Player.findOneAndUpdate(
                { senderId: playerId },
                { $inc: { 'stats.hits': 1 } }
            );

            // Send the message to the player so the app will update the score
            if (senderId && this.wsManager.clients?.has(playerId)) {
                this.wsManager.clients.get(senderId).send(JSON.stringify(data));
            }

        } catch (error) {
            logger.error('Error handling hit:', error);
            throw error;
        }
    }

    handleShot(data, playerId) {
        const stats = this.getPlayerStats(playerId);
        stats.shots = (stats.shots || 0) + 1;
        this.updateAccuracy(playerId, stats);
        this.playerStats.set(playerId, stats);
        this.wsManager.broadcastToAll(data, playerId);
    }

    updateAccuracy(playerId, stats) {
        if (stats.shots > 0) {
            stats.accuracy = Math.min(100, Math.round((stats.hits / stats.shots) * 100));
        } else {
            stats.accuracy = 0;
        }
    }

    async getPlayerStats(playerId) {
        if (!this.playerStats.has(playerId)) {
            await this.initPlayerStats(playerId);
        }
        return {...this.playerStats.get(playerId)};
    }

    handleShotConfirmed(data, playerId) {
        const stats = this.getPlayerStats(playerId);
        stats.shots++;
        this.updateAccuracy(playerId, stats);
        this.wsManager.broadcastToAll(data, playerId);
      }
  
    handleDisconnect(playerId) {        
        const now = new Date().toISOString();
        const leaveMessage = {
            type: 'leave',
            playerId,
            data: {
                player: {
                    id: playerId,
                    location: {
                        latitude: 0,
                        longitude: 0,
                        altitude: 0,
                        accuracy: 0
                    },
                    heading: 0,
                    timestamp: now  
                },
                shotId: null,
                hitPlayerId: null,
                damage: null
            },
            timestamp: now
        };
        
        this.wsManager.broadcastToAll(leaveMessage, playerId);
        this.wsManager.clients.delete(playerId);
        this.playerStats.delete(playerId);
    }
  
  
    startSurvivalTracking(playerId) {
        const trackInterval = 60000; // 1 minute
        const interval = setInterval(async () => {
            if (!this.playerStats.has(playerId)) {
                clearInterval(interval);
                return;
            }

            const stats = this.playerStats.get(playerId);
            if (!stats.survivalStart) {
                logger.error(`No survival start time for player ${playerId}`);
                return;
            }

            const startTime = new Date(stats.survivalStart).getTime();
            const survivalTime = Math.floor((Date.now() - startTime) / 1000);

            if (isNaN(survivalTime)) {
                logger.error(`Invalid survival calculation for player ${playerId}:`, {
                    survivalStart: stats.survivalStart,
                    startTime,
                    now: Date.now()
                });
                return;
            }

            logger.info(`Tracking survival time for ${playerId}: ${survivalTime} seconds`);
            await AchievementService.trackAchievement(playerId, 'survivalTime', survivalTime);
        }, trackInterval);
    }

    async initPlayerStats(playerId) {
        try {
            const existingPlayer = await Player.findOne({ playerId });
            
            const baseStats = {
                id: playerId,
                shots: 0,
                hits: existingPlayer?.stats?.hits || 0,
                kills: existingPlayer?.stats?.kills || 0,
                deaths: existingPlayer?.stats?.deaths || 0,
                accuracy: 0,
                survivalStart: existingPlayer?.stats?.survivalStart || Date.now(),
                location: {
                    latitude: 0,
                    longitude: 0,
                    altitude: 0,
                    accuracy: 0,
                },
                heading: 0
            };
    
            this.playerStats.set(playerId, baseStats);
            logger.info(`Loaded stats for player ${playerId}: hits=${baseStats.hits}, kills=${baseStats.kills}, deaths=${baseStats.deaths}`);
            
        } catch (error) {
            logger.error(`Error loading stats for player ${playerId}:`, error);
            this.playerStats.set(playerId, {
                id: playerId,
                shots: 0,
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
                heading: 0
            });
        }
    }

    handleJoin(data, playerId, ws) {
        if (!this.wsManager.clients.has(playerId)) {
            logger.info(`Registering new player: ${playerId}`);
    
            // Add the new player to WebSocket manager
            this.wsManager.clients.set(playerId, ws);
    
            // Fetch or create the player in the database
            this.playerService.getPlayer(playerId)  // This will create the player if not found
                .then(() => {
                    // Initialize player stats
                    this.initPlayerStats(playerId);
                    
                    // Start tracking survival
                    this.startSurvivalTracking(playerId);

                    // Send current players to the joining player
                    const currentPlayers = [];
                    this.wsManager.clients.forEach((_, id) => {
                        if (id !== playerId) {
                            const playerData = this.getPlayerStats(id);
                            currentPlayers.push({
                                type: 'announced',
                                playerId: id,
                                data: { player: playerData },
                                timestamp: new Date().toISOString()
                            });
                        }
                    });

                    // Send existing players to new player
                    currentPlayers.forEach(playerData => {
                        ws.send(JSON.stringify(playerData));
                    });
                })
                .catch((error) => {
                    logger.error(`Error registering new player: ${error.message}`);
                });
        } else {
            logger.info(`Player ${playerId} is already connected.`);
        }
    
        this.wsManager.broadcastToAll(data, playerId);
    }
}

module.exports = GameHandler;