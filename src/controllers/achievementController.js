const AchievementService = require('../services/AchievementService');
const logger = require('../utils/logger');

class AchievementController {
    async getAchievements(req, res) {
        try {
            const { playerId } = req.params;
            const achievements = await AchievementService.getPlayerAchievements(playerId);
            res.json(achievements);
        } catch (error) {
            logger.error('Error in getAchievements:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async trackProgress(req, res) {
        try {
            const { playerId, type, value } = req.body;
            
            if (!playerId || !type || value === undefined) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const achievement = await AchievementService.trackAchievement(playerId, type, value);
            
            if (achievement) {
                res.status(201).json(achievement);
            } else {
                res.status(200).json({ message: 'No new achievement unlocked' });
            }
        } catch (error) {
            logger.error('Error in trackProgress:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new AchievementController();