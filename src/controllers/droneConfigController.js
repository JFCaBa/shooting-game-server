const DroneConfigService = require('../services/DroneConfigService');
const logger = require('../utils/logger');

exports.getConfig = async (req, res) => {
  try {
    const config = await DroneConfigService.getConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error in getConfig:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const configData = {
      xMin: parseFloat(req.body.xMin),
      xMax: parseFloat(req.body.xMax),
      yMin: parseFloat(req.body.yMin),
      yMax: parseFloat(req.body.yMax),
      zMin: parseFloat(req.body.zMin),
      zMax: parseFloat(req.body.zMax)
    };

    // Validate ranges
    if (configData.xMin >= configData.xMax) {
      return res.status(400).json({ error: 'xMin must be less than xMax' });
    }
    if (configData.yMin >= configData.yMax) {
      return res.status(400).json({ error: 'yMin must be less than yMax' });
    }
    if (configData.zMin >= configData.zMax) {
      return res.status(400).json({ error: 'zMin must be less than zMax' });
    }

    const config = await DroneConfigService.updateConfig(configData);
    res.json(config);
  } catch (error) {
    logger.error('Error in updateConfig:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.resetConfig = async (req, res) => {
  try {
    const config = await DroneConfigService.resetConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error in resetConfig:', error);
    res.status(500).json({ error: error.message });
  }
};