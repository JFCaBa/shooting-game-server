const gameConfig = {
  TOKENS: {
    HIT: 100,
    KILL: 1000,
    DRONE: 2,
    AD: 10,
    WEAPON: 50,
    TARGET: 100,
    POWERUP: 50,
  },
  STATS: {
    LIVES: 10,
    AMMUNITION: 30,
  },
  MAX_DRONES_PER_PLAYER: 3,
  ACHIEVEMENT_MILESTONES: {
    kills: [10, 50, 100, 500, 1000],
    hits: [100, 500, 1000, 5000],
    survivalTime: [3600, 18000, 86400], // In seconds
    accuracy: [50, 75, 90, 95], // Percentage
  },
  ACHIEVEMENT_REWARDS: {
    kills: {
      10: 500, // 5 tokens for 10 kills
      50: 1500, // 15 tokens for 50 kills
      100: 2500, // 25 tokens for 100 kills
      500: 5000, // 50 tokens for 500 kills
      1000: 10000, // 100 tokens for 1000 kills
    },
    hits: {
      100: 100, // 10 tokens for 100 hits
      500: 250, // 25 tokens for 500 hits
      1000: 500, // 50 tokens for 1000 hits
      5000: 1000, // 100 tokens for 5000 hits
    },
    survivalTime: {
      3600: 100, // 10 tokens for 1 hour
      18000: 250, // 25 tokens for 5 hours
      86400: 1000, // 100 tokens for 24 hours
    },
    accuracy: {
      50: 10, // 10 tokens for 50% accuracy
      75: 25, // 25 tokens for 75% accuracy
      90: 50, // 50 tokens for 90% accuracy
      95: 100, // 100 tokens for 95% accuracy
    },
  },
  GEO_OBJECT: {
    MIN_RADIUS: 0.004,
    MAX_RADIUS: -0.004,
    TYPES: ["weapon", "target", "powerup"],
  },
};

module.exports = gameConfig;
