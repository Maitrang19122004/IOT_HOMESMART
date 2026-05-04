const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboard.controller');
const sensorController    = require('../controllers/sensor.controller');
const deviceController    = require('../controllers/device.controller');
const realtimeController  = require('../controllers/realtime.controller');
const statsController     = require('../controllers/stats.controller');

// Dashboard
router.get('/dashboard/chart',  dashboardController.getDashboardChart);
router.get('/dashboard/status', dashboardController.getDashboardStatus);

// Sensor
router.get('/sensors/history', sensorController.getSensorHistory);

// Device
router.get('/devices/history',       deviceController.getDeviceHistory);
router.get('/devices/latest-status', deviceController.getLatestStatus);
router.post('/devices/control',      deviceController.controlDevice);

// Stats
router.get('/stats/device-toggles', statsController.getToggleStats);

// Realtime SSE
router.get('/events', realtimeController.streamEvents);

module.exports = router;
