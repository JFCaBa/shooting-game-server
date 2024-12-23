const logger = require('../utils/logger');
const geoObjectService = require('../services/GeoObjectService');

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
  
      const geoObject = await geoObjectService.generateGeoObject(playerId, location);
      if (!geoObject) {
        return res.status(409).json({ error: 'Player already has an active geo object' });
      } else {
        logger.info(`Geo object created for player ${playerId}`);
      }
  
      res.status(201).json(geoObject);
    } catch (error) {
      logger.error('Error adding geo object:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
};
