const mongoose = require('mongoose');

const droneConfigSchema = new mongoose.Schema({
    xMin: {
        type: Number,
        required: true,
        default: -5
    },
    xMax: {
        type: Number,
        required: true,
        default: 5
    },
    yMin: {
        type: Number,
        required: true,
        default: 1.5
    },
    yMax: {
        type: Number,
        required: true,
        default: 3
    },
    zMin: {
        type: Number,
        required: true,
        default: -8
    },
    zMax: {
        type: Number,
        required: true,
        default: -3
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('DroneConfig', droneConfigSchema);