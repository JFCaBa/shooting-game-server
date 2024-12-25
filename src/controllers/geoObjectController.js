const logger = require('../utils/logger');
const GeoObjectHandler = require('../handlers/GeoObjectHandler');
let geoObjectHandler;

exports.initialize = (wsManager) => {
    geoObjectHandler = new GeoObjectHandler(wsManager);
};

exports.addGeoObject = async (req, res) => {
    try {
        const { playerId, location } = req.body;
        
        if (!playerId || !location) {
            logger.error('Missing required fields: playerId and location');
            return res.status(400).json({ error: 'Missing required fields: playerId and location' });
        }
        
        if (!location.latitude || !location.longitude) {
            logger.error('Invalid location: must include latitude and longitude');
            return res.status(400).json({ error: 'Invalid location: must include latitude and longitude' });
        }

        await geoObjectHandler.startGeoObjectGeneration({ playerId, location });
        res.status(201).json({ message: 'Geo object generation started' });
        
    } catch (error) {
        logger.error('Error adding geo object:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};