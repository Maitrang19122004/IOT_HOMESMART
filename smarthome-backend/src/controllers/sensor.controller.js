const sensorService = require('../services/sensor.service');

const getSensorHistory = async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const results = await sensorService.getSensorHistory(limit);
        res.json(results);
    } catch (err) {
        console.error('Sensor history error:', err.message);
        res.status(500).json({ error: 'Failed to get sensor history' });
    }
};

module.exports = {
    getSensorHistory
};
