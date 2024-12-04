const RewardService = require('../services/RewardService');
const logger = require('../utils/logger');

exports.addReward = async (req, res) => {
    try {
        const { playerId } = req.params;
        const { rewardType } = req.body;

        if (!playerId || !rewardType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await RewardService.addReward(playerId, rewardType);
        res.json(result);
    } catch (error) {
        logger.error('Error in addReward:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getPlayerRewards = async (req, res) => {
    try {
        const { playerId } = req.params;
        const rewards = await RewardService.getPlayerRewards(playerId);
        res.json(rewards);
    } catch (error) {
        logger.error('Error in getPlayerRewards:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getRewardConfig = async (req, res) => {
    try {
        const config = await RewardService.getRewardConfig();
        res.json(config);
    } catch (error) {
        logger.error('Error in getRewardConfig:', error);
        res.status(500).json({ error: error.message });
    }
};