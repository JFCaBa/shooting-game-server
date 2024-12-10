const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
    droneId: {
        type: String,
        required: true,
        unique: true
    },
    playerId: {
        type: String,
        required: true
    },
    position: {
        x: Number,
        y: Number,
        z: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Drone', droneSchema);
