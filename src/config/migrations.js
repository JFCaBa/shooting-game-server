require('dotenv').config();
const mongoose = require('mongoose');

module.exports = {
    mongodb: {
      url: process.env.MONGO_URI || 'mongodb://localhost:27017/shootingapp'
    }
  };