const sensorService = require('../services/sensor.service');

const getSensorHistory = async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const results = await sensorService.getSensorHistory(limit);

        let formattedData = [];
        results.forEach(row => {
            formattedData.push({ time: row.time, sensor: 'Temperature', value: `${row.temperature}°C` });
            formattedData.push({ time: row.time, sensor: 'Humidity', value: `${row.humidity}%` });
            formattedData.push({ time: row.time, sensor: 'Light', value: `${row.light} Lux` });
        });

        res.json(formattedData);
    } catch (err) {
        console.error('❌ Lỗi lấy lịch sử cảm biến:', err.message);
        res.status(500).json({ error: 'Lỗi lấy lịch sử cảm biến' });
    }
};

module.exports = {
    getSensorHistory
};
