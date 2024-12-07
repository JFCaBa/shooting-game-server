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

    async handleHit(data, playerId) {
        const { targetPlayerId, type } = data;
        let stats = this.getPlayerStats(playerId);

        try {
            if (type === 'hitConfirmed') {
                stats.hits++;
                stats.shots = stats.shots || stats.hits; // Ensure shots is never less than hits
                this.updateAccuracy(targetPlayerId, stats);

                logger.info(`Tracking hit achievement for ${targetPlayerId}, hits: ${stats.hits}`);
                await AchievementService.trackAchievement(targetPlayerId, 'hits', stats.hits);
                
                if (stats.accuracy) {
                    logger.info(`Tracking accuracy achievement for ${playerId}, accuracy: ${stats.accuracy}`);
                    await AchievementService.trackAchievement(targetPlayerId, 'accuracy', stats.accuracy);
                }

                await Player.findOneAndUpdate(
                    { playerId: targetPlayerId },
                    { $inc: { 'stats.hits': 1 } }
                );
            } 
            else if (type === 'kill') {
                stats.kills++;

                // Update MongoDB
                if (targetPlayerId) {
                    await Player.findOneAndUpdate(
                        { playerId: targetPlayerId },
                        { $inc: { 'stats.kills': 1 } }
                    );
                }

                logger.info(`Tracking kill achievement for ${targetPlayerId}, kills: ${stats.kills}`);
                await AchievementService.trackAchievement(targetPlayerId, 'kills', stats.kills);

                // Update death count for target
                if (playerId) {
                    await Player.findOneAndUpdate(
                        { playerId: playerId },
                        { $inc: { 'stats.deaths': 1 } }
                    );
                }
            }

            if (targetPlayerId && this.wsManager.clients?.has(targetPlayerId)) {
                this.wsManager.clients.get(targetPlayerId).send(JSON.stringify(data));
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
        const now = new Date();
        
        try {
            // Load existing player from DB
            const existingPlayer = await Player.findOne({ playerId });
            
            const baseStats = {
                id: playerId,
                shots: 0,
                hits: existingPlayer?.stats?.hits || 0,
                kills: existingPlayer?.stats?.kills || 0,
                accuracy: 0,
                survivalStart: existingPlayer?.stats?.survivalStart || Date.now,
                location: {
                    latitude: 0,
                    longitude: 0,
                    altitude: 0,
                    accuracy: 0,
                },
                heading: 0
            };
    
            this.playerStats.set(playerId, baseStats);
            logger.info(`Loaded stats for player ${playerId}: hits=${baseStats.hits}, kills=${baseStats.kills}`);
            
        } catch (error) {
            logger.error(`Error loading stats for player ${playerId}:`, error);
            // Set default stats if loading fails
            this.playerStats.set(playerId, {
                id: playerId,
                shots: 0,
                hits: 0,
                kills: 0,
                accuracy: 0,
                survivalStart: now.toISOString(),
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