const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    altitude: {
        type: Number,
        default: 0
    },
    accuracy: {
        type: Number,
        default: 2000
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = locationSchema;