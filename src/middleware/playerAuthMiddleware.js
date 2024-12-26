require('dotenv').config();
const logger = require('../utils/logger');
const Player = require('../models/Player'); 
const jwt = require('jsonwebtoken');

const playerAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const player = await Player.findOne({ playerId: decoded.playerId });
        if (!player) {
            throw new Error('Player not found');
        }

        req.user = player;
        next();
    } catch (error) {
        logger.error('Player Auth middleware error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = playerAuthMiddleware;