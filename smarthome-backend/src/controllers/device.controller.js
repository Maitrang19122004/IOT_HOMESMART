const deviceService = require('../services/device.service');
const { getMQTTClient } = require('../config/mqtt');
const realtimeService = require('../services/realtime.service');

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

const COMMAND_MAP = {
    'DEN3_AUTO': 'NHAY_ON',
};

const VIRTUAL_COMMANDS = {
    'DEN4_ON':  { device: 'Smart TV',   status: 'ON'  },
    'DEN4_OFF': { device: 'Smart TV',   status: 'OFF' },
    'DEN5_ON':  { device: 'Water Pump', status: 'ON'  },
    'DEN5_OFF': { device: 'Water Pump', status: 'OFF' },
};

const controlDevice = async (req, res) => {
    const { command } = req.body || {};

    if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'command is required' });
    }

    // Virtual devices: save to DB and emit SSE ACK, no MQTT needed
    if (VIRTUAL_COMMANDS[command]) {
        try {
            const ack = VIRTUAL_COMMANDS[command];
            const jsonStr = JSON.stringify(ack);
            await deviceService.processDeviceStatus(jsonStr);
            realtimeService.publishEvent('mqtt_message', { topic: 'iot/ningyao/ack', payload: jsonStr });
            console.log(`🎮 Virtual: ${command} → ${ack.device} ${ack.status}`);
            return res.json({ success: true, command });
        } catch (err) {
            console.error('Virtual device error:', err.message);
            return res.status(500).json({ error: 'Failed to process virtual command' });
        }
    }

    const mqttClient = getMQTTClient();
    if (!mqttClient || !mqttClient.connected) {
        return res.status(503).json({ error: 'MQTT broker is unavailable' });
    }

    const arduinoCmd = COMMAND_MAP[command] || command;

    mqttClient.publish('smarthome/devices/control', arduinoCmd, (err) => {
        if (err) {
            console.error('Device control publish error:', err.message);
            return res.status(500).json({ error: 'Failed to publish MQTT command' });
        }

        console.log(`🎮 Control: ${command} → ${arduinoCmd}`);
        res.json({ success: true, command: arduinoCmd });
    });
};

module.exports = {
    getDeviceHistory,
    getLatestStatus,
    controlDevice
};
