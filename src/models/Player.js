const mongoose = require('mongoose');
const locationSchema = require('./Location');
const e = require('express');

const playerSchema = new mongoose.Schema({
    playerId: {
        type: String,
        required: true,
        unique: true
    },
    kind: {
        type: String,
        required: false,
        default: "player"
    },
    walletAddress: {
        type: String,
        required: false,
        default: null
    },
    nickName: {
        type: String,
        required: false,
        default: null
    },
    passwordHash: {
        type: String,
        required: false,
        default: null
    },
    passwordSalt: {
        type: String,
        required: false,
        default: null
    },
    email: {
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
        accuracy: { type: Number, default: 0 }
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
    },
    location: {
        type: locationSchema, 
        default: () => ({})
    }
});

module.exports = mongoose.model('Player', playerSchema);