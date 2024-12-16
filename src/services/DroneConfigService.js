const logger = require('../utils/logger');
const DroneConfig = require('../models/DroneConfig');

class DroneConfigService {
  constructor() {
    this.DEFAULT_CONFIG = {
      xMin: -5,
      xMax: 5,
      yMin: 1.5,
      yMax: 3,
      zMin: -8,
      zMax: -3
    };
  }

  async getConfig() {
    try {
      let config = await DroneConfig.findOne();
      if (!config) {
        config = await DroneConfig.create(this.DEFAULT_CONFIG);
      }
      return config;
    } catch (error) {
      logger.error('Error fetching drone config:', error);
      throw error;
    }
  }

  async updateConfig(configData) {
    try {
      const config = await DroneConfig.findOneAndUpdate(
        {},
        { 
          ...configData,
          updatedAt: new Date()
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true 
        }
      );
      return config;
    } catch (error) {
      logger.error('Error updating drone config:', error);
      throw error;
    }
  }

  async resetConfig() {
    try {
      const config = await DroneConfig.findOneAndUpdate(
        {},
        { 
          ...this.DEFAULT_CONFIG,
          updatedAt: new Date()
        },
        { 
          new: true, 
          upsert: true 
        }
      );
      return config;
    } catch (error) {
      logger.error('Error resetting drone config:', error);
      throw error;
    }
  }
}

module.exports = new DroneConfigService();