const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');
const AchievementService = require('../services/AchievementService');
const gameConfig = require('../config/gameConfig');

class GameHandler {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.playerService = new PlayerService();
        this.REWARDS = {
            HIT: 1,
            KILL: 5
        };
        this.playerStats = new Map();
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

    handleShot(data, playerId) {
        const stats = this.getPlayerStats(playerId);
        stats.shots++;
        this.updateAccuracy(playerId, stats);
        this.wsManager.broadcastToAll(data, playerId);
    }

    handleShotConfirmed(data, playerId) {
      const stats = this.getPlayerStats(playerId);
      stats.shots++;
      this.updateAccuracy(playerId, stats);
      this.wsManager.broadcastToAll(data, playerId);
    }

    async handleHit(data, playerId) {
        const { targetPlayerId, type } = data;
        const stats = this.getPlayerStats(playerId);

        try {
            const reward = type === 'kill' ? this.REWARDS.KILL : this.REWARDS.HIT;
            
            if (type === 'hitConfirmed' || type === 'kill') {
                const balance = await this.playerService.updateBalance(targetPlayerId, reward);
                logger.info(`${targetPlayerId} rewarded with ${reward} tokens, balance ${balance}`);
                
                if (type === 'hitConfirmed') {
                    stats.hits++;
                    this.updateAccuracy(playerId, stats);
                    await AchievementService.trackAchievement(playerId, 'hits', stats.hits);
                    await AchievementService.trackAchievement(playerId, 'accuracy', stats.accuracy);
                } else if (type === 'kill') {
                    stats.kills++;
                    await AchievementService.trackAchievement(playerId, 'kills', stats.kills);
                }
            }

            if (targetPlayerId && this.wsManager.clients?.has(targetPlayerId)) {
                this.wsManager.clients.get(targetPlayerId).send(JSON.stringify(data));
                logger.info(`From ${targetPlayerId} to ${playerId}`);
            }
        } catch (error) {
            logger.error('Error handling hit:', error);
        }
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

    initPlayerStats(playerId) {
        this.playerStats.set(playerId, {
            shots: 0,
            hits: 0,
            kills: 0,
            accuracy: 100,
            survivalStart: Date.now()
        });
    }

    getPlayerStats(playerId) {
        if (!this.playerStats.has(playerId)) {
            this.initPlayerStats(playerId);
        }
        return this.playerStats.get(playerId);
    }

    updateAccuracy(playerId, stats) {
        stats.accuracy = stats.shots > 0 ? 
            Math.round((stats.hits / stats.shots) * 100) : 100;
    }

    startSurvivalTracking(playerId) {
        const trackInterval = 60000;
        const interval = setInterval(async () => {
            if (!this.playerStats.has(playerId)) {
                clearInterval(interval);
                return;
            }

            const stats = this.playerStats.get(playerId);
            const survivalTime = Math.floor((Date.now() - stats.survivalStart) / 1000);
            await AchievementService.trackAchievement(playerId, 'survivalTime', survivalTime);
        }, trackInterval);
    }
}

module.exports = GameHandler;