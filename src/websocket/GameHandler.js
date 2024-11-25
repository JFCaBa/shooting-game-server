// src/websocket/GameHandler.js
class GameHandler {
    constructor(wsManager) {
      this.wsManager = wsManager;
    }
  
    handleShot(data, playerId) {
      this.wsManager.broadcastToAll(data, playerId);
    }
  
    handleHit(data, playerId) {
      const { targetPlayerId } = data;
      if (targetPlayerId && this.wsManager.clients.has(targetPlayerId)) {
        this.wsManager.clients.get(targetPlayerId).send(JSON.stringify(data));
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