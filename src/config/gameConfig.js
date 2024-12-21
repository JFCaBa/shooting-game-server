const gameConfig = {
    TOKENS: {
        HIT: 1,
        KILL: 5,
        DRONE: 2,
        AD: 10,
        WEAPON: 5,
        TARGET: 10,
        POWERUP: 1
    },
    MAX_DRONES_PER_PLAYER: 5,
    ACHIEVEMENT_MILESTONES: {
        kills: [10, 50, 100, 500, 1000],
        hits: [100, 500, 1000, 5000],
        survivalTime: [3600, 18000, 86400], // In seconds
        accuracy: [50, 75, 90, 95] // Percentage
    },
    ACHIEVEMENT_REWARDS: {
        kills: {
            10: 5,    // 5 tokens for 10 kills
            50: 15,   // 15 tokens for 50 kills
            100: 25,  // 25 tokens for 100 kills
            500: 50,  // 50 tokens for 500 kills
            1000: 100 // 100 tokens for 1000 kills
        },
        hits: {
            100: 10,   // 10 tokens for 100 hits
            500: 25,   // 25 tokens for 500 hits
            1000: 50,  // 50 tokens for 1000 hits
            5000: 100  // 100 tokens for 5000 hits
        },
        survivalTime: {
            3600: 10,   // 10 tokens for 1 hour
            18000: 25,  // 25 tokens for 5 hours
            86400: 100  // 100 tokens for 24 hours
        },
        accuracy: {
            50: 10,   // 10 tokens for 50% accuracy
            75: 25,   // 25 tokens for 75% accuracy
            90: 50,   // 50 tokens for 90% accuracy
            95: 100   // 100 tokens for 95% accuracy
        }
    },
    GEO_OBJECT: {
        MIN_RADIUS: 10,  // 10 meters minimum distance
        MAX_RADIUS: 100, // 100 meters maximum distance
        TYPES: ['weapon', 'target', 'powerup']
    }
};

module.exports = gameConfig;