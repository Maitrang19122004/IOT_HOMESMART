const db = require('../config/database');

const DEVICES = ['Air Conditioner', 'Dehumidifier', 'Smart Light', 'Smart TV', 'Water Pump'];

const getDeviceToggleStats = async (days = 7) => {
    const [rows] = await db.promise().query(
        `SELECT
            DATE_FORMAT(da.created_at, '%Y/%m/%d') as date,
            d.name as device,
            COUNT(*) as count
         FROM device_action da
         JOIN device d ON da.device_id = d.id
         WHERE da.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND d.name IN (${DEVICES.map(() => '?').join(',')})
         GROUP BY DATE_FORMAT(da.created_at, '%Y/%m/%d'), d.name
         ORDER BY DATE_FORMAT(da.created_at, '%Y/%m/%d') ASC`,
        [Number(days), ...DEVICES]
    );

    // Tạo danh sách ngày đầy đủ
    const dateMap = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-CA').replace(/-/g, '/');
        dateMap[label] = Object.fromEntries(DEVICES.map(name => [name, 0]));
        dateMap[label].date = label;
    }

    // Điền dữ liệu thực
    rows.forEach(row => {
        if (dateMap[row.date]) {
            dateMap[row.date][row.device] = Number(row.count);
        }
    });

    return Object.values(dateMap);
};

module.exports = { getDeviceToggleStats, DEVICES };
