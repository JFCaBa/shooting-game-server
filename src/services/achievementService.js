const Achievement = require('../models/Achievement');
const logger = require('../utils/logger');

class AchievementService {
    async trackAchievement(playerId, type, value) {
        try {
            const milestones = this.getMilestones(type);
            const nextMilestone = milestones.find(m => value <= m);
            
            if (!nextMilestone) return null;
            
            const achievement = await Achievement.findOne({
                playerId,
                type,
                milestone: nextMilestone
            });
            
            if (!achievement && value >= nextMilestone) {
                return await this.createAchievement(playerId, type, nextMilestone);
            }
            
            return null;
        } catch (error) {
            logger.error('Error tracking achievement:', error);
            throw error;
        }
    }

    async createAchievement(playerId, type, milestone) {
        try {
            const achievement = new Achievement({
                playerId,
                type,
                milestone,
                unlockedAt: new Date()
            });
            
            await achievement.save();
            return achievement;
        } catch (error) {
            logger.error('Error creating achievement:', error);
            throw error;
        }
    }

    getMilestones(type) {
        const milestones = {
            kills: [10, 50, 100, 500, 1000],
            hits: [100, 500, 1000, 5000],
            survivalTime: [3600, 18000, 86400], // In seconds
            accuracy: [50, 75, 90, 95] // Percentage
        };
        
        return milestones[type] || [];
    }

    async getPlayerAchievements(playerId) {
        try {
            return await Achievement.find({ playerId });
        } catch (error) {
            logger.error('Error fetching player achievements:', error);
            throw error;
        }
    }
}

module.exports = new AchievementService();