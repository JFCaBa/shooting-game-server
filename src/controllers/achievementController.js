const AchievementService = require('../services/AchievementService');
const RewardService = require('../services/RewardService');
const logger = require('../utils/logger');

exports.getAchievements = async (req, res) => {
    try {
        let { playerId } = req.params;
        if (!playerId) {
            playerId = req.user.playerId
        }
        const achievements = await RewardService.getPlayerAchievements(playerId);
        res.json(achievements);
    } catch (error) {
        logger.error('Error in getAchievements:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getConfig = async (req, res) => {
    try {
        const config = await RewardService.getAchievementConfig();
        res.json(config);
    } catch (error) {
        logger.error('Error in getConfig:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.trackProgress = async (req, res) => {
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
};