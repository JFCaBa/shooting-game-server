const WebSocket = require('ws');
const logger = require('../utils/logger');
const PlayerService = require('../services/PlayerService');
const GameHandler = require('./GameHandler');

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // WebSocket connections in memory
    this.playerService = new PlayerService();
    this.gameHandler = new GameHandler(this);
    this.setupWebSocket();
    this.startCleanupInterval();
  }

  startCleanupInterval() {
    setInterval(async () => {
      await this.playerService.removeInactivePlayers();
    }, 60000); // Run every minute
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    logger.info('WebSocket server initialized');
  }

  handleConnection(ws, req) {
    logger.info(`New connection from ${req.socket.remoteAddress}`);
    let playerId = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        playerId = data.playerId;
        
        if (!this.clients.has(playerId)) {
          logger.info(`Registering new player: ${playerId}`);
          this.clients.set(playerId, ws);
          await this.playerService.updatePlayerStatus(playerId, data.data?.player);
        }

        this.handleMessage(data, playerId);
      } catch (error) {
        logger.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      if (playerId) {
        logger.info(`Player disconnected: ${playerId}`);
        this.gameHandler.handleDisconnect(playerId);
      }
    });
  }

  async handleMessage(data, playerId) {
    logger.info('Message received:', {
      type: data.type,
      from: playerId
    });

    // Update player data in MongoDB
    if (data.data?.player) {
      await this.playerService.updatePlayerStatus(playerId, data.data.player);
    }

    switch (data.type) {
      case 'shoot':
        this.gameHandler.handleShot(data, playerId);
        break;
      case 'hit':
      case 'hitConfirmed':
      case 'kill':
        this.gameHandler.handleHit(data, playerId);
        break;
    }
  }

  broadcastToAll(message, senderId) {
    const messageStr = JSON.stringify(message);
    logger.debug('Broadcasting message:', {
      sender: senderId,
      type: message.type,
      recipients: Array.from(this.clients.keys()).filter(id => id !== senderId)
    });

    let sentCount = 0;
    this.clients.forEach((ws, id) => {
      if (id !== senderId) {
        ws.send(messageStr);
        sentCount++;
      }
    });

    logger.debug(`Message sent to ${sentCount} clients`);
  }
}

module.exports = WebSocketManager;