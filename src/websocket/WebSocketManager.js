require('dotenv').config();
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const logger = require('../utils/logger');
const Player = require('../models/Player');
const notificationService = require('../services/NotificationService');
const GameHandler = require('../handlers/GameHandler');
const GeoObjectHandler = require('../handlers/GeoObjectHandler');
const DroneHandler = require('../handlers/DroneHandler');


// Load SSL certificate
const serverOptions = {
    key: fs.readFileSync(process.env.PRIVATE_KEY, 'utf8'),
    cert: fs.readFileSync(process.env.CERTIFICATE, 'utf8'),
    ca: fs.readFileSync(process.env.CA, 'utf8'), 
  };

  // Create HTTPS server with SSL
const server = https.createServer(serverOptions);

class WebSocketManager {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Map of playerId -> WebSocket
        this.gameHandler = new GameHandler(this);
        this.geoObjectHandler = new GeoObjectHandler(this);
        this.droneHandler = new DroneHandler(this);
        this.notificationService = notificationService;
        this.setupWebSocket();
        this.droneHandler.startDroneGeneration();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
        logger.info('WebSocket server initialized');
    }

    handleConnection(ws, req) {
        const ip = req.socket.remoteAddress;
        logger.info(`New connection from ${ip}`);

        let playerId = null;

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                playerId = data.playerId;
                const senderId = data.senderId || null; // Use senderId if available; otherwise, set to null
                
                logger.info(`Received: ${message}`);
                
                await this.handleMessage(data, playerId, senderId, ws); // Pass senderId to handleMessage
            } catch (error) {
                logger.error(`Error processing message from ${ip}: ${error.message}`);
            }
        });

        ws.on('close', () => {
            if (playerId) {
                this.clients.delete(playerId);
                this.geoObjectHandler.removeAllGeoObjects(playerId);
                logger.info(`Player ${playerId} disconnected`);
            }
        });
    }

    async handleMessage(data, playerId, senderId, ws) {
        logger.info('Message received:', {
            type: data.type,
            from: playerId,
            to: senderId
        });

        switch (data.type) {
            case 'join':
                if (data.pushToken) {
                    await this.updatePlayerPushToken(playerId, data.pushToken);
                }
                this.gameHandler.handleJoin(data, playerId, ws);
                await this.notificationService.notifyPlayersAboutNewJoin(data);
                await this.geoObjectHandler.startGeoObjectGeneration(data);
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

            case 'shootDrone':
                await this.droneHandler.handleShotDrone(data, playerId);
                break;
            
            case 'removeDrones':
                await this.droneHandler.removePlayerDrones(playerId);
                break;

            case 'geoObjectHit':
                await this.geoObjectHandler.handleGeoObjectHit(data, playerId);
                break;
            
            case 'geoObjectShootConfirmed':
                await this.sendMessageToPlayer(data, playerId);
                break;

            case 'geoObjectShootRejected':
                await this.sendMessageToPlayer(data, playerId);
                break;
        }
    }

    async sendMessageToPlayer(message, playerId) {
        
        const ws = this.clients.get(playerId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            logger.warn(`WebSocket for player ${playerId} is not open or missing`);
            return;
        }
        ws.send(JSON.stringify(message));
    }

    async broadcastToAll(message, senderId) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((ws, playerId) => {
            if (playerId !== senderId && ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
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