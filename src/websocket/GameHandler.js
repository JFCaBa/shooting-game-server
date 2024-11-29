const logger = require('../utils/logger');
// const TokenService = require('../services/TokenService');
const TokenBalanceService = require('../services/TokenBalanceService');
const gameConfig = require('../config/gameConfig');

class GameHandler {
    constructor(wsManager) {
        this.wsManager = wsManager;
        // this.tokenService = new TokenService();
        this.tokenBalanceService = new TokenBalanceService();
        this.REWARDS = {
            HIT: 1,
            KILL: 5
          };
    }

    handleJoin(data, playerId, ws) {
        if (!this.wsManager.clients.has(playerId)) {
          logger.info(`Registering new player: ${playerId}`);
          this.wsManager.clients.set(playerId, ws);
        }
        else {
            logger.info(`Already registered`)
        }
        this.wsManager.broadcastToAll(data, playerId);
    }

    handleShot(data, playerId) {
        this.wsManager.broadcastToAll(data, playerId);
    }

    async handleHit(data, playerId) {
        const { targetPlayerId, type } = data;
        try {
          const reward = type === 'kill' ? this.REWARDS.KILL : this.REWARDS.HIT;
          
          if (type === 'hitConfirmed' || type === 'kill') {
            await this.tokenBalanceService.updateBalance(targetPlayerId, reward);
            logger.info(`${targetPlayerId} rewarded with ${reward} tokens`)
          }

          if (targetPlayerId && this.wsManager.clients?.has(targetPlayerId)) {
            this.wsManager.clients.get(targetPlayerId).send(JSON.stringify(data));
            logger.info(`From ${targetPlayerId} to ${playerId}`)
          }
        } catch (error) {
          logger.error('Error handling hit:', error);
        }
    }

    handleDisconnect(playerId) {
        this.wsManager.clients.delete(playerId);
        this.wsManager.broadcastToAll({
            type: 'leave',
            playerId,
            data: { player: null },
            timestamp: new Date().toISOString()
        }, playerId);
    }
}

module.exports = GameHandler;