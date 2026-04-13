const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();
app.use(cors());
app.use(express.json());


// 1. CẤU HÌNH KẾT NỐI MYSQL (iot_system)

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456', // Pass của bạn
    database: 'iot_system'
});

db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL:', err);
        return;
    }
    console.log('Đã kết nối thành công tới MySQL (iot_system)');
});


// 2. KẾT NỐI MQTT ĐỂ LƯU DỮ LIỆU TỰ ĐỘNG

const mqttClient = mqtt.connect('mqtt://172.20.10.3:1884', {
    username: 'Maithutrang',
    password: '19122004'
});

mqttClient.on('connect', () => {
    console.log('Backend đã kết nối MQTT Broker!');
    mqttClient.subscribe('smarthome/environment');
    mqttClient.subscribe('smarthome/devices/status');
});

mqttClient.on('message', (topic, message) => {
    const payload = message.toString();

    // --- XỬ LÝ DỮ LIỆU CẢM BIẾN ---
    if (topic === 'smarthome/environment') {
        try {
            const tempMatch = payload.match(/Nhiet do:\s*([\d.]+)/);
            const humiMatch = payload.match(/Do am:\s*([\d.]+)/);
            const lightMatch = payload.match(/Anh sang:\s*([\d.]+)/);

            if (tempMatch && humiMatch && lightMatch) {
                const temp = parseFloat(tempMatch[1]);
                const humi = parseFloat(humiMatch[1]);
                const light = parseFloat(lightMatch[1]);

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
                        db.query('INSERT INTO sensor_data (sensor_id, value) VALUES ?', [insertRecords], (err) => {
                            if (err) console.error('Lỗi lưu cảm biến:', err);
                            else console.log(`Đã lưu cảm biến: ${temp}°C, ${humi}%, ${light}Lux`);
                        });
                        return;
                    }
                    const sensor = sensors[index];
                    fetchSensorId(sensor.name, sensor.unit, (err, sensorId) => {
                        if (err) return console.error('Lỗi tìm sensor:', err);
                        insertRecords.push([sensorId, sensor.value]);
                        insertNext(index + 1);
                    });
                };

                insertNext(0);
            }
        } catch (err) { console.error('Lỗi MQTT cảm biến:', err); }
    }


    if (topic === 'smarthome/devices/status') {
        let deviceName = 'System';
        const normalized = payload.toUpperCase();
        let actionStr = 'OFF';

        if (normalized.includes('AUTO')) {
            actionStr = 'AUTO';
        } else if (normalized.includes('BAT') || normalized.includes('ON')) {
            actionStr = 'ON';
        }

        if (normalized.includes('DEN 1') || normalized.includes('DEN1')) deviceName = 'Air Conditioner';
        else if (normalized.includes('DEN 2') || normalized.includes('DEN2')) deviceName = 'Dehumidifier';
        else if (normalized.includes('DEN 3') || normalized.includes('DEN3')) deviceName = 'Smart Light';
        else if (normalized.includes('TAT CA')) deviceName = 'All Devices';

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
    const query = `SELECT sd.id, s.name as sensor, sd.value, s.unit,
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
            value: `${row.value}${row.unit}`
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


// 4. KHỞI ĐỘNG SERVER
app.listen(5000, () => {
    console.log(`Backend Server đang chạy tại http://localhost:5000`);
});