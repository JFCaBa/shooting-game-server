const PlayerService = require('../services/PlayerService');
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