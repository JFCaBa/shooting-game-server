const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');
const AchievementService = require('../services/AchievementService');
const RewardService = require('../services/RewardService');
const gameConfig = require('../config/gameConfig');

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

                await this.playerService.updateBalance(targetPlayerId, gameConfig.TOKENS.HIT);
            } 
            else if (type === 'kill') {
                stats.kills++;
                logger.info(`Tracking kill achievement for ${targetPlayerId}, kills: ${stats.kills}`);
                await AchievementService.trackAchievement(targetPlayerId, 'kills', stats.kills);
                await this.playerService.updateBalance(targetPlayerId, gameConfig.TOKENS.KILL);
            }

            if (targetPlayerId && this.wsManager.clients?.has(targetPlayerId)) {
                this.wsManager.clients.get(targetPlayerId).send(JSON.stringify(data));
            }

            // Update stored stats
            this.playerStats.set(targetPlayerId, stats);

            logger.info(`Player ${targetPlayerId} ${type}, stats:`, {
                shots: stats.shots,
                hits: stats.hits,
                kills: stats.kills,
                accuracy: stats.accuracy,
                timestamp: new Date().toISOString()
            });

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

    getPlayerStats(playerId) {
        if (!this.playerStats.has(playerId)) {
            this.initPlayerStats(playerId);
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

    initPlayerStats(playerId) {
        const now = new Date();
        this.playerStats.set(playerId, {
            id: playerId,
            shots: 0,
            hits: 0,
            kills: 0,
            accuracy: 0,
            survivalStart: now.toISOString(), // Ensure it's a string
            location: {
                latitude: 0,
                longitude: 0,
                altitude: 0,
                accuracy: 0,
            },
            heading: 0
        });
        logger.info(`Initialized stats for player ${playerId} at ${now.toISOString()}`);
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