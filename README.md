# 🏠 IoT Smart Home System

Hệ thống nhà thông minh kết nối MQTT với Backend API và giao diện React Web.

## 📋 Cấu Trúc Dự Án

```
IOT_HOMESMART/
├── smarthome-backend/          # Backend API Server (Express.js)
│   ├── src/
│   │   ├── config/             # Cấu hình (database, MQTT, environment)
│   │   ├── controllers/        # Logic xử lý requests
│   │   ├── services/           # Business logic, xử lý MQTT
│   │   ├── routes/             # API endpoints
│   │   └── app.js              # Main app file
│   ├── .env.example            # Template biến môi trường
│   └── package.json
│
├── smarthome-web/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API calls, MQTT client
│   │   ├── utils/              # Helper functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── .gitignore
└── package.json                # Root package.json (nếu cần)
```

## 🚀 Cài Đặt & Chạy

### Backend

```bash
cd smarthome-backend

# Copy env file và cập nhật credentials
cp .env.example .env

# Cài dependencies
npm install

# Chạy development server
npm run dev

# Hoặc chạy production
npm start
```

**API Endpoints:**
- `GET /api/dashboard/chart` - Dữ liệu biểu đồ dashboard
- `GET /api/dashboard/status` - Trạng thái thiết bị mới nhất
- `GET /api/sensors/history` - Lịch sử cảm biến
- `GET /api/devices/history` - Lịch sử hoạt động thiết bị
- `GET /api/devices/latest-status` - Trạng thái mới nhất từng thiết bị

### Frontend

```bash
cd smarthome-web

# Cài dependencies
npm install

# Chạy development server (hot reload)
npm run dev

# Build production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🛠️ Công Nghệ Sử Dụng

### Backend
- **Express.js** - Web framework
- **MySQL2** - Database client
- **MQTT** - IoT messaging protocol
- **Dotenv** - Environment variables
- **CORS** - Cross-origin support

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Recharts** - Data visualization
- **MQTT.js** - MQTT client
- **Lucide React** - Icons

## 🔧 Cấu Hình

### Backend (.env)
```
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=iot_system

MQTT_URL=mqtt://172.20.10.3:1884
MQTT_USERNAME=Maithutrang
MQTT_PASSWORD=19122004
```

## 📂 Tổ Chức Mã

### Backend Architecture

```
src/
├── config/
│   ├── env.js          # Load environment variables
│   ├── database.js     # MySQL connection
│   └── mqtt.js         # MQTT broker connection
├── controllers/
│   ├── dashboard.controller.js
│   ├── sensor.controller.js
│   └── device.controller.js
├── services/
│   ├── sensor.service.js    # Sensor data logic
│   └── device.service.js    # Device control logic
└── routes/
    └── index.js             # API routes definitio
```

### Frontend Organization

```
src/
├── components/    # Reusable UI components
├── pages/        # Full page components
├── hooks/        # Custom React hooks
├── services/     # API & MQTT services
├── utils/        # Helper functions
└── App.jsx       # Main App component
```

## 💡 Lợi Ích của Cấu Trúc Này

✅ **Separation of Concerns** - Mỗi module có trách nhiệm riêng
✅ **Scalability** - Dễ thêm features mới
✅ **Maintainability** - Code sạch, dễ bảo trì
✅ **Reusability** - Components & services tái sử dụng
✅ **Testing** - Dễ viết unit tests
✅ **Collaboration** - Nhiều developer có thể làm song song

## 📝 Ghi Chú Phát Triển

- Luôn cập nhật `.env.example` khi thêm environment variables mới
- Viết comments rõ ràng cho logic phức tạp
- Follow naming conventions: camelCase cho variables/functions, PascalCase cho components
- Commit messages nên rõ ràng và descriptive

---

**Made with ❤️ for IoT Smart Home**
