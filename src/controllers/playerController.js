require('dotenv').config();
const jwt = require('jsonwebtoken');
const PlayerService = require('../services/PlayerService');
const RewardHistory = require('../models/RewardHistory');
const logger = require('../utils/logger');
const Player = require('../models/Player');
const gameConfig = require('../config/gameConfig');
const { hashPassword } = require('../utils/passwordHelper');

const playerService = new PlayerService();  

exports.addWalletAddress = async (req, res) => {
  try {
    const { playerId, walletAddress } = req.params;
    
    // Call the method
    const { player } = await playerService.addWalletAddress(playerId, walletAddress);
    
    res.json({ player });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPlayerDetails = async (req, res) => {
  try {
    const { playerId } = req.params;
    
    // Call the method
    const details = await playerService.getPlayerDetails(playerId);
    
    res.json({ details });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addPlayerDetails = async (req, res) => {
  try {
      const { playerId, nickName, email, password } = req.body;

      if (!password) {
          throw new Error("Password is required");
      }

      // Hash the password
      const { salt, hash } = hashPassword(password);

      // Add player details
      const player = await playerService.addPlayerDetails(playerId, nickName, email, hash, salt);

      // Generate JWT token
      const token = jwt.sign(
          { playerId: player.playerId, email: player.email }, // Payload
          process.env.JWT_SECRET, // Secret key
      );

      // Send response with player details and token
      res.json({ token });
  } catch (error) {
      console.error('Error adding player details:', error);
      res.status(500).json({ error: error.message });
  }
};

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