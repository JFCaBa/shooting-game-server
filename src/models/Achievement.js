const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['kills', 'hits', 'survivalTime', 'accuracy'],
    required: true
  },
  milestone: {
    type: Number,
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  nftTokenId: String
});

module.exports = mongoose.model('Achievement', achievementSchema);
