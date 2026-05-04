const db = require('../config/database');

const SENSOR_META = {
    Temperature: '°C',
    Humidity: '%',
    Light: 'Lux'
};

const SENSOR_THRESHOLDS = {
    Temperature: { low: 15, high: 35 },
    Humidity: { low: 30, high: 70 },
    Light: { low: 0, high: 1000 }
};

const getSensorStatus = (name, value) => {
    const thresholds = SENSOR_THRESHOLDS[name];
    if (!thresholds) return 'Normal';

    if (value < thresholds.low) return 'Low';
    if (value > thresholds.high) return 'High';
    return 'Normal';
};

const getSensorId = async (name, unit) => {
    const [result] = await db.promise().query(
        `INSERT INTO sensor (name, unit)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), unit = VALUES(unit)`,
        [name, unit]
    );
    return result.insertId;
};

const processSensorData = async (payload) => {
    try {
        let parsed;
        try { parsed = JSON.parse(payload); } catch { return; }

        const temp = parseFloat(parsed.temperature);
        const humi = parseFloat(parsed.humidity);
        const light = parseFloat(parsed.light_sensor);

        if (isNaN(temp) || isNaN(humi) || isNaN(light)) return;

        const sensorRecords = [
            { name: 'Temperature', unit: SENSOR_META.Temperature, value: temp },
            { name: 'Humidity', unit: SENSOR_META.Humidity, value: humi },
            { name: 'Light', unit: SENSOR_META.Light, value: light }
        ];

        for (const record of sensorRecords) {
            const sensorId = await getSensorId(record.name, record.unit);
            const status = getSensorStatus(record.name, record.value);
            await db.promise().query(
                'INSERT INTO sensor_data (sensor_id, value, status) VALUES (?, ?, ?)',
                [sensorId, record.value, status]
            );
        }

        console.log(`Saved sensor data: ${sensorRecords.map((r) => `${r.value}${r.unit}`).join(', ')}`);
    } catch (err) {
        console.error('Sensor processing error:', err.message);
    }
};

const getSensorHistory = async (limit = 50) => {
    const [rows] = await db.promise().query(
        `SELECT sd.id, s.name as sensor, sd.value, s.unit, sd.status,
                DATE_FORMAT(sd.created_at, "%Y/%m/%d %h:%i:%s %p") as time
         FROM sensor_data sd
         JOIN sensor s ON sd.sensor_id = s.id
         ORDER BY sd.id DESC
         LIMIT ?`,
        [Number(limit)]
    );

    return rows.map((row) => ({
        id: row.id,
        time: row.time,
        sensor: row.sensor,
        value: `${row.value}${row.unit}`,
        status: row.status
    }));
};

const getDashboardData = async (limit = 24) => {
    const [rows] = await db.promise().query(
        `SELECT
            DATE_FORMAT(MAX(sd.created_at), "%H:%i") as time,
            MAX(CASE WHEN s.name = 'Temperature' THEN sd.value END) as temp,
            MAX(CASE WHEN s.name = 'Humidity' THEN sd.value END) as humi,
            MAX(CASE WHEN s.name = 'Light' THEN sd.value END) as light
         FROM sensor_data sd
         JOIN sensor s ON sd.sensor_id = s.id
         GROUP BY DATE_FORMAT(sd.created_at, "%Y-%m-%d %H:00:00")
         ORDER BY MAX(sd.created_at) DESC
         LIMIT ?`,
        [Number(limit)]
    );

    return rows.reverse();
};

module.exports = {
    processSensorData,
    getSensorHistory,
    getDashboardData
};
