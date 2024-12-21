const mongoose = require('mongoose');

const geoCoordinateSchema = new mongoose.Schema({
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    altitude: {
        type: Number,
        required: true
    }
});

const geoObjectMetadataSchema = new mongoose.Schema({
    reward: {
        type: Number,
        default: null
    },
    spawnedAt: {
        type: Date,
        default: Date.now
    }
});

const geoObjectSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    kind: {
        type: String,
        require: false,
        default: "geoObject"
    },
    type: {
        type: String,
        required: true,
        enum: ['weapon', 'target', 'powerup']
    },
    coordinate: {
        type: geoCoordinateSchema,
        required: true
    },
    metadata: {
        type: geoObjectMetadataSchema,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Document will be automatically deleted after 1 hour
    }
});

module.exports = mongoose.model('GeoObject', geoObjectSchema);