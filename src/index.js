require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const WebSocketManager = require('./websocket/WebSocketManager');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// WebSocket Setup
new WebSocketManager(server);

// Database Connection
connectDB();

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start Server
const WS_PORT = process.env.WS_PORT || 8182;
const API_PORT = process.env.API_PORT || 3000;

app.listen(API_PORT, () => {
  logger.info(`API Server running on port ${API_PORT}`);
});

server.listen(WS_PORT, () => {
  logger.info(`WebSocket server running on port ${WS_PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
