const Drone = require('../models/Drone');
const logger = require('../utils/logger');
const crypto = require('crypto');
const gameConfig = require('../config/gameConfig');

class DroneService {
    constructor() {
        this.activeDrones = new Map(); // Store active drones in memory for quick access
    }

    generatePosition(playerId, maxRetries = 10) {
        let retries = 0;
        while (retries < maxRetries) {
            const position = {
                x: this.randomFloat(-5, 5),    // Wider horizontal spread
                y: this.randomFloat(1.5, 3),   // Above player head height but still visible
                z: this.randomFloat(-8, -3)    // In front of player, varying distances
            };

            if (!this.isTooCloseToPlayerDrones(playerId, position)) {
                return position;
            }

            retries++;
        }

        throw new Error("Failed to generate a valid position after maximum retries");
    }

    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    isTooCloseToPlayerDrones(playerId, position, minDistance = 0.5) {
        // Filter drones to only include those belonging to the player
        const playerDrones = Array.from(this.activeDrones.values()).filter(
            (drone) => drone.playerId === playerId
        );

        for (const drone of playerDrones) {
            const distance = Math.sqrt(
                Math.pow(position.x - drone.position.x, 2) +
                Math.pow(position.y - drone.position.y, 2) +
                Math.pow(position.z - drone.position.z, 2)
            );
            if (distance < minDistance) return true;
        }
        return false;
    }

    async generateDrone(playerId) {
        const droneCount = this.getDroneCount(playerId);

        // Enforce maximum drones per player
        if (droneCount >= gameConfig.MAX_DRONES_PER_PLAYER) {
            return null; // Prevent generating extra drones
        }

        try {
            const droneId = crypto.randomBytes(16).toString('hex');
            const position = this.generatePosition(playerId);

            const drone = new Drone({
                droneId,
                playerId,
                position,
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
        const playerDrones = Array.from(this.activeDrones.values()).filter(
            (drone) => drone.playerId === playerId
        );        
        return playerDrones.length;
    }

    async removePlayerDrones(playerId) {
        try {
            // Find all drones belonging to the player
            const dronesToRemove = Array.from(this.activeDrones.values()).filter(
                (drone) => drone.playerId === playerId
            );

            for (const drone of dronesToRemove) {
                this.activeDrones.delete(drone.droneId); // Remove from in-memory store
                await Drone.findOneAndDelete({ droneId: drone.droneId }); // Remove from database
            }

            logger.info(`Removed all drones for player ${playerId}`);
        } catch (error) {
            logger.error('Error removing player drones:', error);
        }
    }

    async validateDroneShot(data) {
        // Extract from nested structure
        const playerId = data.playerId;
        const droneId = data.data?.drone?.droneId;
    
        if (!droneId || !playerId) {
            logger.warn(`Missing droneId or playerId in request`);
            return false;
        }
    
        try {
            const drone = Array.from(this.activeDrones.values())
                .find(drone => drone.droneId === droneId);
    
            if (!drone) {
                logger.warn(`Drone ${droneId} not found or already removed for player ${playerId}.`);
                return false;
            }
    
            // Ensure the drone belongs to the correct player
            if (drone.playerId !== playerId) {
                logger.warn(`Player ${playerId} tried to shoot a drone owned by another player (${drone.playerId}).`);
                return false;
            }
    
            // Remove from memory and database
            this.activeDrones.delete(droneId);
            await Drone.findOneAndDelete({ droneId });
            
            logger.info(`Drone ${droneId} successfully shot and removed by player ${playerId}.`);
            return true;
        } catch (error) {
            logger.error(`Error validating drone shot for player ${playerId}:`, error);
            return false;
        }
    }
}

module.exports = new DroneService();