const jwt = require('jsonwebtoken');
require('dotenv').config();
const logger = require('../utils/logger');


const serviceAuthMiddleware = (req, res, next) => {
    try {
        logger.info('Request headers:', req.headers);
        const serviceKey = req.headers['service-key'];
        const serviceToken = req.headers['service-token'];

        if (serviceKey !== process.env.SERVICE_KEY) {
            return res.status(401).json({ error: 'Invalid service key' });
        }

        if (!serviceToken) {
            return res.status(401).json({ error: 'Service token required' });
        }

        const decoded = jwt.verify(serviceToken, process.env.SERVICE_SECRET);
        if (decoded.service !== 'cms') {
            throw new Error('Invalid service token');
        }

        req.service = decoded;
        next();
    } catch (error) {
        console.error('Service auth error:', error);
        res.status(401).json({ error: 'Invalid service authentication' });
    }
};

module.exports = serviceAuthMiddleware;