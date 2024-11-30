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
            this.wsManager.clients.set(playerId, ws);
            this.initPlayerStats(playerId);
            this.startSurvivalTracking(playerId);
        }
        else {
            logger.info(`Already registered`)
        }
        this.wsManager.broadcastToAll(data, playerId);
    }

    handleShot(data, playerId) {
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
        this.wsManager.clients.delete(playerId);
        this.playerStats.delete(playerId);
        this.wsManager.broadcastToAll({
            type: 'leave',
            playerId,
            data: { player: null },
            timestamp: new Date().toISOString()
        }, playerId);
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