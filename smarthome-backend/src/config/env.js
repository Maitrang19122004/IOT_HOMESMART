require('dotenv').config();

module.exports = {
    // Server
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // MySQL Database
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 3306,
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'iot_dashboard',

    // MQTT Broker
    MQTT_URL: process.env.MQTT_URL || process.env.MQTT_BROKER || 'mqtt://localhost:2004',
    MQTT_USERNAME: process.env.MQTT_USERNAME || process.env.MQTT_USER || 'ningyao',
    MQTT_PASSWORD: process.env.MQTT_PASSWORD || '07092004',
};
