const mongoose = require('mongoose');
const Player = require('../models/Player');  // Path to your Player model
const logger = require('../utils/logger');  // Assuming a logger utility exists

async function getUserList() {
  try {
    // Retrieve a list of player IDs from the database
    const users = await Player.find({}, 'playerId');  // Only fetch the playerId field

    logger.info('User List:', users);
    return users;
  } catch (error) {
    logger.error('Error fetching user list:', error);
  }
}

getUserList();