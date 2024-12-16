// src/controllers/authController.js
const AuthService = require('../services/AuthService');
const logger = require('../utils/logger');

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await AuthService.login(username, password);
        res.json(result);
    } catch (error) {
        logger.error('Error in login controller:', error);
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

exports.register = async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const result = await AuthService.register({ username, password, email });
        res.status(201).json(result);
    } catch (error) {
        logger.error('Error in register controller:', error);
        if (error.code === 11000) { // MongoDB duplicate key error
            res.status(400).json({ message: 'Username or email already exists' });
        } else {
            res.status(400).json({ message: error.message });
        }
    }
};