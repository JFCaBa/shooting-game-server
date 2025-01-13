require("dotenv").config();
const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const logger = require("../utils/logger");
const Player = require("../models/Player");
const notificationService = require("../services/NotificationService");
const GameHandler = require("../handlers/GameHandler");
const GeoObjectHandler = require("../handlers/GeoObjectHandler");
const DroneHandler = require("../handlers/DroneHandler");

// Load SSL certificate
const serverOptions = {
  key: fs.readFileSync(process.env.PRIVATE_KEY, "utf8"),
  cert: fs.readFileSync(process.env.CERTIFICATE, "utf8"),
  ca: fs.readFileSync(process.env.CA, "utf8"),
};

// Create HTTPS server with SSL
const server = https.createServer(serverOptions);

class WebSocketManager {
  constructor(server) {
    if (WebSocketManager.instance) {
      return WebSocketManager.instance;
    }
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map of playerId -> WebSocket
    this.gameHandler = new GameHandler(this);
    this.geoObjectHandler = new GeoObjectHandler(this);
    this.droneHandler = new DroneHandler(this);
    this.notificationService = notificationService;
    this.setupWebSocket();
    // this.droneHandler.startDroneGeneration();
  }

  static getInstance(server) {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(server);
    }
    return WebSocketManager.instance;
  }

  setupWebSocket() {
    this.wss.on("connection", (ws, req) => this.handleConnection(ws, req));
    logger.info("WebSocket server initialized");
  }

  handleConnection(ws, req) {
    const ip = req.socket.remoteAddress;
    logger.info(`New connection from ${ip}`);

    let playerId = null;

    ws.on("message", async (message) => {
      try {
        if (message == "ping") {
          ws.send("pong");
          return;
        }
        const data = JSON.parse(message);
        logger.info(`Received message from ${ip}: ${JSON.stringify(data)}`);
        playerId = data.playerId;
        const senderId = data.senderId || null; // Use senderId if available; otherwise, set to null
        await this.handleMessage(data, playerId, senderId, ws); // Pass senderId to handleMessage
      } catch (error) {
        logger.error(`Error processing message from ${ip}: ${error.message}`);
        throw error;
      }
    });

    ws.on("close", () => {
      if (playerId) {
        this.clients.delete(playerId);
        this.geoObjectHandler.removeAllGeoObjects(playerId);
        this.droneHandler.removePlayerDrones(playerId);
        logger.info(`Player ${playerId} disconnected`);
      }
    });
  }

  async handleMessage(message, playerId, senderId, ws) {
    switch (message.type) {
      case "join":
        if (message.pushToken) {
          await this.updatePlayerPushToken(playerId, message.pushToken);
        }
        await this.gameHandler.handleJoin(message.data, ws);
        if (playerId && !this.clients.has(playerId)) {
          await this.notificationService.notifyPlayersAboutNewJoin(
            message.data
          );
          await this.geoObjectHandler.startGeoObjectGeneration(message);
          await this.droneHandler.generateDrone(playerId);
        }
        break;

      case "shoot":
        await this.gameHandler.handleShot(message, playerId);
        await this.gameHandler.updatePlayerLocation(
          message.data.location,
          message.data.playerId
        );
        await this.geoObjectHandler.startGeoObjectGeneration(message.data);
        await this.droneHandler.generateDrone(playerId);
        await this.broadcastToAll(message, playerId);
        break;

      case "shootConfirmed":
        await this.sendMessageToPlayer(message, senderId);
        break;

      case "hit":
        break;

      case "hitConfirmed":
        await this.gameHandler.handleHitConfirmed(message, senderId);
        break;

      case "kill":
        await this.gameHandler.handleKill(message, playerId, senderId);
        break;

      case "shootDrone":
        await this.droneHandler.handleShotDrone(message, playerId);
        await this.droneHandler.generateDrone(playerId);
        break;

      case "removeDrones":
        await this.droneHandler.removePlayerDrones(playerId);
        break;

      case "geoObjectHit":
        await this.geoObjectHandler.handleGeoObjectHit(message.data, playerId);
        break;

      case "geoObjectShootConfirmed":
        await this.sendMessageToPlayer(message, playerId);
        break;

      case "geoObjectShootRejected":
        await this.sendMessageToPlayer(message, playerId);
        break;

      case "reload":
        await this.gameHandler.handleReload(playerId);
        break;

      case "recover":
        await this.gameHandler.handleRecover(playerId);
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
        // logger.info(`Broadcasting message to player ${playerId}`);
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
            pushTokenUpdatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error("Error updating push token:", error);
    }
  }
}

module.exports = WebSocketManager;
