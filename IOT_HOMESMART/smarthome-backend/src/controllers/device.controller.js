const deviceService = require('../services/device.service');

const getDeviceHistory = async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const results = await deviceService.getDeviceHistory(limit);
        res.json(results);
    } catch (err) {
        console.error('❌ Lỗi lấy lịch sử thiết bị:', err.message);
        res.status(500).json({ error: 'Lỗi lấy lịch sử thiết bị' });
    }
};

const getLatestStatus = async (req, res) => {
    try {
        const statusMap = await deviceService.getLatestDeviceStatus();
        res.json(statusMap);
    } catch (err) {
        console.error('❌ Lỗi lấy trạng thái mới nhất:', err.message);
        res.status(500).json({ error: 'Lỗi lấy trạng thái mới nhất' });
    }
};

module.exports = {
    getDeviceHistory,
    getLatestStatus
};
