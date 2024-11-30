module.exports = {
    async up(db, client) {
      const players = db.collection('players');
      await players.updateMany(
        {},
        { $set: { walletAddress: null } },
        { upsert: false, multi: true }
      );
    },
  
    async down(db, client) {
      const players = db.collection('players');
      await players.updateMany(
        { walletAddress: null },
        { $unset: { walletAddress: "" } }
      );
    }
  };