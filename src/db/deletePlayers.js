require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');  // Adjust the path to your Player model

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to database');
    } catch (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
};

const deleteAllPlayers = async () => {
    try {
        await connectDB();

        // Delete all players from the Player collection
        const result = await Player.deleteMany({});
        console.log(`Deleted ${result.deletedCount} players from the database`);

        mongoose.connection.close(); // Close the DB connection after the operation
    } catch (err) {
        console.error('Error deleting players:', err);
        process.exit(1);
    }
};

deleteAllPlayers();