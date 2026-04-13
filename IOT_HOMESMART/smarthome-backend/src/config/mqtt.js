const mqtt = require('mqtt');
const env = require('./env');
const sensorService = require('../services/sensor.service');
const deviceService = require('../services/device.service');

let mqttClient = null;

const connectMQTT = () => {
    mqttClient = mqtt.connect(env.MQTT_URL, {
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD
    });

    mqttClient.on('connect', () => {
        console.log('✅ Backend đã kết nối MQTT Broker!');
        mqttClient.subscribe('smarthome/environment');
        mqttClient.subscribe('smarthome/devices/status');
    });

    mqttClient.on('message', (topic, message) => {
        const payload = message.toString();

        if (topic === 'smarthome/environment') {
            sensorService.processSensorData(payload);
        }

        if (topic === 'smarthome/devices/status') {
            deviceService.processDeviceStatus(payload);
        }
    });

    mqttClient.on('error', (err) => {
        console.error('❌ Lỗi MQTT:', err.message);
    });
};

module.exports = { connectMQTT, getMQTTClient: () => mqttClient };
