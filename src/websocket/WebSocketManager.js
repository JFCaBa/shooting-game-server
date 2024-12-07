const WebSocket = require('ws');
const logger = require('../utils/logger');
const GameHandler = require('./GameHandler');
const Player = require('../models/Player');
const notificationService = require('../services/NotificationService');

class WebSocketManager {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map();
        this.gameHandler = new GameHandler(this);
        this.notificationService = notificationService;
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
        logger.info('WebSocket server initialized');
    }

    handleConnection(ws, req) {
        logger.info(`New connection from ${req.socket.remoteAddress}`);
        let playerId = null;
        let senderId = null;

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                playerId = data.playerId;
                senderId = data.senderId;
                this.handleMessage(data, playerId, senderId, ws);
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

    async handleMessage(data, playerId, senderId, ws) {
        logger.info('Message received:', {
            type: data.type,
            from: playerId
        });

        switch (data.type) {
            case 'join':
                if (data.pushToken) {
                    await this.updatePlayerPushToken(playerId, data.pushToken);
                }
                this.gameHandler.handleJoin(data, playerId, ws);
                await this.notificationService.notifyPlayersAboutNewJoin(data.data.player);
                break;
            case 'shoot':
                this.gameHandler.handleShot(data, playerId);
                this.broadcastToAll(data, playerId);
                break;
            case 'shootConfirmed':
                this.gameHandler.handleShotConfirmed(data, playerId);
                this.sendMessageToPlayer(data, senderId)
                break;
            case 'hit':
                break;
            case 'hitConfirmed':
                this.gameHandler.handleHitConfirmed(data, senderId);
                break;
            case 'kill':
                this.gameHandler.handleKill(data, playerId, senderId);
                break;
        }
    }

    broadcastToAll(message, senderId) {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;

        this.clients.forEach((ws, id) => {
            if (id !== senderId && ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
                sentCount++;
            }
        });
    }

    sendMessageToPlayer(message, senderId) {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;

        this.clients.forEach((ws, id) => {
            if (id == senderId && ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
                sentCount++;
            }
        });
    }

    async updatePlayerPushToken(playerId, pushToken) {
        try {
            await Player.findOneAndUpdate(
                { playerId },
                {
                    $set: {
                        pushToken,
                        pushTokenUpdatedAt: new Date()
                    }
                },
                { upsert: true }
            );
        } catch (error) {
            logger.error('Error updating push token:', error);
        }
    }
}

module.exports = WebSocketManager;