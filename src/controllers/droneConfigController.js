const DroneConfig = require('../models/DroneConfig');

exports.getConfig = async (req, res) => {
    try {
        let config = await DroneConfig.findOne();
        if (!config) {
            config = await DroneConfig.create({
                xMin: -5,
                xMax: 5,
                yMin: 1.5,
                yMax: 3,
                zMin: -8,
                zMax: -3
            });
        }
        res.json(config);
    } catch (error) {
        console.error('Error getting drone config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const config = await DroneConfig.findOneAndUpdate(
            {},
            req.body,
            { new: true, upsert: true }
        );
        res.json(config);
    } catch (error) {
        console.error('Error updating drone config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};