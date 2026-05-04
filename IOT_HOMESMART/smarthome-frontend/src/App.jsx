import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SensorHistory from './pages/SensorHistory';
import DeviceHistory from './pages/DeviceHistory';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sensor" element={<SensorHistory />} />
          <Route path="/activity" element={<DeviceHistory />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
