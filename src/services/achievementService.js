const Achievement = require('../models/Achievement');
const logger = require('../utils/logger');
const gameConfig = require('../config/gameConfig');
const Player = require('../models/Player');

class AchievementService {
    async trackAchievement(playerId, type, value) {
        try {
            // logger.info(`Tracking achievement for player ${playerId}: ${type} = ${value}`);
            
            const milestones = gameConfig.ACHIEVEMENT_MILESTONES[type];
            if (!milestones) {
                logger.error(`Invalid achievement type: ${type}`);
                return null;
            }

            // Find all milestones that should be awarded
            const eligibleMilestones = milestones.filter(m => value >= m);
            let latestAchievement = null;

            for (const milestone of eligibleMilestones) {
                // Check if already achieved
                const existingAchievement = await Achievement.findOne({
                    playerId,
                    type,
                    milestone
                });

                if (!existingAchievement) {
                    // Create and save new achievement
                    const achievement = new Achievement({
                        playerId,
                        type,
                        milestone,
                        unlockedAt: new Date()
                    });
                    await achievement.save();

                    // Add reward tokens if configured
                    const reward = gameConfig.ACHIEVEMENT_REWARDS[type]?.[milestone];
                    if (reward) {
                        await Player.findOneAndUpdate(
                            { playerId },
                            { $inc: { pendingBalance: reward } }
                        );
                        logger.info(`Added ${reward} tokens for achievement ${type} ${milestone}`);
                    }

                    latestAchievement = achievement;
                    logger.info(`New achievement created for ${playerId}: ${type} ${milestone}`);
                }
            }

            return latestAchievement;
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