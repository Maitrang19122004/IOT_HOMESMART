const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { connectMQTT } = require('./config/mqtt');
require('./config/database');

const apiRoutes = require('./routes');

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== ROUTES =====
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend server is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ===== MQTT CONNECTION =====
connectMQTT();

// ===== START SERVER =====
app.listen(env.PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🏠 IoT Smart Home Backend Server     ║
║   Running on http://localhost:${env.PORT}    ║
║   Environment: ${env.NODE_ENV.toUpperCase()}            ║
╚════════════════════════════════════════╝
    `);
});
