// hallOfFameController.js
const HallOfFameService = require('../services/HallOfFameService');
const logger = require('../utils/logger');

class HallOfFameController {
    constructor() {
        this.hallOfFameService = new HallOfFameService();
        this.getByKills = this.getByKills.bind(this);
        this.getByHits = this.getByHits.bind(this);
    }

    async getByKills(req, res) {
        try {
            const players = await this.hallOfFameService.getTopPlayersByKills();
            res.json(players);
        } catch (error) {
            logger.error('Error fetching hall of fame by kills:', error);
            res.status(500).json({ error: 'Failed to fetch hall of fame' });
        }
    }

    async getByHits(req, res) {
        try {
            const players = await this.hallOfFameService.getTopPlayersByHits();
            res.json(players);
        } catch (error) {
            logger.error('Error fetching hall of fame by hits:', error);
            res.status(500).json({ error: 'Failed to fetch hall of fame' });
        }
    }
}

module.exports = new HallOfFameController();