const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
    droneId: {
        type: String,
        required: true,
        unique: true
    },
    kind: {
        type: String,
        require: false,
        default: "drone"
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
        default: Date.now,
        expires: 60 // 1 minute
    }
});

module.exports = mongoose.model('Drone', droneSchema);