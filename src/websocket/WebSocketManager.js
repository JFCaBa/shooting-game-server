const WebSocket = require('ws');
const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map();
    this.players = new Map();
    this.playerService = new PlayerService();
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
  }

  handleConnection(ws, req) {
    let playerId = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        playerId = data.playerId;
        
        if (!this.clients.has(playerId)) {
          this.clients.set(playerId, ws);
          this.players.set(playerId, data.data?.player);
          await this.playerService.updatePlayerStatus(playerId);
        }

        this.handleMessage(data, playerId);
      } catch (error) {
        logger.error('Error processing message:', error);
      }
    });

    ws.on('close', () => this.handleDisconnection(playerId));
  }

  handleMessage(data, playerId) {
    switch (data.type) {
      case 'shoot':
        this.broadcastToAll(data, playerId);
        break;
      case 'hit':
      case 'hitConfirmed':
      case 'kill':
        this.sendToTarget(data);
        break;
    }
  }

  handleDisconnection(playerId) {
    if (playerId) {
      this.clients.delete(playerId);
      this.players.delete(playerId);
      this.broadcastToAll({
        type: 'leave',
        playerId: playerId,
        data: { player: null },
        timestamp: new Date().toISOString()
      }, playerId);
    }
  }

  sendToTarget(data) {
    const targetId = data.targetPlayerId;
    if (targetId && this.clients.has(targetId)) {
      this.clients.get(targetId).send(JSON.stringify(data));
    }
  }

  broadcastToAll(message, senderId) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((ws, id) => {
      if (id !== senderId) {
        ws.send(messageStr);
      }
    });
  }
}

module.exports = WebSocketManager;
