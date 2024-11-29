const logger = require('../utils/logger');
const TokenService = require('../services/TokenService');

class GameHandler {
    constructor(wsManager) {
        this.wsManager = wsManager;
        this.tokenService = new TokenService();
    }

    handleShot(data, playerId) {
        this.wsManager.broadcastToAll(data, playerId);
    }

    async handleHit(data, playerId) {
        const { targetPlayerId, type } = data;
        
        try {
            if (type === 'hitConfirmed') {
                await this.tokenService.addTokensForHit(playerId);
            } else if (type === 'kill') {
                await this.tokenService.addTokensForKill(playerId);
            }

            if (targetPlayerId && this.wsManager.clients.has(targetPlayerId)) {
                this.wsManager.clients.get(targetPlayerId).send(JSON.stringify(data));
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