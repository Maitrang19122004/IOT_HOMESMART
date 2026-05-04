import React, { useEffect, useState } from 'react';
import mqtt from 'mqtt';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Sun, Snowflake, Wind, Lightbulb } from 'lucide-react';
import { apiClient } from '../services/api';

const parseDeviceStatusPayload = (payload) => {
    if (!payload) return null;
    const normalized = payload.toUpperCase();
    let name = null;
    if (/DEN\s*1|DEN1/.test(normalized)) name = 'light';
    if (/DEN\s*2|DEN2/.test(normalized)) name = 'ac';
    if (/DEN\s*3|DEN3/.test(normalized)) name = 'plug';
    if (!name) return null;

    let status = 'off';
    if (normalized.includes('AUTO')) status = 'auto';
    else if (normalized.includes('BAT') || normalized.includes('ON')) status = 'on';

    return { name, status };
};

const Dashboard = () => {
    const [devices, setDevices] = useState({ light: false, ac: false, plug: false });
    const [waitingDevices, setWaitingDevices] = useState({ light: false, ac: false, plug: false });
    const [smartLightAuto, setSmartLightAuto] = useState(false);
    const [sensorData, setSensorData] = useState({ temp: 0, humi: 0, light: 0 });
    const [chartData, setChartData] = useState([]);
    const [client, setClient] = useState(null);

    useEffect(() => {
        apiClient.getLatestDeviceStatus()
            .then(statusMap => {
                setDevices({
                    light: statusMap['Air Conditioner'] === 'ON',
                    ac: statusMap['Dehumidifier'] === 'ON',
                    plug: statusMap['Smart Light'] === 'ON'
                });
                setSmartLightAuto(statusMap['Smart Light'] === 'AUTO');
            })
            .catch(err => console.error('Lỗi đồng bộ trạng thái:', err));
    }, []);

    useEffect(() => {
        apiClient.getDashboardChart()
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setChartData(data);
                    const latest = data[data.length - 1];
                    setSensorData({ temp: latest.temp, humi: latest.humi, light: latest.light });
                }
            })
            .catch(err => console.error('Lỗi chart:', err));

        const mqttClient = mqtt.connect('ws://172.20.10.3:9001', {
            username: 'Maithutrang',
            password: '19122004'
        });

        mqttClient.on('connect', () => {
            console.log('✅ Web đã kết nối MQTT!');
            mqttClient.subscribe('smarthome/environment');
            mqttClient.subscribe('smarthome/devices/status');
        });

        mqttClient.on('message', (topic, message) => {
            const payload = message.toString();
            if (topic === 'smarthome/environment') {
                const tempMatch = payload.match(/Nhiet do:\s*([\d.]+)/);
                const humiMatch = payload.match(/Do am:\s*([\d.]+)/);
                const lightMatch = payload.match(/Anh sang:\s*([\d.]+)/);
                if (tempMatch) setSensorData(prev => ({ ...prev, temp: parseFloat(tempMatch[1]) }));
                if (humiMatch) setSensorData(prev => ({ ...prev, humi: parseFloat(humiMatch[1]) }));
                if (lightMatch) setSensorData(prev => ({ ...prev, light: parseFloat(lightMatch[1]) }));
            }

            if (topic === 'smarthome/devices/status') {
                const parsed = parseDeviceStatusPayload(payload);
                if (parsed) {
                    setWaitingDevices(prev => ({ ...prev, [parsed.name]: false }));
                    setDevices(prev => ({ ...prev, [parsed.name]: parsed.status === 'on' || parsed.status === 'auto' }));
                    if (parsed.name === 'plug') {
                        setSmartLightAuto(parsed.status === 'auto');
                    }
                }
            }
        });

        setClient(mqttClient);
        return () => { if (mqttClient) mqttClient.end(); };
    }, []);

    const handleToggle = (name) => {
        if (!client) return;
        const newState = !devices[name];
        setWaitingDevices(prev => ({ ...prev, [name]: true }));

        let command = '';
        if (name === 'light' || name === 'ac_btn') command = newState ? 'DEN1_ON' : 'DEN1_OFF';
        if (name === 'ac' || name === 'dehumid_btn') command = newState ? 'DEN2_ON' : 'DEN2_OFF';
        if (name === 'plug' || name === 'light_btn') command = newState ? 'DEN3_ON' : 'DEN3_OFF';

        client.publish('smarthome/devices/control', command);
        console.log('>>> LỆNH BAY ĐI:', command);
    };

    const handleSmartLightAuto = () => {
        const newAuto = !smartLightAuto;
        setSmartLightAuto(newAuto);

        if (client) {
            const command = newAuto ? 'DEN3_AUTO' : 'DEN3_OFF';
            client.publish('smarthome/devices/control', command);
            console.log('>>> SMART LIGHT AUTO:', command);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-red-400 to-red-200 p-6 rounded-2xl text-white shadow-sm">
                    <Thermometer className="opacity-80 mb-4" size={24} />
                    <div className="text-sm opacity-90">Temperature</div>
                    <div className="text-3xl font-bold">{sensorData.temp} °C</div>
                </div>
                <div className="bg-gradient-to-br from-blue-400 to-blue-200 p-6 rounded-2xl text-white shadow-sm">
                    <Droplets className="opacity-80 mb-4" size={24} />
                    <div className="text-sm opacity-90">Humidity</div>
                    <div className="text-3xl font-bold">{sensorData.humi} %</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-200 p-6 rounded-2xl text-white shadow-sm">
                    <Sun className="opacity-80 mb-4" size={24} />
                    <div className="text-sm opacity-90">Light Intensity</div>
                    <div className="text-3xl font-bold">{sensorData.light} Lux</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Environmental History</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <XAxis dataKey="time" hide />
                                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={{ stroke: '#e2e8f0' }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#d97706' }} axisLine={{ stroke: '#f3f4f6' }} tickLine={{ stroke: '#f3f4f6' }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="temp" yAxisId="left" stroke="#f87171" fill="#fef2f2" />
                                <Area type="monotone" dataKey="humi" yAxisId="left" stroke="#60a5fa" fill="#eff6ff" />
                                <Area type="monotone" dataKey="light" yAxisId="right" stroke="#fbbf24" fill="#fffbeb" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">Device Controls</h3>
                    <div className="space-y-4">
                        <div className="border border-slate-100 rounded-xl p-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${devices.light ? 'bg-blue-50 text-blue-600' : 'bg-slate-100'}`}><Snowflake size={20} /></div>
                                    <div>
                                        <div className="font-medium text-sm">Air Conditioner</div>
                                        <div className="text-xs text-slate-400">{waitingDevices.light ? 'WAITING' : devices.light ? 'COOLING' : 'OFF'}</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => !waitingDevices.light && handleToggle('light')}
                                    className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${waitingDevices.light ? 'cursor-wait opacity-80' : 'cursor-pointer'} ${devices.light ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'}`}>
                                    <div className="w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-xl p-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${devices.ac ? 'bg-teal-50 text-teal-600' : 'bg-slate-100'}`}><Wind size={20} /></div>
                                    <div>
                                        <div className="font-medium text-sm">Dehumidifier</div>
                                        <div className="text-xs text-slate-400">{waitingDevices.ac ? 'WAITING' : devices.ac ? 'DRYING' : 'OFF'}</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => !waitingDevices.ac && handleToggle('ac')}
                                    className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${waitingDevices.ac ? 'cursor-wait opacity-80' : 'cursor-pointer'} ${devices.ac ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'}`}>
                                    <div className="w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-full ${devices.plug ? 'bg-yellow-50 text-yellow-600' : 'bg-slate-100'}`}><Lightbulb size={20} /></div>
                                    <div>
                                        <div className="font-medium text-sm">Smart Light</div>
                                        <div className="text-xs text-slate-400">{waitingDevices.plug ? 'WAITING' : (smartLightAuto ? 'AUTO' : devices.plug ? 'ON' : 'OFF')}</div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => !waitingDevices.plug && handleToggle('plug')}
                                    className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${waitingDevices.plug ? 'cursor-wait opacity-80' : 'cursor-pointer'} ${devices.plug ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'}`}>
                                    <div className="w-4 h-4 bg-white rounded-full"></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                <span className="text-xs font-medium text-slate-500 flex-1">Auto Mode</span>
                                <button
                                    onClick={handleSmartLightAuto}
                                    className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${smartLightAuto ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                    {smartLightAuto ? '🔄 AUTO ON' : 'OFF'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
