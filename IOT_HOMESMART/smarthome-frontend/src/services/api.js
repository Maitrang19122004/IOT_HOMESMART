// API service for backend communication
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = {
    // Dashboard
    getDashboardChart: async () => {
        const res = await fetch(`${API_BASE_URL}/dashboard/chart`);
        if (!res.ok) throw new Error('Failed to fetch dashboard chart');
        return res.json();
    },

    getDashboardStatus: async () => {
        const res = await fetch(`${API_BASE_URL}/dashboard/status`);
        if (!res.ok) throw new Error('Failed to fetch dashboard status');
        return res.json();
    },

    // Sensors
    getSensorHistory: async (limit = 50) => {
        const res = await fetch(`${API_BASE_URL}/sensors/history?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch sensor history');
        return res.json();
    },

    // Devices
    getDeviceHistory: async (limit = 50) => {
        const res = await fetch(`${API_BASE_URL}/devices/history?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch device history');
        return res.json();
    },

    getLatestDeviceStatus: async () => {
        const res = await fetch(`${API_BASE_URL}/devices/latest-status`);
        if (!res.ok) throw new Error('Failed to fetch latest device status');
        return res.json();
    }
};
