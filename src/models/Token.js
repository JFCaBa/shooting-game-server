const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0
    },
    pendingBalance: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Token', tokenSchema);
