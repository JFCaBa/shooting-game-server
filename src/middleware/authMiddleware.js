const jwt = require('jsonwebtoken');
const AuthService = require('../services/AuthService');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = await AuthService.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authMiddleware;