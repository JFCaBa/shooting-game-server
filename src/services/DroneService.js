
const Drone = require('../models/Drone');
const logger = require('../utils/logger');
const crypto = require('crypto');

class DroneService {
    constructor() {
        this.activeDrones = new Map(); // Store active drones in memory for quick access
        this.playerDrones = new Map();
    }

    generatePosition() {
        const position = {
            x: this.randomFloat(-3, 3),
            y: this.randomFloat(0, 3),
            z: this.randomFloat(-2, -1)
        };

        if (this.isTooCloseToOtherDrones(position)) {
            return this.generatePosition();
        }

        return position;
    }

    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    isTooCloseToOtherDrones(position, minDistance = 0.5) {
        for (const drone of this.activeDrones.values()) {
            const distance = Math.sqrt(
                Math.pow(position.x - drone.position.x, 2) +
                Math.pow(position.y - drone.position.y, 2) +
                Math.pow(position.z - drone.position.z, 2)
            );
            if (distance < minDistance) return true;
        }
        return false;
    }

    async generateDrone() {
        try {
            const droneId = crypto.randomBytes(16).toString('hex');
            const position = this.generatePosition();
            
            const drone = new Drone({
                droneId,
                position,
                isActive: true
            });
            
            await drone.save();
            this.activeDrones.set(droneId, drone);
            
            return drone;
        } catch (error) {
            logger.error('Error generating drone:', error);
            throw error;
        }
    }

    getDroneCount(playerId) {
        return (this.playerDrones.get(playerId) || []).length;
    }

    removePlayerDrones(playerId) {
        const drones = this.playerDrones.get(playerId) || [];
        drones.forEach(droneId => {
            this.activeDrones.delete(droneId);
            Drone.findOneAndUpdate(
                { droneId },
                { isActive: false }
            ).catch(error => logger.error('Error deactivating drone:', error));
        });
        this.playerDrones.delete(playerId);
    }

    async validateDroneShot(droneId, shotPosition) {
        try {
            const drone = this.activeDrones.get(droneId);
            if (!drone?.isActive) return false;
            drone.isActive = false
            
            return true
        } catch (error) {
            logger.error('Error validating drone shot:', error);
            return false;
        }
    }

    async deactivateDrone(droneId) {
        try {
            await Drone.findOneAndUpdate(
                { droneId },
                { isActive: false }
            );
            const drone = this.activeDrones.get(droneId);
            if (drone) {
                drone.isActive = false;
            }
        } catch (error) {
            logger.error('Error deactivating drone:', error);
            throw error;
        }
    }
}

module.exports = new DroneService();
    