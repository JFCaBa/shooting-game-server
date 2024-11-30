// shootingapp-server/src/db/migrate.js
require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs').promises;
const path = require('path');

async function migrate() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is required');
  }

  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db();

  try {
    const migrations = await fs.readdir(path.join(__dirname, 'migrations'));
    
    for (const file of migrations.sort()) {
      const migration = require(path.join(__dirname, 'migrations', file));
      await migration.up(db);
      console.log(`Executed migration: ${file}`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  migrate().catch(console.error);
} else {
  module.exports = migrate;
}