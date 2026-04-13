const db = require('../config/database');

const SENSOR_META = {
    Temperature: '°C',
    Humidity: '%',
    Light: 'Lux'
};

const SENSOR_THRESHOLDS = {
    Temperature: { low: 15, high: 35 },
    Humidity: { low: 30, high: 70 },
    Light: { low: 0, high: 1000 } // Light can be very high, so only check high threshold
};

const getSensorStatus = (name, value) => {
    const thresholds = SENSOR_THRESHOLDS[name];
    if (!thresholds) return 'Normal';

    if (value < thresholds.low) return 'Low';
    if (value > thresholds.high) return 'High';
    return 'Normal';
};

const getSensorId = async (name, unit) => {
    const [rows] = await db.promise().query('SELECT id FROM sensor WHERE name = ?', [name]);
    if (rows.length) return rows[0].id;
    const [result] = await db.promise().query('INSERT INTO sensor (name, unit) VALUES (?, ?)', [name, unit]);
    return result.insertId;
};

const processSensorData = async (payload) => {
    try {
        const tempMatch = payload.match(/Nhiet do:\s*([\d.]+)/);
        const humiMatch = payload.match(/Do am:\s*([\d.]+)/);
        const lightMatch = payload.match(/Anh sang:\s*([\d.]+)/);

        if (tempMatch && humiMatch && lightMatch) {
            const sensorRecords = [
                { name: 'Temperature', unit: SENSOR_META.Temperature, value: parseFloat(tempMatch[1]) },
                { name: 'Humidity', unit: SENSOR_META.Humidity, value: parseFloat(humiMatch[1]) },
                { name: 'Light', unit: SENSOR_META.Light, value: parseFloat(lightMatch[1]) }
            ];

            const insertValues = [];
            for (const record of sensorRecords) {
                const sensorId = await getSensorId(record.name, record.unit);
                const status = getSensorStatus(record.name, record.value);
                insertValues.push([sensorId, record.value, status]);
            }

            await db.promise().query('INSERT INTO sensor_data (sensor_id, value, status) VALUES ?', [insertValues]);
            console.log(`📊 Đã lưu cảm biến: ${sensorRecords.map(r => `${r.value}${r.unit} (${getSensorStatus(r.name, r.value)})`).join(', ')}`);
        }
    } catch (err) {
        console.error('❌ Lỗi xử lý dữ liệu cảm biến:', err.message);
    }
};

const getSensorHistory = (limit = 50) => {
    return db.promise().query(
        `SELECT sd.id, s.name as sensor, sd.value, s.unit, sd.status, DATE_FORMAT(sd.created_at, "%Y/%m/%d %h:%i:%s %p") as time
         FROM sensor_data sd
         JOIN sensor s ON sd.sensor_id = s.id
         ORDER BY sd.id DESC
         LIMIT ?`,
        [limit]
    ).then(([rows]) => rows.map(row => ({
        id: row.id,
        time: row.time,
        sensor: row.sensor,
        value: `${row.value}${row.unit}`,
        status: row.status
    })));
};

const getDashboardData = (limit = 24) => {
    return db.promise().query(
        `SELECT
            DATE_FORMAT(sd.created_at, "%H:%i") as time,
            MAX(CASE WHEN s.name = 'Temperature' THEN sd.value END) as temp,
            MAX(CASE WHEN s.name = 'Humidity' THEN sd.value END) as humi,
            MAX(CASE WHEN s.name = 'Light' THEN sd.value END) as light
         FROM sensor_data sd
         JOIN sensor s ON sd.sensor_id = s.id
         GROUP BY sd.created_at
         ORDER BY sd.created_at DESC
         LIMIT ?`,
        [limit]
    ).then(([rows]) => rows.reverse());
};

module.exports = {
    processSensorData,
    getSensorHistory,
    getDashboardData
};
