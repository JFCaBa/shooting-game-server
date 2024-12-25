const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');
const AchievementService = require('../services/AchievementService');
const RewardHistory = require('../models/RewardHistory');
const Player = require('../models/Player');
const gameConfig = require('../config/gameConfig');

class GameHandler {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.playerService = new PlayerService();
        this.playerStats = new Map();
        this.SURVIVAL_RADIUS = 0.1; // 100 meters
    }

    async handleKill(data, playerId, senderId) {
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
            this.playerStats.set(playerId, playerStats)

            // Update sender's kill count in DB
            await Player.findOneAndUpdate(
                { playerId: senderId },
                { $inc: { 'stats.kills': 1 } }
            );

            // Update target's death count
            await Player.findOneAndUpdate(
                { playerId: playerId },
                { $inc: { 'stats.deaths': 1 } }
            );

            await RewardHistory.create({
                playerId: senderId,
                rewardType: 'KILL',
                amount: gameConfig.TOKENS.KILL
            });

            // Track achievement with the updated kill count
            logger.info(`Tracking kill achievement for ${senderId}, kills: ${senderStats.kills}`);
            await AchievementService.trackAchievement(senderId, 'kills', senderStats.kills);
            

            // Notify target about the kill
            if (senderId && this.wsManager.clients?.has(senderId)) {
                this.wsManager.clients.get(senderId).send(JSON.stringify(data));
            }

        } catch (error) {
            logger.error('Error handling kill:', error);
            throw error;
        }
    }

    async handleHitConfirmed(data, senderId) {
        try {
            const senderStats = await this.getPlayerStats(senderId);
            if (!senderStats.hits) senderStats.hits = 0;
            if (!senderStats.accuracy) senderStats.accuracy = 0;

            senderStats.hits++;
            senderStats.shots = senderStats.shots || senderStats.hits; // Ensure shots is never less than hits
            this.playerStats.set(senderId, senderStats)

            this.updateAccuracy(senderId, senderStats);

            logger.info(`Tracking hit achievement for ${senderId}, hits: ${senderStats.hits}`);
            await AchievementService.trackAchievement(senderId, 'hits', senderStats.hits);
            
            logger.info(`Tracking accuracy achievement for ${senderId}, accuracy: ${senderStats.accuracy}`);
            await AchievementService.trackAchievement(senderId, 'accuracy', senderStats.accuracy);

            // Update hit count for sender
            await Player.findOneAndUpdate(
                { playerId: senderId },
                { $inc: { 'stats.hits': 1 } }
            );

            // Update accuracy for sender
            await Player.findOneAndUpdate(
                { playerId: senderId },
                { $set: { 'stats.accuracy': senderStats.accuracy } }
            );

            await RewardHistory.create({
                playerId: senderId,
                rewardType: 'HIT',
                amount: gameConfig.TOKENS.HIT
            });

            // Send the message to the player so the app will update the score
            if (senderId && this.wsManager.clients?.has(senderId)) {
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
    }

    updateAccuracy(playerId, stats) {
        if (stats.shots > 0) {
            stats.accuracy = Math.min(100, Math.round((stats.hits / stats.shots) * 100));
        } else {
            stats.accuracy = 0;
        }
    }

    async getPlayerStats(playerId) {
        try {
            const player = await Player.findOne({ playerId });
            if (!player) {
                logger.warn(`Player ${playerId} not found. Initializing default stats.`);
                return {
                    shots: 0,
                    hits: 0,
                    kills: 0,
                    deaths: 0,
                    accuracy: 0,
                    survivalStart: Date.now(),
                };
            }
            return player.stats || {};
        } catch (error) {
            logger.error(`Error fetching stats for player ${playerId}:`, error);
            return {
                shots: 0,
                hits: 0,
                kills: 0,
                deaths: 0,
                accuracy: 0,
                survivalStart: Date.now(),
            };
        }
    }

    handleShotConfirmed(data, playerId) {
        const stats = this.getPlayerStats(playerId);
        stats.shots++;
        this.updateAccuracy(playerId, stats);
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
  
    async hasNearbyPlayers(playerId) {
        try {
            const player = await Player.findOne({ playerId });
            if (!player?.location?.latitude || !player?.location?.longitude) return false;

            const activePlayers = await Player.find({
                playerId: { $ne: playerId },
                lastActive: { $gte: new Date(Date.now() - 5 * 60000) }
            });

            const playerLat = Math.round(player.location.latitude * 1000) / 1000;
            const playerLon = Math.round(player.location.longitude * 1000) / 1000;

            return activePlayers.some(otherPlayer => {
                if (!otherPlayer.location?.latitude || !otherPlayer.location?.longitude) return false;
                
                const otherLat = Math.round(otherPlayer.location.latitude * 1000) / 1000;
                const otherLon = Math.round(otherPlayer.location.longitude * 1000) / 1000;

                return playerLat === otherLat && playerLon === otherLon;
            });
        } catch (error) {
            logger.error(`Error checking nearby players for ${playerId}:`, error);
            return false;
        }
    }

    startSurvivalTracking(playerId) {
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
                    now: Date.now()
                });
                return;
            }

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

    async handleJoin(player, ws) {
        if (player.playerId && !this.wsManager.clients.has(player.playerId)) {
            logger.info(`Registering new player: ${player.playerId}`);
        
            // Add the new player to WebSocket manager
            this.wsManager.clients.set(player.playerId, ws);
    
            // Update player location if provided
            if (player.location) {
                const updatedLocation = {
                    latitude: player.location.latitude,
                    longitude: player.location.longitude,
                    accuracy: player.location.accuracy,
                    altitude: player.location.altitude,
                    updatedAt: new Date()
                };
    
                try {
                    await Player.findOneAndUpdate(
                        { playerId: player.playerId },
                        { 
                            $set: { 
                                location: updatedLocation,
                                lastActive: new Date() // Update lastActive to the current timestamp
                            }
                        },
                        { new: true } // Return the updated document
                    );
                } catch (error) {
                    logger.error(`Error updating player location: ${error.message}`);
                }
            }
    
            try {
                // Fetch or create the player in the database
                await this.playerService.getPlayer(player.playerId);
    
                // Initialize player stats
                this.initPlayerStats(player.playerId);
    
                // Start tracking survival
                this.startSurvivalTracking(player.playerId);
                
                const message = {  
                    type: 'announced',
                    playerId: player.playerId,
                    data: player,
                    timestamp: new Date().toISOString()
                };

                // Send joined player to the players in the game
                await this.wsManager.broadcastToAll(message, player.playerId);

            } catch (error) {
                logger.error(`Error registering new player: ${error.message}`);
            }
        } else {
            logger.info(`Player ${player.playerId} is already connected.`);
        }
    
        // Broadcast the join message to all clients
        this.wsManager.broadcastToAll(player, player.playerId);
    }
}

module.exports = GameHandler;