const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    playerId: {
        type: String,
        required: true,
        unique: true
    },
    walletAddress: {
        type: String,
        required: false,
        default: null
    },
    pushToken: {
        type: String,
        default: null
    },
    pushTokenUpdatedAt: {
        type: Date,
        default: null
    },
    stats: {
        kills: { type: Number, default: 0 },
        hits: { type: Number, default: 0 },
        deaths: { type: Number, default: 0 },
        droneHits: { type: Number, default: 0 },
        survivalStart: { type: Date, default: Date.now },
        accuracy: {type: Number, default: 0}
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    mintedBalance: {
        type: Number,
        default: 0
    },
    pendingBalance: {
        type: Number,
        default: 0
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Player', playerSchema);