const logger = require('../utils/logger');
const droneService = require('../services/DroneService');
const geoObjectService = require('../services/GeoObjectService');

class CleanupJob {
    constructor() {
        this.cleanupInterval = null;
    }

    start() {
        // Run cleanup every minute
        this.cleanupInterval = setInterval(async () => {
            try {
                // Just clean memory caches since MongoDB TTL handles database cleanup
                await this.cleanupMemoryCaches();
            } catch (error) {
                logger.error('Error in cleanup job:', error);
            }
        }, 60000); // Check every minute
    }

    async cleanupMemoryCaches() {
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            // Clean drone service memory cache
            for (const [droneId, drone] of droneService.activeDrones.entries()) {
                if (drone.createdAt < fiveMinutesAgo) {
                    droneService.activeDrones.delete(droneId);
                }
            }

            // Clean geo object service memory cache
            for (const [objectId, geoObject] of geoObjectService.activeGeoObjects.entries()) {
                if (geoObject.metadata.spawnedAt < fiveMinutesAgo) {
                    geoObjectService.activeGeoObjects.delete(objectId);
                }
            }
        } catch (error) {
            logger.error('Error cleaning up memory caches:', error);
        }
    }

    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

module.exports = new CleanupJob();