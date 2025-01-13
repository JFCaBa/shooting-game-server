require("dotenv").config();
const connectDB = require("./config/database");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const https = require("https");
const fs = require("fs");
const WebSocketManager = require("./websocket/WebSocketManager");

const geoObjectController = require("./controllers/geoObjectController");

const playerRoutes = require("./routes/playerRoutes");
const achievementRoutes = require("./routes/achievementRoutes");
const hallOfFameRoutes = require("./routes/hallOfFameRoutes");
const droneConfigRoutes = require("./routes/droneConfigRoutes");
const authRoutes = require("./routes/authRoutes");
const geoObjectRoutes = require("./routes/geoObjectRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");

const authMiddleware = require("./middleware/authMiddleware");
const serviceAuthMiddleware = require("./middleware/serviceAuthMiddleware");

const cleanupJob = require("./jobs/cleanUpJobs");
const logger = require("./utils/logger");
const app = express();

// Load SSL certificates
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY, "utf8");
const certificate = fs.readFileSync(process.env.CERTIFICATE, "utf8");
const ca = fs.readFileSync(process.env.CA, "utf8");

const credentials = { key: privateKey, cert: certificate, ca: ca };

// Create HTTPS server
const server = https.createServer(credentials, app);

const WS_PORT = process.env.WS_PORT || 8182;
const API_PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// WebSocket Setup
const wsManager = new WebSocketManager(server);
geoObjectController.initialize(wsManager);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", playerRoutes);
app.use("/api/v1", achievementRoutes);
app.use("/api/v1", hallOfFameRoutes);
app.use("/api/v1", droneConfigRoutes);
app.use("/api/v1", inventoryRoutes);

// Protected Routes - all these routes will require authentication
app.use("/api/drone-config", serviceAuthMiddleware, droneConfigRoutes);
app.use("/api/v1", serviceAuthMiddleware, geoObjectRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const startServer = async () => {
  // Start the cleanup job
  cleanupJob.start();

  //  Start API and Websocket
  try {
    await connectDB();

    server.listen(WS_PORT, () => {
      logger.info(`WebSocket server running on port ${WS_PORT}`);
    });

    app.listen(API_PORT, () => {
      logger.info(`API Server running on port ${API_PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on("SIGTERM", () => {
  cleanupJob.stop();
  server.close(() => process.exit(0));
});

startServer();
