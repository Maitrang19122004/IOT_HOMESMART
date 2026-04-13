# 🔌 Backend API Guide

## Cấu Trúc Thư Mục

```
smarthome-backend/
├── src/
│   ├── config/              # Cấu hình ứng dụng
│   │   ├── env.js          # Environment variables
│   │   ├── database.js     # MySQL connection pool
│   │   └── mqtt.js         # MQTT broker connection
│   ├── controllers/        # Request handlers
│   │   ├── dashboard.controller.js
│   │   ├── sensor.controller.js
│   │   └── device.controller.js
│   ├── services/           # Business logic
│   │   ├── sensor.service.js
│   │   └── device.service.js
│   └── routes/
│       └── index.js        # API routes definition
├── .env.example            # Environment template
├── src/app.js              # Express app setup
└── package.json
```

## API Endpoints

### 📊 Dashboard
```
GET /api/dashboard/chart        # Charts data (last 24 hour sensors)
GET /api/dashboard/status       # Latest device status
```

### 📈 Sensors
```
GET /api/sensors/history?limit=50       # Sensor history
```

### 🔌 Devices
```
GET /api/devices/history?limit=50       # Device activity history
GET /api/devices/latest-status          # Latest status of each device
```

## Chạy Development

```bash
npm install
npm run dev
```

Server sẽ start tại `http://localhost:5000`

## Environment Setup

```bash
cp .env.example .env
# Cập nhật các giá trị cho môi trường của bạn
```

---

**Happy Coding!** 🚀
