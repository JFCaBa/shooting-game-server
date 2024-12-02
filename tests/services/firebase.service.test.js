// tests/services/firebase.service.test.js
const FirebaseService = require('../../src/services/FirebaseService');
const admin = require('firebase-admin');
jest.mock('firebase-admin');
jest.mock('../../src/utils/logger');

describe('FirebaseService', () => {
    let firebaseService;

    beforeEach(() => {
        firebaseService = new FirebaseService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendNotification', () => {
        it('should send silent notification successfully', async () => {
            const mockSend = jest.fn().mockResolvedValue('success');
            admin.messaging = jest.fn().mockReturnValue({ send: mockSend });

            const result = await firebaseService.sendNotification(
                ['token1'],
                null,
                null,
                { type: 'test' },
                true
            );

            expect(result.successCount).toBe(1);
            expect(result.totalTokens).toBe(1);
            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
                apns: expect.objectContaining({
                    payload: expect.objectContaining({
                        aps: { 'content-available': 1 }
                    })
                })
            }));
        });
    });

    describe('sendPlayerJoinedNotification', () => {
        it('should send player joined notification', async () => {
            const mockSend = jest.fn().mockResolvedValue('success');
            admin.messaging = jest.fn().mockReturnValue({ send: mockSend });

            const playerData = {
                playerId: '123',
                location: { latitude: 10, longitude: 20 }
            };

            const result = await firebaseService.sendPlayerJoinedNotification(
                ['token1'],
                playerData
            );

            expect(result.successCount).toBe(1);
            expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    type: 'playerJoined',
                    playerId: '123'
                })
            }));
        });
    });
});