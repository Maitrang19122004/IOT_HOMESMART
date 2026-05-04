const mqtt = require('mqtt');
const env = require('./env');
const sensorService = require('../services/sensor.service');
const deviceService = require('../services/device.service');
const realtimeService = require('../services/realtime.service');

let mqttClient = null;

// Parse plain text: "Nhiet do: 28.5C | Do am: 65% | Anh sang: 22.5 Lux"
const parseEnvironmentText = (text) => {
    const tempMatch = text.match(/Nhiet do:\s*([\d.]+)C/);
    const humiMatch = text.match(/Do am:\s*([\d.]+)%/);
    const luxMatch  = text.match(/Anh sang:\s*([\d.]+)\s*Lux/);
    if (!tempMatch || !humiMatch || !luxMatch) return null;
    return {
        temperature:  parseFloat(tempMatch[1]),
        humidity:     parseFloat(humiMatch[1]),
        light_sensor: parseFloat(luxMatch[1])
    };
};

// Parse plain text ACK: "Thanh cong: Den 1 da BAT"
// Tên device khớp với tên hiển thị trên dashboard
const parseStatusText = (text) => {
    if (text.includes('Den 1 da BAT'))       return { device: 'Air Conditioner', status: 'ON'    };
    if (text.includes('Den 1 da TAT'))       return { device: 'Air Conditioner', status: 'OFF'   };
    if (text.includes('Den 2 da BAT'))       return { device: 'Dehumidifier',    status: 'ON'    };
    if (text.includes('Den 2 da TAT'))       return { device: 'Dehumidifier',    status: 'OFF'   };
    if (text.includes('Den 3 da BAT'))       return { device: 'Smart Light',     status: 'ON'    };
    if (text.includes('Den 3 da TAT'))       return { device: 'Smart Light',     status: 'OFF'   };
    if (text.includes('BAT nhap nhay'))      return { device: 'Smart Light',     status: 'BLINK' };
    if (text.includes('TAT nhap nhay'))      return { device: 'Smart Light',     status: 'OFF'   };
    if (text.includes('Den 4 da BAT'))       return { device: 'Smart TV',        status: 'ON'    };
    if (text.includes('Den 4 da TAT'))       return { device: 'Smart TV',        status: 'OFF'   };
    if (text.includes('Den 5 da BAT'))       return { device: 'Water Pump',      status: 'ON'    };
    if (text.includes('Den 5 da TAT'))       return { device: 'Water Pump',      status: 'OFF'   };
    if (text.includes('Tat ca den da BAT'))  return { device: 'All Devices',     status: 'ON'    };
    if (text.includes('Tat ca den da TAT'))  return { device: 'All Devices',     status: 'OFF'   };
    return null;
};

const connectMQTT = () => {
    console.log(`Connecting MQTT broker: ${env.MQTT_URL}`);

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
            const json = parseEnvironmentText(payload);
            if (json) {
                const jsonStr = JSON.stringify(json);
                // Gửi tới frontend qua SSE (dùng topic chuẩn để frontend nhận)
                realtimeService.publishEvent('mqtt_message', {
                    topic: 'iot/ningyao/sensor',
                    payload: jsonStr
                });
                sensorService.processSensorData(jsonStr);
            } else {
                console.warn('⚠️ Không parse được sensor payload:', payload);
            }
        }

        if (topic === 'smarthome/devices/status') {
            const json = parseStatusText(payload);
            if (json) {
                const jsonStr = JSON.stringify(json);
                realtimeService.publishEvent('mqtt_message', {
                    topic: 'iot/ningyao/ack',
                    payload: jsonStr
                });
                deviceService.processDeviceStatus(jsonStr);
            } else {
                console.warn('⚠️ Không parse được ACK payload:', payload);
            }
        }
    });

    mqttClient.on('error', (err) => {
        console.error('❌ Lỗi MQTT:', err.message);
    });
    mqttClient.on('reconnect', () => {
        console.log('🔄 MQTT reconnecting...');
    });
};

module.exports = { connectMQTT, getMQTTClient: () => mqttClient };
