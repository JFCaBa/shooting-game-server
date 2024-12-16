const jwt = require('jsonwebtoken');

const serviceAuthMiddleware = (req, res, next) => {
    try {
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