// src/services/FirebaseService.js
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
            const stringData = Object.keys(data).reduce((acc, key) => {
                acc[key] = String(data[key]);
                return acc;
            }, {});
    
            for (const token of tokens) {
                try {
                    const message = {
                        token,
                        data: stringData,
                        apns: {
                            payload: {
                                aps: {
                                    'content-available': 1
                                }
                            }
                        }
                    };
    
                    if (!silent) {
                        message.notification = { title, body };
                        message.apns.payload.aps.alert = { title, body };
                    }
    
                    await admin.messaging().send(message);
                    successCount++;
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
        const message = {
            data: {
                type: 'playerJoined',
                player: JSON.stringify({
                    id: playerData.playerId || '',
                    location: {
                        latitude: playerData.location?.latitude || 0,
                        longitude: playerData.location?.longitude || 0
                    }
                })
            },
            apns: {
                headers: {
                    'apns-push-type': 'background',
                    'apns-priority': '5',
                    'apns-topic': 'armentechnology.ShootingApp'
                },
                payload: {
                    aps: {
                        'content-available': 1
                    }
                }
            }
        };
    
        return this.sendNotification(tokens, null, null, message.data, true);
    }
}

module.exports = new FirebaseService();