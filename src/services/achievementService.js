const Achievement = require('../models/Achievement');
const logger = require('../utils/logger');
const gameConfig = require('../config/gameConfig');

class AchievementService {
    async trackAchievement(playerId, type, value) {
        try {
            logger.info(`Tracking achievement for player ${playerId}: ${type} = ${value}`);
            
            const milestones = gameConfig.ACHIEVEMENT_MILESTONES[type];
            if (!milestones) {
                logger.error(`Invalid achievement type: ${type}`);
                return null;
            }

            // Find the next milestone that hasn't been achieved yet
            const nextMilestone = milestones.find(m => value >= m);
            if (!nextMilestone) {
                logger.info(`No milestone reached for ${type}: ${value}`);
                return null;
            }

            // Check if this milestone was already achieved
            const existingAchievement = await Achievement.findOne({
                playerId,
                type,
                milestone: nextMilestone
            });

            if (existingAchievement) {
                logger.info(`Achievement already exists for ${playerId}: ${type} ${nextMilestone}`);
                return null;
            }

            // Create new achievement
            const achievement = new Achievement({
                playerId,
                type,
                milestone: nextMilestone,
                unlockedAt: new Date()
            });

            await achievement.save();
            logger.info(`New achievement created for ${playerId}: ${type} ${nextMilestone}`);
            
            return achievement;
        } catch (error) {
            logger.error('Error tracking achievement:', error);
            throw error;
        }
    }

    async getPlayerAchievements(playerId) {
        try {
            return await Achievement.find({ playerId }).sort({ unlockedAt: -1 });
        } catch (error) {
            logger.error('Error fetching player achievements:', error);
            throw error;
        }
    }
}

module.exports = new AchievementService();