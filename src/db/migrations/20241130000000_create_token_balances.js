module.exports = {
    async up(db) {
      await db.createCollection('tokenbalances');
      await db.collection('tokenbalances').createIndex({ playerId: 1 }, { unique: true });
    },
  
    async down(db) {
      await db.collection('tokenbalances').drop();
    }
  };
  