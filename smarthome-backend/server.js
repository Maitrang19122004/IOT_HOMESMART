const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const mqtt = require('mqtt');
const { EventEmitter } = require('events');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// SSE event bus for realtime updates
const ssebus = new EventEmitter();
ssebus.setMaxListeners(0);


// 1. CẤU HÌNH KẾT NỐI MYSQL (iot_system)

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'iot_system',
    charset: 'utf8mb4'
});

db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL:', err);
        return;
    }
    console.log('Đã kết nối thành công tới MySQL (iot_system)');
});


// 2. KẾT NỐI MQTT ĐỂ LƯU DỮ LIỆU TỰ ĐỘNG

const mqttBroker = process.env.MQTT_URL || process.env.MQTT_BROKER || 'mqtt://localhost:2004';
const mqttUsername = process.env.MQTT_USERNAME || process.env.MQTT_USER || 'ningyao';
const mqttPassword = process.env.MQTT_PASSWORD || '07092004';

const mqttClient = mqtt.connect(mqttBroker, {
    username: mqttUsername,
    password: mqttPassword
});

mqttClient.on('connect', () => {
    console.log('Backend đã kết nối MQTT Broker!');
    mqttClient.subscribe('iot/ningyao/sensor');
    mqttClient.subscribe('iot/ningyao/ack');
});

mqttClient.on('message', (topic, message) => {
    const payload = message.toString();

    // Broadcast tới tất cả SSE clients
    ssebus.emit('event', { type: 'mqtt_message', payload: { topic, payload } });

    // --- XỬ LÝ DỮ LIỆU CẢM BIẾN ---
    if (topic === 'iot/ningyao/sensor') {
        try {
            const json = JSON.parse(payload);
            const temp = parseFloat(json.temperature);
            const humi = parseFloat(json.humidity);
            const light = parseFloat(json.light_sensor);

            if (!isNaN(temp) && !isNaN(humi) && !isNaN(light)) {
                const temp_ = temp, humi_ = humi, light_ = light;

                const sensors = [
                    { name: 'Temperature', unit: '°C', value: temp },
                    { name: 'Humidity', unit: '%', value: humi },
                    { name: 'Light', unit: 'Lux', value: light }
                ];

                const fetchSensorId = (sensorName, unit, callback) => {
                    db.query('SELECT id FROM sensor WHERE name = ?', [sensorName], (err, results) => {
                        if (err) return callback(err);
                        if (results.length) {
                            callback(null, results[0].id);
                        } else {
                            db.query('INSERT INTO sensor (name, unit) VALUES (?, ?)', [sensorName, unit], (insertErr, insertRes) => {
                                if (insertErr) return callback(insertErr);
                                callback(null, insertRes.insertId);
                            });
                        }
                    });
                };

                const insertRecords = [];
                const insertNext = (index) => {
                    if (index >= sensors.length) {
                        db.query('INSERT INTO sensor_data (sensor_id, value, status) VALUES ?', [insertRecords], (err) => {
                            if (err) console.error('Lỗi lưu cảm biến:', err);
                            else console.log(`Đã lưu cảm biến: ${temp}°C, ${humi}%, ${light}Lux`);
                        });
                        return;
                    }
                    const sensor = sensors[index];
                    fetchSensorId(sensor.name, sensor.unit, (err, sensorId) => {
                        if (err) return console.error('Lỗi tìm sensor:', err);
                        const thresholds = { Temperature: [15, 35], Humidity: [30, 70], Light: [0, 1000] };
                        const t = thresholds[sensor.name];
                        const st = t ? (sensor.value < t[0] ? 'Low' : sensor.value > t[1] ? 'High' : 'Normal') : 'Normal';
                        insertRecords.push([sensorId, sensor.value, st]);
                        insertNext(index + 1);
                    });
                };

                insertNext(0);
            }
        } catch (err) { console.error('Lỗi MQTT cảm biến:', err); }
    }


    // Arduino ACK: {"device":"LED Light","status":"ON"}
    if (topic === 'iot/ningyao/ack') {
        let json;
        try { json = JSON.parse(payload); } catch { return; }
        const deviceName = json.device || 'System';
        const actionStr = (json.status || 'OFF').toUpperCase();

        const fetchDeviceId = (name, callback) => {
            db.query('SELECT id FROM device WHERE name = ?', [name], (err, results) => {
                if (err) return callback(err);
                if (results.length) {
                    callback(null, results[0].id);
                } else {
                    db.query('INSERT INTO device (name, mqtt_name) VALUES (?, ?)', [name, name], (insertErr, insertRes) => {
                        if (insertErr) return callback(insertErr);
                        callback(null, insertRes.insertId);
                    });
                }
            });
        };

        fetchDeviceId(deviceName, (err, deviceId) => {
            if (err) return console.error('Lỗi tìm device:', err);
            const query = 'INSERT INTO device_action (device_id, action, status) VALUES (?, ?, ?)';
            db.query(query, [deviceId, actionStr, 'SUCCESS'], (err2) => {
                if (err2) console.error('Lỗi lưu Log thiết bị:', err2);
                else console.log(`Đã lưu Log: ${deviceName} - ${actionStr}`);
            });
        });
    }
});



// API: Dashboard Chart (Trang 1)
app.get('/api/dashboard/chart', (req, res) => {
    const query = `SELECT
            DATE_FORMAT(sd.created_at, "%H:%i") as time,
            MAX(CASE WHEN s.name = 'Temperature' THEN sd.value END) as temp,
            MAX(CASE WHEN s.name = 'Humidity' THEN sd.value END) as humi,
            MAX(CASE WHEN s.name = 'Light' THEN sd.value END) as light
        FROM sensor_data sd
        JOIN sensor s ON sd.sensor_id = s.id
        GROUP BY sd.created_at
        ORDER BY sd.created_at DESC
        LIMIT 24`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results.reverse());
    });
});

// API: Sensor History (Trang 2)
app.get('/api/sensors/history', (req, res) => {
    const query = `SELECT sd.id, s.name as sensor, sd.value, s.unit, sd.status,
                    DATE_FORMAT(sd.created_at, "%Y/%m/%d %h:%i:%s %p") as time
                   FROM sensor_data sd
                   JOIN sensor s ON sd.sensor_id = s.id
                   ORDER BY sd.id DESC
                   LIMIT 50`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results.map(row => ({
            id: row.id,
            time: row.time,
            sensor: row.sensor,
            value: `${row.value}${row.unit}`,
            status: row.status || 'Normal'
        })));
    });
});

// API: Device Activity History (Trang 3)
app.get('/api/devices/history', (req, res) => {
    const query = `SELECT da.id, d.name as device, da.action, da.status,
                    DATE_FORMAT(da.created_at, "%Y/%m/%d %h:%i:%s %p") as time
                   FROM device_action da
                   JOIN device d ON da.device_id = d.id
                   ORDER BY da.id DESC
                   LIMIT 50`;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Lỗi API Lịch sử thiết bị:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});

// API: Lấy trạng thái cuối cùng của các thiết bị
app.get('/api/devices/latest-status', (req, res) => {
    const sql = `
        SELECT d.name as device, da.action
        FROM device_action da
        JOIN device d ON da.device_id = d.id
        WHERE da.id IN (SELECT MAX(id) FROM device_action GROUP BY device_id)
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);

        let statusMap = {};
        results.forEach(row => {
            statusMap[row.device] = row.action;
        });
        res.json(statusMap);
    });
});


// API: SSE Realtime Events
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    const listener = (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    ssebus.on('event', listener);

    const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 30000);

    req.on('close', () => {
        clearInterval(keepAlive);
        ssebus.off('event', listener);
        res.end();
    });
});

// API: Control Device via MQTT
const COMMAND_MAP = {
    'DEN1_ON': 'RED_ON', 'DEN1_OFF': 'RED_OFF',
    'DEN2_ON': 'YELLOW_ON', 'DEN2_OFF': 'YELLOW_OFF',
    'DEN3_ON': 'GREEN_ON', 'DEN3_OFF': 'GREEN_OFF',
    'DEN3_AUTO': 'ALL_BLINK',
};
app.post('/api/devices/control', (req, res) => {
    const { command } = req.body || {};
    if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'command is required' });
    }
    if (!mqttClient.connected) {
        return res.status(503).json({ error: 'MQTT broker is unavailable' });
    }
    const arduinoCmd = COMMAND_MAP[command] || command;
    mqttClient.publish('iot/ningyao/control', arduinoCmd, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to publish MQTT command' });
        res.json({ success: true, command: arduinoCmd });
    });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// 4. KHỞI ĐỘNG SERVER
app.listen(5000, () => {
    console.log(`Backend Server đang chạy tại http://localhost:5000`);
});
