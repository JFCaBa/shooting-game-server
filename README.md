# Server Setup

## Prerequisites Installation
```bash
# Install Node.js >= 14
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB >= 6.0
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

## Initial Project Setup
```bash
# Clone repository
git clone <repository-url>
cd shootingapp-server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Required environment variables
MONGO_URI=mongodb://gameserver:password@localhost:27017/shootingapp?authSource=admin
WEB3_PROVIDER_URL=<your-web3-provider>
TOKEN_ADDRESS=<your-token-contract-address>
OWNER_ADDRESS=<your-owner-wallet-address>
FIREBASE_PROJECT_ID=<your-firebase-project-id>
WS_PORT=8182
API_PORT=3000
HEALTH_PORT=8183
```

## Firebase Setup
```bash
# Install firebase-admin if not present
npm install firebase-admin@13.0.1

# Place serviceAccountKey.json in config folder
mkdir -p src/config
# Copy your Firebase service account key to:
# src/config/serviceAccountKey.json
```

## Database Setup
```bash
# Start MongoDB
sudo systemctl start mongod

# Create database users
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password",
  roles: ["userAdminAnyDatabase", "readWriteAnyDatabase"]
})

use shootingapp
db.createUser({
  user: "gameserver",
  pwd: "another_secure_password",
  roles: ["readWrite"]
})

# Run migrations
npm run migrate
```

## Dependency Verification
```bash
# Verify all required dependencies
npm ls firebase-admin
npm ls ws
npm ls express
npm ls mongoose
npm ls web3
npm ls winston
npm ls helmet
npm ls cors
npm ls dotenv
```

## Running the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Health Check
```bash
# Verify server is running
curl http://localhost:3000/health
curl http://localhost:8183
```
