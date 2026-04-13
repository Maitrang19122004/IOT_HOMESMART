const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboard.controller');
const sensorController = require('../controllers/sensor.controller');
const deviceController = require('../controllers/device.controller');

// Dashboard routes
router.get('/dashboard/chart', dashboardController.getDashboardChart);
router.get('/dashboard/status', dashboardController.getDashboardStatus);

// Sensor routes
router.get('/sensors/history', sensorController.getSensorHistory);

// Device routes
router.get('/devices/history', deviceController.getDeviceHistory);
router.get('/devices/latest-status', deviceController.getLatestStatus);

module.exports = router;
