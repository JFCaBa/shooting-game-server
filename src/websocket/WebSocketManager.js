require('dotenv').config();
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const logger = require('../utils/logger');
const GameHandler = require('./GameHandler');
const Player = require('../models/Player');
const notificationService = require('../services/NotificationService');
const droneService = require('../services/DroneService');
const gameConfig = require('../config/gameConfig');

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
        this.notificationService = notificationService;
        this.droneService = droneService;
        this.droneGenerationInterval = null;
        this.setupWebSocket();
        this.startDroneGeneration();
    }

    startDroneGeneration() {
        if (this.droneGenerationInterval) {
            clearInterval(this.droneGenerationInterval);
        }
    
        this.droneGenerationInterval = setInterval(async () => {
            try {
                for (const [playerId, ws] of this.clients.entries()) {
                    // Lock drone count during generation to avoid overlaps
                    const currentDroneCount = this.droneService.getDroneCount(playerId);
                    if (currentDroneCount >= gameConfig.MAX_DRONES_PER_PLAYER) {
                        continue; // Skip if max drones already reached
                    }
    
                    const drone = await this.droneService.generateDrone(playerId);
                    if (drone) {
                        const message = {
                            type: 'newDrone',
                            playerId: playerId,
                            data: {
                                droneId: drone.droneId,
                                position: {
                                    x: drone.position.x,
                                    y: drone.position.y,
                                    z: drone.position.z,
                                },
                                reward: gameConfig.TOKENS.DRONE,
                            },
                        };
    
                        await this.sendMessageToPlayer(message, playerId);
                    }
                }
            } catch (error) {
                logger.error(`Drone generation error: ${error.message}`);
            }
        }, 10000);
    }

    stopDroneGeneration() {
        if (this.droneGenerationInterval) {
            clearInterval(this.droneGenerationInterval);
            this.droneGenerationInterval = null;
        }
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
                this.clients.set(playerId, ws);
                await this.handleMessage(data, playerId, ws);
            } catch (error) {
                logger.error(`Error processing message from ${ip}: ${error.message}`);
            }
        });

        ws.on('close', () => {
            if (playerId) {
                this.clients.delete(playerId);
                this.droneService.removePlayerDrones(playerId);
                logger.info(`Player ${playerId} disconnected`);
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
                await this.sendMessageToPlayer(data, senderId)
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
                this.gameHandler.handleShotDrone(data, playerId);
                break;
        }
    }


    async sendMessageToPlayer(message, playerId) {
        const ws = this.clients.get(playerId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
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