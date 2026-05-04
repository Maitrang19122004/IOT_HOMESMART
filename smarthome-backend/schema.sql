-- Database schema for MySQL

CREATE TABLE IF NOT EXISTS sensor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    unit VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    mqtt_name VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT NOT NULL,
    value DECIMAL(10,3) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Normal',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensor(id)
);

CREATE TABLE IF NOT EXISTS device_action (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    action VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES device(id)
);

INSERT IGNORE INTO sensor (name, unit)
VALUES ('Temperature', '°C'), ('Humidity', '%'), ('Light', 'Lux');

INSERT IGNORE INTO device (name, mqtt_name)
VALUES ('Air Conditioner', 'Den 1'), ('Dehumidifier', 'Den 2'), ('Smart Light', 'Den 3'),
       ('Smart TV', 'Den 4'), ('Water Pump', 'Den 5'), ('All Devices', 'tat ca');
