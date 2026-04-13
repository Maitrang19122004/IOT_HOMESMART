const sensorService = require('../services/sensor.service');
const deviceService = require('../services/device.service');

const getDashboardChart = async (req, res) => {
    try {
        const data = await sensorService.getDashboardData(24);
        res.json(data);
    } catch (err) {
        console.error('❌ Lỗi lấy dữ liệu dashboard:', err.message);
        res.status(500).json({ error: 'Lỗi lấy dữ liệu dashboard' });
    }
};

const getDashboardStatus = async (req, res) => {
    try {
        const deviceStatus = await deviceService.getLatestDeviceStatus();
        res.json(deviceStatus);
    } catch (err) {
        console.error('❌ Lỗi lấy trạng thái thiết bị:', err.message);
        res.status(500).json({ error: 'Lỗi lấy trạng thái thiết bị' });
    }
};

module.exports = {
    getDashboardChart,
    getDashboardStatus
};
