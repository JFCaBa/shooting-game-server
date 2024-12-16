// src/models/DroneConfig.js
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
}, {
  timestamps: true
});

// Add validation to ensure min is less than max
droneConfigSchema.pre('save', function(next) {
  if (this.xMin >= this.xMax) {
    next(new Error('xMin must be less than xMax'));
  }
  if (this.yMin >= this.yMax) {
    next(new Error('yMin must be less than yMax'));
  }
  if (this.zMin >= this.zMax) {
    next(new Error('zMin must be less than zMax'));
  }
  next();
});

module.exports = mongoose.model('DroneConfig', droneConfigSchema);