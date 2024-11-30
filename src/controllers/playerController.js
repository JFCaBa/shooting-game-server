const PlayerService = require('../services/PlayerService');
const logger = require('../utils/logger');
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
    const { playerId } = req.body;
    await playerService.adReward(playerId);
    logger.debug(`Reward tokens added succesfully to: ${playerId}`)
    res.json({ message: 'Reward tokens added successfully', ammount: 10 });
  } catch (error) {
    res.status(500).json({ error: error.message });
    logger.error(error)
  }
};