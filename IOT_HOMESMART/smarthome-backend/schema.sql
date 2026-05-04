-- Database schema for normalized smart home tables

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS sensor_data;
DROP TABLE IF EXISTS device_action;
DROP TABLE IF EXISTS sensor;
DROP TABLE IF EXISTS device;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE sensor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    unit VARCHAR(16) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    mqtt_name VARCHAR(64),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT NOT NULL,
    value DECIMAL(10,3) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Normal',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensor(id)
);

CREATE TABLE device_action (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    action VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES device(id)
);

-- Remove legacy user column if it still exists in old deployments
ALTER TABLE device_action DROP COLUMN IF EXISTS user;

-- Optional starter data for sensor and device lookup tables
INSERT IGNORE INTO sensor (name, unit) VALUES
    ('Temperature', '°C'),
    ('Humidity', '%'),
    ('Light', 'Lux');

INSERT IGNORE INTO device (name, mqtt_name) VALUES
    ('Air Conditioner', 'Den 1'),
    ('Dehumidifier', 'Den 2'),
    ('Smart Light', 'Den 3'),
    ('All Devices', 'tat ca');
