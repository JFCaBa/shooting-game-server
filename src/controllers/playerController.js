require("dotenv").config();
const jwt = require("jsonwebtoken");
const PlayerService = require("../services/PlayerService");
const RewardHistory = require("../models/RewardHistory");
const logger = require("../utils/logger");
const Player = require("../models/Player");
const gameConfig = require("../config/gameConfig");
const { hashPassword } = require("../utils/passwordHelper");

const playerService = new PlayerService();

exports.loginPlayer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await playerService.loginPlayer(email, password);
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, playerId } = req.body;
    const token = await playerService.forgotPassword(email, playerId);
    // Send a temporary password with the token
    const temporaryPassword = Math.random().toString(36).slice(-8);
    res.json({ token, temporaryPassword });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

exports.addWalletAddress = async (req, res) => {
  try {
    const { playerId, walletAddress } = req.params;

    // Call the method
    const { player } = await playerService.addWalletAddress(
      playerId,
      walletAddress
    );

    res.json({ player });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const player = req.user;
    if (!player) {
      return res.status(401).json({ error: "Player not found" });
    }
    res.json({ player });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// MARK: - getPlayer

exports.getPlayerDetails = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Call the method
    const details = await playerService.getPlayerDetails(playerId);
    if (!details) {
      logger.error(`Error getting Player Details for: ${playerId}`);
      res.stats(404).json({ message: "Player not found" });
    }
    res.json({ details });
  } catch (error) {
    logger.error(`Error geting player details: ${error}`);
    res.status(500).json({ error: error.message });
  }
};

// MARK: - addPlayer

exports.addPlayerDetails = async (req, res) => {
  try {
    const { playerId, nickname, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (!playerId) {
      return res.status(400).json({ error: "PlayerId is required" });
    }

    const { salt, hash } = hashPassword(password);

    try {
      const player = await playerService.addPlayerDetails(
        playerId,
        nickname,
        email,
        hash,
        salt
      );
      const token = jwt.sign(
        { playerId: player.playerId, email: player.email },
        process.env.JWT_SECRET
      );
      res.json({ token });
    } catch (error) {
      if (error.message === "PLAYER_HAS_EMAIL") {
        return res.status(409).json({ error: "Player already registered" });
      }
      if (error.message === "EMAIL_EXISTS") {
        return res.status(409).json({ error: "Email already in use" });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error adding player details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updatePlayerDetails = async (req, res) => {
  try {
    const { playerId, nickname, email, password } = req.body;

    let hash, salt;

    if (password) {
      // Validate the password criteria
      const hasMinLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password); // Regex for uppercase
      const hasNumber = /\d/.test(password); // Regex for number

      if (!hasMinLength || !hasUppercase || !hasNumber) {
        return res.status(400).json({
          error:
            "Password must be at least 8 characters long, contain an uppercase letter, and include a number.",
        });
      }

      // Hash the password
      const hashed = hashPassword(password);
      hash = hashed.hash;
      salt = hashed.salt;
    }

    // Add or update player details
    const player = await playerService.updatePlayerDetails(
      playerId,
      nickname,
      email,
      hash,
      salt
    );

    // Generate JWT token
    const token = jwt.sign(
      { playerId: player.playerId, email: player.email }, // Payload
      process.env.JWT_SECRET // Secret key
    );

    // Send response with token
    res.json({ token });
  } catch (error) {
    console.error("Error updating player details:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getBalance = async (req, res) => {
  try {
    const player = req.user;
    if (!player) {
      throw new Error("Player not found");
    }

    // Call the method
    const { mintedBalance, totalBalance } = await playerService.getTokenBalance(
      player.playerId
    );

    // Respond with both balances
    res.json({ mintedBalance, totalBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTokenBalance = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Call the method
    const { mintedBalance, totalBalance } = await playerService.getTokenBalance(
      playerId
    );

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
    res.json({ message: "Tokens transferred successfully" });
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
      rewardType: "AD_WATCH",
      amount: gameConfig.TOKENS.AD,
    });

    res.json({ message: "Reward tokens added successfully", amount: 10 });
  } catch (error) {
    res.status(500).json({ error: error.message });
    logger.error(error);
  }
};

exports.getPlayerStats = async (req, res) => {
  try {
    const { playerId } = req.params;
    const player = await Player.findOne({ playerId });

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({
      stats: player.stats,
      lastActive: player.lastActive,
    });
  } catch (error) {
    logger.error("Error fetching player stats:", error);
    res.status(500).json({ error: error.message });
  }
};
