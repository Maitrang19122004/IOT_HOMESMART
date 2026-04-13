const db = require('../config/database');

const deviceNameMap = {
    'DEN 1': 'Air Conditioner',
    'DEN1': 'Air Conditioner',
    'DEN 2': 'Dehumidifier',
    'DEN2': 'Dehumidifier',
    'DEN 3': 'Smart Light',
    'DEN3': 'Smart Light',
    'TAT CA': 'All Devices'
};

const getDeviceId = async (name, mqttName = null) => {
    const [rows] = await db.promise().query('SELECT id FROM device WHERE name = ?', [name]);
    if (rows.length) return rows[0].id;
    const [result] = await db.promise().query('INSERT INTO device (name, mqtt_name) VALUES (?, ?)', [name, mqttName]);
    return result.insertId;
};

const processDeviceStatus = async (payload) => {
    try {
        const normalized = payload.toUpperCase();
        let deviceName = 'System';

        for (const [key, value] of Object.entries(deviceNameMap)) {
            if (normalized.includes(key.toUpperCase())) {
                deviceName = value;
                break;
            }
        }

        let actionStr = 'OFF';
        if (normalized.includes('AUTO')) {
            actionStr = 'AUTO';
        } else if (normalized.includes('BAT') || normalized.includes('ON')) {
            actionStr = 'ON';
        }

        const deviceId = await getDeviceId(deviceName, deviceName);
        const query = 'INSERT INTO device_action (device_id, action, status) VALUES (?, ?, ?)';
        await db.promise().query(query, [deviceId, actionStr, 'SUCCESS']);
        console.log(`🔌 Đã lưu Log: ${deviceName} - ${actionStr}`);
    } catch (err) {
        console.error('❌ Lỗi xử lý trạng thái thiết bị:', err.message);
    }
};

const getDeviceHistory = (limit = 50) => {
    return db.promise().query(
        `SELECT da.id, d.name as device, da.action, da.status,
                DATE_FORMAT(da.created_at, "%Y/%m/%d %h:%i:%s %p") as time
         FROM device_action da
         JOIN device d ON da.device_id = d.id
         ORDER BY da.id DESC
         LIMIT ?`,
        [limit]
    ).then(([rows]) => rows);
};

const getLatestDeviceStatus = () => {
    return db.promise().query(
        `SELECT d.name as device, da.action
         FROM device_action da
         JOIN device d ON da.device_id = d.id
         WHERE da.id IN (SELECT MAX(id) FROM device_action GROUP BY device_id)`
    ).then(([rows]) => {
        const statusMap = {};
        rows.forEach(row => {
            statusMap[row.device] = row.action;
        });
        return statusMap;
    });
};

module.exports = {
    processDeviceStatus,
    getDeviceHistory,
    getLatestDeviceStatus
};
