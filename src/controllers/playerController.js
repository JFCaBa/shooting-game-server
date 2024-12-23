const PlayerService = require('../services/PlayerService');
const RewardHistory = require('../models/RewardHistory');
const logger = require('../utils/logger');
const Player = require('../models/Player');
const gameConfig = require('../config/gameConfig');

const playerService = new PlayerService();  // Instantiate the class

exports.getTokenBalance = async (req, res) => {
  try {
    const { playerId } = req.params;
    
    // Call the method
    const { mintedBalance, totalBalance } = await playerService.getTokenBalance(playerId);
    
    // Respond with both balances
    res.json({ mintedBalance, totalBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.transferTokens = async (req, res) => {
  try {
    const { fromPlayerId, toWalletAddress, amount } = req.body;
    await playerService.transferTokens(fromPlayerId, toWalletAddress, amount);
    res.json({ message: 'Tokens transferred successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.adReward = async (req, res) => {
  logger.debug("adReward endpoint hit with body:", req.body); 
  try {
    const { walletAddress } = req.body;
    await playerService.adReward(walletAddress);

    await RewardHistory.create({
      playerId: walletAddress,
      rewardType: 'AD_WATCH',
      amount: gameConfig.TOKENS.AD
  });

    res.json({ message: 'Reward tokens added successfully', amount: 10 });
  } catch (error) {
    res.status(500).json({ error: error.message });
    logger.error(error)
  }
};

exports.getPlayerStats = async (req, res) => {
  try {
      const { playerId } = req.params;
      const player = await Player.findOne({ playerId });
      
      if (!player) {
          return res.status(404).json({ error: 'Player not found' });
      }

      res.json({
          stats: player.stats,
          lastActive: player.lastActive
      });
  } catch (error) {
      logger.error('Error fetching player stats:', error);
      res.status(500).json({ error: error.message });
  }
};