require('dotenv').config();
const admin = require('firebase-admin');
const logger = require('../utils/logger');
const path = require('path');

class FirebaseService {
    constructor() {
        if (!admin.apps.length) {
            const serviceAccount = require(path.join(__dirname, '../config/serviceAccountKey.json'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        }
    }

    async sendNotification(tokens, title, body, data = {}, silent = false) {
        try {
            let successCount = 0;
    
            // Ensure all data values are strings
            const stringData = Object.keys(data).reduce((acc, key) => {
                acc[key] = String(data[key]);
                return acc;
            }, {});
    
            for (const token of tokens) {
                try {
                    const message = silent
                        ? {
                              // Silent notification (no title or body, just data)
                              data: stringData,
                              apns: {
                                  payload: {
                                      aps: {
                                          'content-available': 1, // Enables background mode
                                      },
                                  },
                              },
                              android: {
                                  priority: 'high',
                                  data: stringData,
                              },
                              token: token,
                          }
                        : {
                              // Regular notification
                              notification: { title, body },
                              data: stringData,
                              token: token,
                          };
    
                    await admin.messaging().send(message);
                    successCount++;
                    // logger.info(`Successfully sent notification to token ${token}`);
                } catch (error) {
                    logger.error(`Error sending notification to token ${token}:`, error);
                }
            }
    
            return { successCount, totalTokens: tokens.length };
        } catch (error) {
            logger.error('Error sending Firebase notification:', error);
            throw error;
        }
    }

    async sendPlayerJoinedNotification(tokens, playerData) {
        return this.sendNotification(
        tokens,
        'New Player Nearby!',
        'A new player has joined the game.',
        {
            type: 'playerJoined',
            playerId: String(playerData.playerId || ''),
            latitude: String(playerData.location?.latitude || '0'),
            longitude: String(playerData.location?.longitude || '0'),
        },
        true
        );
    }
}

module.exports = new FirebaseService();