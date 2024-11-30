module.exports = {
    async up(db) {
      await db.collection('players').updateMany(
        { walletAddress: { $exists: false } },
        { $set: { walletAddress: null } }
      );
    },
  
    async down(db) {
      await db.collection('players').updateMany(
        { walletAddress: null },
        { $unset: { walletAddress: "" } }
      );
    }
  };