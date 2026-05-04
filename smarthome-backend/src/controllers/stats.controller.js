const { getDeviceToggleStats } = require('../services/stats.service');

const getToggleStats = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const data = await getDeviceToggleStats(days);
        res.json(data);
    } catch (err) {
        console.error('❌ Lỗi lấy thống kê:', err.message);
        res.status(500).json({ error: 'Lỗi lấy thống kê thiết bị' });
    }
};

module.exports = { getToggleStats };
