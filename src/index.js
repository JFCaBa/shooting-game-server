require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const WebSocketManager = require('./websocket/WebSocketManager');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(helmet());
app.use(express.json());

const wsManager = new WebSocketManager(server);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const WS_PORT = process.env.WS_PORT || 8182;
const API_PORT = process.env.API_PORT || 3000;

server.listen(WS_PORT, () => {
  logger.info(`WebSocket server running on port ${WS_PORT}`);
});

app.listen(API_PORT, () => {
  logger.info(`API Server running on port ${API_PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});