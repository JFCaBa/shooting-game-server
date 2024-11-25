# ShootingApp Game Server

Real-time multiplayer game server supporting player interactions, achievements, and wallet connections.

## Prerequisites

- Node.js >= 14
- MongoDB >= 6.0
- MetaMask wallet

## Setup

```bash
# Install dependencies
npm install

# Configure MongoDB
mongosh
# Create admin user in MongoDB shell
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password", 
  roles: ["userAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create app user
use shootingapp
db.createUser({
  user: "gameserver",
  pwd: "another_secure_password",
  roles: ["readWrite"]
})

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## Endpoints

- WebSocket: `ws://localhost:8182`
- API: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`

## Game Messages

```javascript
{
  type: 'shoot' | 'hit' | 'hitConfirmed' | 'kill' | 'leave',
  playerId: string,
  data: {
    player: {
      location: {
        latitude: number,
        longitude: number,
        altitude: number,
        accuracy: number
      },
      heading: number
    },
    shotId?: string,
    hitPlayerId?: string,
    damage?: number
  },
  timestamp: string,
  targetPlayerId?: string
}
```

## License

MIT
