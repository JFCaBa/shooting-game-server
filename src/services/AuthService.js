require('dotenv').config();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

class AuthService {
    async login(username, password) {
        try {
            // Find admin user
            const admin = await Admin.findOne({ username });
            if (!admin) {
                throw new Error('Invalid credentials');
            }

            // Check password
            const isValid = await admin.comparePassword(password);
            if (!isValid) {
                throw new Error('Invalid credentials');
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: admin._id, 
                    username: admin.username,
                    role: admin.role 
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                token,
                user: {
                    username: admin.username,
                    email: admin.email,
                    role: admin.role
                }
            };
        } catch (error) {
            logger.error('Error in login:', error);
            throw error;
        }
    }

    async register(adminData) {
        try {
            const admin = new Admin(adminData);
            await admin.save();
            
            const token = jwt.sign(
                { 
                    id: admin._id, 
                    username: admin.username,
                    role: admin.role 
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                token,
                user: {
                    username: admin.username,
                    email: admin.email,
                    role: admin.role
                }
            };
        } catch (error) {
            logger.error('Error in register:', error);
            throw error;
        }
    }

    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const admin = await Admin.findById(decoded.id);
            if (!admin) {
                throw new Error('User not found');
            }
            return decoded;
        } catch (error) {
            logger.error('Error in verifyToken:', error);
            throw error;
        }
    }
}

module.exports = new AuthService();