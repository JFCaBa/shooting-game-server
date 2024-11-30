require('dotenv').config();
const Web3 = require('web3');
const ShootingGameTokenABI = require('../abis/ShootingGameToken.json');
const web3 = new Web3(process.env.WEB3_PROVIDER_URL);
const tokenAddress = process.env.TOKEN_ADDRESS;
const logger = require('../utils/logger');

class TokenService {
  constructor() {
    this.HIT_REWARD = web3.utils.toWei('1', 'ether'); // 1 token
    this.KILL_REWARD = web3.utils.toWei('5', 'ether'); // 5 tokens
    this.tokenContract = new web3.eth.Contract(ShootingGameTokenABI, tokenAddress);
  }

  async addTokensForHit(playerId) {
    try {
      logger.info(`Adding ${this.HIT_REWARD} tokens for hit to player ${playerId}`);
      await this.tokenContract.methods.transfer(playerId, this.HIT_REWARD).send({
        from: process.env.OWNER_ADDRESS,
        gas: 100000
      });
    } catch (error) {
      logger.error('Error adding tokens for hit:', error);
      throw error;
    }
  }

  async addTokensForKill(playerId) {
    try {
      logger.info(`Adding ${this.KILL_REWARD} tokens for kill to player ${playerId}`);
      await this.tokenContract.methods.transfer(playerId, this.KILL_REWARD).send({
        from: process.env.OWNER_ADDRESS,
        gas: 100000
      });
    } catch (error) {
      logger.error('Error adding tokens for kill:', error);
      throw error;
    }
  }

  async getBalance(address) {
    const balance = await this.tokenContract.methods.balanceOf(address).call();
    return web3.utils.fromWei(balance, 'ether');
  }
}

module.exports = TokenService;