// src/config/migrations.js
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  mongodb: {
    url: 'mongodb://shootingapp:Abuelo,2001@localhost:27017/shootingapp',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      authSource: 'admin'
    }
  },
  migrationsDir: "src/migrations",
  changelogCollectionName: "changelog"
};