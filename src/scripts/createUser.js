require('dotenv').config();
const mongoose = require('mongoose');
const UserService = require('../services/UserService');

async function createUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const userService = new UserService();
        await userService.createPlayer('0x10C321f752eCcCf450D8A69cA8bE7C1BC91a1FFF');
        console.log('User created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createUser();