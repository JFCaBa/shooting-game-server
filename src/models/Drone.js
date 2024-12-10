const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
    droneId: {
        type: String,
        required: true,
        unique: true
    },
    position: {
        x: Number,
        y: Number,
        z: Number
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Drone', droneSchema);
