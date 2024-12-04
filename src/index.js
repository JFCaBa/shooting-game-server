require('dotenv').config();
const connectDB = require('./config/database');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const WebSocketManager = require('./websocket/WebSocketManager');

const playerRoutes = require('./routes/playerRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const hallOfFameRoutes = require('./routes/hallOfFameRoutes');

const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const WS_PORT = process.env.WS_PORT || 8182;
const API_PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// WebSocket Setup
const wsManager = new WebSocketManager(server);

// Routes
app.use('/api/v1', playerRoutes);
app.use('/api/v1', achievementRoutes);
app.use('/api/v1', hallOfFameRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const startServer = async () => {
  try {
    await connectDB();
    
    server.listen(WS_PORT, () => {
      logger.info(`WebSocket server running on port ${WS_PORT}`);
    });

    app.listen(API_PORT, () => {
      logger.info(`API Server running on port ${API_PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

startServer();