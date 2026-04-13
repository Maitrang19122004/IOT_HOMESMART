require('dotenv').config();

module.exports = {
    // Server
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // MySQL Database
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '123456',
    DB_NAME: process.env.DB_NAME || 'iot_system',

    // MQTT Broker
    MQTT_URL: process.env.MQTT_URL || 'mqtt://172.20.10.3:1884',
    MQTT_USERNAME: process.env.MQTT_USERNAME || 'Maithutrang',
    MQTT_PASSWORD: process.env.MQTT_PASSWORD || '19122004',
};
