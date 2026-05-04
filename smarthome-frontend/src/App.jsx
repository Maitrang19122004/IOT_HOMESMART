import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, LineChart as LineChartIcon, ListOrdered, User, IdCard, FolderKanban,
  Thermometer, Droplets, Sun, ExternalLink, FileText, Figma, CodeXml, Filter,
  Lightbulb, Snowflake, Settings2, ChevronLeft, ChevronRight, Wind, Tv, BarChart2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const buildApiUrl = (path) => `${API_BASE_URL}${path}`;

const normalizeSearchValue = (value) => {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.-]/g, '/');
};

const looksLikeDateTime = (value) => {
  if (!value) return false;
  const text = value.trim();
  return /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(text);
};

// ==========================================
// CÁC TRANG CHÍNH (PAGES)
// ==========================================

// --- TRANG 1: DASHBOARD (BẢN FIX CỰC MẠNH CHO MTRAN) ---
const Dashboard = () => {
  // Mình dùng lại đúng tên biến cũ (light, ac, plug) để tránh lỗi logic, nhưng đổi nhãn hiển thị bên dưới
  const [devices, setDevices] = useState({ light: false, ac: false, plug: false, tv: false, pump: false });
  const [waitingDevices, setWaitingDevices] = useState({ light: false, ac: false, plug: false, tv: false, pump: false });
  const [smartLightAuto, setSmartLightAuto] = useState(false); // AUTO mode
  const [sensorData, setSensorData] = useState({ temp: 0, humi: 0, light: 0 });
  const [chartData, setChartData] = useState([]);
  const waitingTimeouts = useRef({});

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

  const publishDeviceCommand = async (command) => {
    const response = await fetch(buildApiUrl('/api/devices/control'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    });

    if (!response.ok) {
      throw new Error(`Control request failed with status ${response.status}`);
    }

    return response.json();
  };

  useEffect(() => {
    // 1. Lấy trạng thái thiết bị cuối cùng từ Database
    fetch(buildApiUrl('/api/devices/latest-status'))
      .then(res => res.json())
      .then(statusMap => {
        // CỰC KỲ QUAN TRỌNG: Tên biến ở đây phải khớp với useState({ light, ac, plug })
        setDevices({
          light: statusMap['Air Conditioner'] === 'ON',
          ac:    statusMap['Dehumidifier']    === 'ON',
          plug:  statusMap['Smart Light']     === 'ON' || statusMap['Smart Light'] === 'BLINK',
          tv:    statusMap['Smart TV']        === 'ON',
          pump:  statusMap['Water Pump']      === 'ON',
        });
        setSmartLightAuto(statusMap['Smart Light'] === 'BLINK');
      })
      .catch(err => console.error("Lỗi đồng bộ trạng thái:", err));
  }, []);
  useEffect(() => {
    fetch(buildApiUrl('/api/dashboard/chart'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setChartData(data);
          const latest = data[data.length - 1];
          setSensorData({ temp: latest.temp, humi: latest.humi, light: latest.light });
        }
      })
      .catch(err => console.error('Chart fetch error:', err));

    const eventSource = new EventSource(buildApiUrl('/api/events'));

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'mqtt_message' || !data.payload) return;

      const { topic, payload } = data.payload;
      // Arduino gửi JSON: {"temperature":28.5,"humidity":65,"light_sensor":450}
      if (topic === 'iot/ningyao/sensor') {
        try {
          const json = JSON.parse(payload);
          const newTemp = json.temperature != null ? parseFloat(json.temperature) : null;
          const newHumi = json.humidity != null ? parseFloat(json.humidity) : null;
          const newLight = json.light_sensor != null ? parseFloat(json.light_sensor) : null;
          if (newTemp !== null) setSensorData(prev => ({ ...prev, temp: newTemp }));
          if (newHumi !== null) setSensorData(prev => ({ ...prev, humi: newHumi }));
          if (newLight !== null) setSensorData(prev => ({ ...prev, light: newLight }));
          if (newTemp !== null || newHumi !== null || newLight !== null) {
            const timeLabel = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            setChartData(prev => {
              const last = prev[prev.length - 1] || {};
              const newPoint = {
                time: timeLabel,
                temp: newTemp ?? last.temp,
                humi: newHumi ?? last.humi,
                light: newLight ?? last.light,
              };
              return [...prev.slice(-49), newPoint];
            });
          }
        } catch { /* ignore parse error */ }
      }

      // Arduino ACK: {"device":"LED Light","status":"ON"}
      if (topic === 'iot/ningyao/ack') {
        try {
          const json = JSON.parse(payload);
          // Map Arduino device name → state key
          const deviceKeyMap = { 'Air Conditioner': 'light', 'Dehumidifier': 'ac', 'Smart Light': 'plug', 'Smart TV': 'tv', 'Water Pump': 'pump' };
          const key = deviceKeyMap[json.device];
          if (key) {
            clearTimeout(waitingTimeouts.current[key]);
            const isOn = json.status === 'ON' || json.status === 'BLINK';
            setWaitingDevices(prev => ({ ...prev, [key]: false }));
            setDevices(prev => ({ ...prev, [key]: isOn }));
            if (key === 'plug') setSmartLightAuto(json.status === 'BLINK');
          }
        } catch { /* ignore parse error */ }
      }
    };

    eventSource.onerror = () => {
      console.error('Realtime connection error');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleToggle = async (name) => {
    const newState = !devices[name];
    setWaitingDevices(prev => ({ ...prev, [name]: true }));

    clearTimeout(waitingTimeouts.current[name]);
    waitingTimeouts.current[name] = setTimeout(() => {
      setWaitingDevices(prev => ({ ...prev, [name]: false }));
    }, 5000);

    let command = '';
    if (name === 'light') command = newState ? 'DEN1_ON' : 'DEN1_OFF';
    if (name === 'ac')    command = newState ? 'DEN2_ON' : 'DEN2_OFF';
    if (name === 'plug')  command = newState ? 'DEN3_ON' : 'DEN3_OFF';
    if (name === 'tv')    command = newState ? 'DEN4_ON' : 'DEN4_OFF';
    if (name === 'pump')  command = newState ? 'DEN5_ON' : 'DEN5_OFF';

    try {
      await publishDeviceCommand(command);
      console.log('>>> Device command:', command);
    } catch (err) {
      console.error('Device control error:', err);
      clearTimeout(waitingTimeouts.current[name]);
      setWaitingDevices(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleSmartLightAuto = async () => {
    const newAuto = !smartLightAuto;
    setSmartLightAuto(newAuto);
    setWaitingDevices(prev => ({ ...prev, plug: true }));

    clearTimeout(waitingTimeouts.current['plug']);
    waitingTimeouts.current['plug'] = setTimeout(() => {
      setWaitingDevices(prev => ({ ...prev, plug: false }));
    }, 5000);

    const command = newAuto ? 'DEN3_AUTO' : 'DEN3_OFF';

    try {
      await publishDeviceCommand(command);
      console.log('>>> Smart Light Auto:', command);
    } catch (err) {
      console.error('Smart light auto control error:', err);
      clearTimeout(waitingTimeouts.current['plug']);
      setWaitingDevices(prev => ({ ...prev, plug: false }));
      setSmartLightAuto(!newAuto);
    }
  };
  return (
    <div className="space-y-6">
      {/* 3 Ô CẢM BIẾN GIỮ NGUYÊN */}
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
        {/* BIỂU ĐỒ GIỮ NGUYÊN */}
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

        {/* PHẦN ĐIỀU KHIỂN - MTRAN KIỂM TRA KỸ ĐOẠN NÀY */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6">Device Controls</h3>
          <div className="space-y-4">

            {/* 1. AIR CONDITIONER (Gắn với biến 'light' để gửi DEN1) */}
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
                  className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${waitingDevices.light ? 'cursor-wait opacity-80' : 'cursor-pointer'} ${devices.light ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

            {/* 2. DEHUMIDIFIER (Gắn với biến 'ac' để gửi DEN2) */}
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
                  className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${waitingDevices.ac ? 'cursor-wait opacity-80' : 'cursor-pointer'} ${devices.ac ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

            {/* 3. SMART LIGHT (Toggle ON/OFF + nút AUTO) */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-3">
              {/* Smart Light ON/OFF Toggle */}
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
                  className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${waitingDevices.plug ? 'cursor-wait opacity-80' : 'cursor-pointer'} ${devices.plug ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>

              {/* AUTO Mode Button */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500 flex-1">Auto Mode</span>
                <button
                  onClick={handleSmartLightAuto}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${smartLightAuto
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {smartLightAuto ? '🔄 AUTO ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* 4. SMART TV */}
            <div className="border border-slate-100 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${devices.tv ? 'bg-purple-50 text-purple-600' : 'bg-slate-100'}`}><Tv size={20} /></div>
                  <div>
                    <div className="font-medium text-sm">Smart TV</div>
                    <div className="text-xs text-slate-400">{waitingDevices.tv ? 'WAITING' : devices.tv ? 'ON' : 'OFF'}</div>
                  </div>
                </div>
                <div
                  onClick={() => !waitingDevices.tv && handleToggle('tv')}
                  className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${waitingDevices.tv ? 'cursor-wait opacity-80' : 'cursor-pointer'} ${devices.tv ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

            {/* 5. WATER PUMP */}
            <div className="border border-slate-100 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${devices.pump ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100'}`}><Droplets size={20} /></div>
                  <div>
                    <div className="font-medium text-sm">Water Pump</div>
                    <div className="text-xs text-slate-400">{waitingDevices.pump ? 'WAITING' : devices.pump ? 'ON' : 'OFF'}</div>
                  </div>
                </div>
                <div
                  onClick={() => !waitingDevices.pump && handleToggle('pump')}
                  className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${waitingDevices.pump ? 'cursor-wait opacity-80' : 'cursor-pointer'} ${devices.pump ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Làm tròn 1 chữ số thập phân, bỏ .0 nếu là số nguyên
const formatValue = (valueStr) => {
  if (!valueStr) return valueStr;
  const match = valueStr.match(/^([\d.]+)(.*)/);
  if (!match) return valueStr;
  const num = parseFloat(match[1]);
  const rounded = Number.isInteger(num) ? num.toString() : num.toFixed(1);
  return `${rounded}${match[2]}`;
};

const SENSOR_THRESHOLDS_FE = {
  Temperature: [15, 35],
  Humidity: [30, 70],
  Light: [0, 1000],
};
const getSensorStatus = (sensor, value) => {
  const t = SENSOR_THRESHOLDS_FE[sensor];
  if (!t) return 'Normal';
  if (value < t[0]) return 'Low';
  if (value > t[1]) return 'High';
  return 'Normal';
};

// --- TRANG 2: SENSOR DATA HISTORY ---
const SensorHistory = ({ searchTerm = "" }) => {
  const [filters, setFilters] = useState({
    startTime: "",
    endTime: "",
    sensor: "All",
    status: "All"
  });
  const [showFilter, setShowFilter] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState("all");

  useEffect(() => {
    fetch(buildApiUrl('/api/sensors/history'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data);
        else setHistory([]);
      })
      .catch(err => console.error("Lỗi:", err));
  }, []);

  // SSE: cập nhật realtime khi có sensor mới từ ESP
  useEffect(() => {
    const eventSource = new EventSource(buildApiUrl('/api/events'));
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'mqtt_message' || !data.payload) return;
        const { topic, payload } = data.payload;
        if (topic !== 'iot/ningyao/sensor') return;
        const json = JSON.parse(payload);
        const now = new Date();
        const timeStr = now.toLocaleDateString('en-CA').replace(/-/g, '/') + ' ' +
          now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const newRows = [
          { id: `rt-${now.getTime()}-t`, time: timeStr, sensor: 'Temperature', value: `${parseFloat(json.temperature).toFixed(1)}°C`, status: getSensorStatus('Temperature', json.temperature) },
          { id: `rt-${now.getTime()}-h`, time: timeStr, sensor: 'Humidity',    value: `${parseFloat(json.humidity).toFixed(1)}%`,  status: getSensorStatus('Humidity', json.humidity) },
          { id: `rt-${now.getTime()}-l`, time: timeStr, sensor: 'Light',       value: `${Math.round(json.light_sensor)}Lux`,        status: getSensorStatus('Light', json.light_sensor) },
        ];
        setHistory(prev => [...newRows, ...prev].slice(0, 200));
      } catch { /* ignore */ }
    };
    return () => eventSource.close();
  }, []);

  // ==========================================
  // 1. LOGIC LỌC VÀ SẮP XẾP (MỚI NHẤT LÊN ĐẦU)
  // ==========================================
  const filteredHistory = history
    .filter(row => {
      // Search filter based on searchType
      let matchesSearch = true;
      const searchLower = searchInput.toLowerCase();

      if (searchInput) {
        if (searchType === "all") {
          matchesSearch = (row.time && row.time.toLowerCase().includes(searchLower)) ||
            (row.sensor && row.sensor.toLowerCase().includes(searchLower)) ||
            (row.value && row.value.toLowerCase().includes(searchLower));
        } else if (searchType === "time") {
          matchesSearch = row.time && row.time.toLowerCase().includes(searchLower);
        } else if (searchType === "sensor") {
          matchesSearch = row.sensor && row.sensor.toLowerCase().includes(searchLower);
        } else if (searchType === "value") {
          matchesSearch = row.value && row.value.toLowerCase().includes(searchLower);
        }
      }

      const matchesSensor = filters.sensor === "All" || row.sensor === filters.sensor;
      let matchesTime = true;
      if (filters.startTime || filters.endTime) {
        const rowDate = new Date(row.time.replace(/\//g, '-'));
        if (filters.startTime && rowDate < new Date(filters.startTime)) matchesTime = false;
        if (filters.endTime && rowDate > new Date(filters.endTime)) matchesTime = false;
      }
      return matchesSearch && matchesSensor && matchesTime;
    })
    // Tự động sắp xếp: Thời gian mới nhất hiện ở STT số 1
    .sort((a, b) => new Date(b.time.replace(/\//g, '-')) - new Date(a.time.replace(/\//g, '-')));

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filters, itemsPerPage, searchInput, searchType]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getVisiblePages = () => {
    if (totalPages === 0) return [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) { start = Math.max(1, end - 4); }
    const pages = [];
    for (let i = start; i <= end; i++) { pages.push(i); }
    return pages;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col min-h-[600px]">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Sensor Data History</h2>
          <div className="flex items-center space-x-2">
            {(filters.sensor !== "All" || filters.startTime || filters.endTime || searchInput) && (
              <button onClick={() => {
                setFilters({ startTime: "", endTime: "", sensor: "All", status: "All" });
                setSearchInput("");
              }}
                className="text-xs text-red-500 hover:text-red-700 font-bold bg-red-50 px-2 py-1 rounded-lg transition-colors">
                Xóa tất cả ✕
              </button>
            )}
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-teal-500 transition cursor-pointer">
              <option value={5}>5 dòng</option>
              <option value={7}>7 dòng</option>
              <option value={10}>10 dòng</option>
              <option value={15}>15 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex gap-2">
            <select value={searchType} onChange={(e) => setSearchType(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-teal-500 transition cursor-pointer">
              <option value="all">Tìm tất cả</option>
              <option value="time">Tìm theo thời gian</option>
              <option value="sensor">Tìm theo loại cảm biến</option>
              <option value="value">Tìm theo giá trị</option>
            </select>
            <input
              type="text"
              placeholder={
                searchType === "time" ? "VD: 2026/04/12 11:22:33 PM (copy từ bảng)" :
                  searchType === "sensor" ? "VD: Temperature, Humidity..." :
                    searchType === "value" ? "VD: 25.5, 60..." :
                      "Nhập từ khóa..."
              }
              value={searchInput}
              onChange={(e) => setSearchInput(normalizeSearchValue(e.target.value))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (looksLikeDateTime(pasted)) setSearchType('time');
              }}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 transition"
            />
          </div>
          {searchInput && (
            <button onClick={() => setSearchInput("")}
              className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100">
              <th className="pb-4 font-semibold w-16">STT</th>
              <th className="pb-4 font-semibold relative">
                <div className="flex items-center space-x-2">
                  <span>TIMESTAMP</span>
                  <button onClick={() => setShowFilter(showFilter === 'time' ? null : 'time')}>
                    <Filter size={14} className={filters.startTime || filters.endTime ? 'text-blue-500' : ''} />
                  </button>
                </div>
                {showFilter === 'time' && (
                  <div className="absolute top-10 left-0 z-50 p-4 bg-white border border-slate-200 shadow-xl rounded-xl w-64 text-slate-600">
                    <div className="space-y-2 text-xs">
                      <label className="font-bold">Từ:</label>
                      <input type="datetime-local" step="1" className="w-full border p-2 rounded"
                        value={filters.startTime} onChange={(e) => setFilters({ ...filters, startTime: e.target.value })} />
                      <label className="font-bold">Đến:</label>
                      <input type="datetime-local" step="1" className="w-full border p-2 rounded"
                        value={filters.endTime} onChange={(e) => setFilters({ ...filters, endTime: e.target.value })} />
                      <button onClick={() => setShowFilter(null)} className="w-full py-2 bg-blue-500 text-white rounded-lg mt-2 font-bold">Lọc ngay</button>
                    </div>
                  </div>
                )}
              </th>
              <th className="pb-4 font-semibold relative">
                <div className="flex items-center space-x-2">
                  <span>SENSOR NAME</span>
                  <button onClick={() => setShowFilter(showFilter === 'sensor' ? null : 'sensor')}>
                    <Filter size={14} className={filters.sensor !== "All" ? 'text-blue-500' : ''} />
                  </button>
                </div>
                {showFilter === 'sensor' && (
                  <div className="absolute top-10 left-0 z-50 p-2 bg-white border shadow-xl rounded-lg w-40">
                    <select className="w-full text-xs p-1" value={filters.sensor}
                      onChange={(e) => { setFilters({ ...filters, sensor: e.target.value }); setShowFilter(null); }}>
                      <option value="All">Tất cả</option>
                      <option value="Temperature">Temperature</option>
                      <option value="Humidity">Humidity</option>
                      <option value="Light">Light</option>
                    </select>
                  </div>
                )}
              </th>
              <th className="pb-4 font-semibold">VALUE</th>
              <th className="pb-4 font-semibold text-right">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-20 text-slate-400">Không có dữ liệu phù hợp</td></tr>
            ) : (
              currentItems.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                  <td className="py-4 text-slate-600">{row.time}</td>
                  <td className="py-4 font-semibold text-slate-700">{row.sensor}</td>
                  <td className="py-4 font-bold text-slate-800">{formatValue(row.value)}</td>
                  <td className="py-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${row.status === 'Normal' ? 'text-emerald-500 bg-emerald-50 border border-emerald-100' :
                        row.status === 'High' ? 'text-red-500 bg-red-50 border border-red-100' :
                          row.status === 'Low' ? 'text-blue-500 bg-blue-50 border border-blue-100' :
                            'text-gray-500 bg-gray-50 border border-gray-100'
                      }`}>
                      ● {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredHistory.length > 0 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 flex-wrap gap-4">
          <span className="text-sm text-slate-500">
            Hiển thị {indexOfFirstItem + 1} đến {Math.min(indexOfLastItem, filteredHistory.length)} / {filteredHistory.length}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition mr-1"
            >
              <ChevronLeft size={18} />
            </button>
            {getVisiblePages().map(number => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === number ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {number}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition ml-1"
            >
              <ChevronRight size={18} />
            </button>
            <div className="flex items-center ml-4 pl-4 border-l border-slate-200">
              <span className="text-sm text-slate-500 mr-2 hidden sm:inline">Đến:</span>
              <input
                type="number"
                className="w-16 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    let p = parseInt(e.target.value);
                    if (p >= 1 && p <= totalPages) setCurrentPage(p);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- TRANG 3: DEVICE ACTIVITY HISTORY (NÂNG CẤP PHÂN TRANG & TÌM KIẾM) ---
const DeviceHistory = ({ searchTerm = "" }) => {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState("all"); // all, device, action, time

  useEffect(() => {
    fetch(buildApiUrl('/api/devices/history'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
        else setLogs([]);
      })
      .catch(err => console.error("Lỗi lấy lịch sử thiết bị:", err));
  }, []);

  // 1. LOGIC TÌM KIẾM: Lọc theo nhiều trường khác nhau
  const filteredLogs = logs.filter(row => {
    let matchesSearch = true;
    const searchLower = searchInput.toLowerCase();

    if (searchInput) {
      if (searchType === "all") {
        matchesSearch = (row.device && row.device.toLowerCase().includes(searchLower)) ||
          (row.action && row.action.toLowerCase().includes(searchLower)) ||
          (row.time && row.time.toLowerCase().includes(searchLower));
      } else if (searchType === "device") {
        matchesSearch = row.device && row.device.toLowerCase().includes(searchLower);
      } else if (searchType === "action") {
        matchesSearch = row.action && row.action.toLowerCase().includes(searchLower);
      } else if (searchType === "time") {
        matchesSearch = row.time && row.time.toLowerCase().includes(searchLower);
      }
    }

    return matchesSearch;
  });

  // 2. Reset về trang 1 khi gõ tìm kiếm mới hoặc thay đổi itemsPerPage
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, searchInput, searchType]);

  // 3. LOGIC PHÂN TRANG
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getVisiblePages = () => {
    if (totalPages === 0) return [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    const pages = [];
    for (let i = start; i <= end; i++) {
      if (i >= 1) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Device Activity History</h2>
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-teal-500 transition cursor-pointer">
            <option value={5}>5 dòng</option>
            <option value={7}>7 dòng</option>
            <option value={10}>10 dòng</option>
            <option value={15}>15 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex gap-2">
            <select value={searchType} onChange={(e) => setSearchType(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-teal-500 transition cursor-pointer">
              <option value="all">Tìm tất cả</option>
              <option value="device">Tìm theo thiết bị</option>
              <option value="action">Tìm theo hành động</option>
              <option value="time">Tìm theo thời gian</option>
            </select>
            <input
              type="text"
              placeholder={
                searchType === "device" ? "VD: Smart Light, Air Conditioner..." :
                  searchType === "action" ? "VD: ON, OFF, AUTO..." :
                    searchType === "time" ? "VD: 2026/04/12 11:22:33 PM (copy từ bảng)" :
                      "Nhập từ khóa..."
              }
              value={searchInput}
              onChange={(e) => setSearchInput(normalizeSearchValue(e.target.value))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (looksLikeDateTime(pasted)) setSearchType('time');
              }}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 transition"
            />
          </div>
          {searchInput && (
            <button onClick={() => setSearchInput("")}
              className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100">
              <th className="pb-3 font-semibold text-left">STT</th>
              <th className="h-10 font-semibold">TIMESTAMP</th>
              <th className="h-10 font-semibold">DEVICE NAME</th>
              <th className="h-10 font-semibold">ACTION</th>
              <th className="h-10 font-semibold text-right">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr><td colSpan="5" className="text-center text-slate-400 py-10">Không tìm thấy lịch sử phù hợp</td></tr>
            ) : (
              currentItems.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-4 text-slate-500 font-medium">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                  <td className="py-4 text-slate-600">{row.time}</td>
                  <td className="py-4 font-semibold text-slate-700">{row.device}</td>
                  <td className="py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${row.action === 'ON' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{row.action}</span></td>
                  <td className="py-4 text-right">
                    <span className="text-emerald-500 font-bold text-[10px] flex items-center justify-end">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* BỘ PHÂN TRANG (GIỐNG HỆT TRANG 2) */}
      {filteredLogs.length > 0 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 flex-wrap gap-4">
          <span className="text-sm text-slate-500">
            Hiển thị {indexOfFirstItem + 1} đến {Math.min(indexOfLastItem, filteredLogs.length)} / {filteredLogs.length}
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition mr-1"
            >
              <ChevronLeft size={18} />
            </button>

            {getVisiblePages().map(number => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === number
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
              >
                {number}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition ml-1"
            >
              <ChevronRight size={18} />
            </button>

            <div className="flex items-center ml-4 pl-4 border-l border-slate-200">
              <span className="text-sm text-slate-500 mr-2 hidden sm:inline">Đến:</span>
              <input
                type="number"
                placeholder="Trang"
                className="w-16 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    let p = parseInt(e.target.value);
                    if (p >= 1 && p <= totalPages) setCurrentPage(p);
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- TRANG 4: PROFILE & RESOURCES (BẢN THEO MẪU IMAGE_BC207F) ---
const Profile = () => (
  <div className="max-w-5xl mx-auto space-y-6">
    {/* PHẦN 1: STUDENT INFORMATION */}
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <div className="flex items-center space-x-3 mb-8">
        <div className="bg-teal-50 p-2.5 rounded-xl text-teal-700">
          <IdCard size={24} />
        </div>
        <div>
          <h2 className="font-bold text-lg text-slate-800">Student Information</h2>
          <p className="text-xs text-slate-400">Academic and personal profile details</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Khung ảnh chân dung */}
        <div className="flex flex-col items-center">
          <div className="w-44 h-52 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 relative overflow-hidden group">
            <img
              src="/avatar.png"

              className="object-cover w-full h-full z-10"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <User className="absolute z-0 text-slate-200" size={64} />
          </div>
        </div>

        {/* Cột thông tin chi tiết */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name (Họ tên)</label>
            <input type="text" readOnly value="MAI THU TRANG" className="w-full bg-slate-50/80 p-3 rounded-xl text-sm border border-slate-100 text-slate-700 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Student ID (Mã sinh viên)</label>
            <input type="text" readOnly value="B22DCPT288" className="w-full bg-slate-50/80 p-3 rounded-xl text-sm border border-slate-100 text-slate-700 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Class (Lớp)</label>
            <input type="text" readOnly value="D22PTDPT02" className="w-full bg-slate-50/80 p-3 rounded-xl text-sm border border-slate-100 text-slate-700 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date of Birth (Ngày sinh)</label>
            <input type="text" readOnly value="19/12/2004" className="w-full bg-slate-50/80 p-3 rounded-xl text-sm border border-slate-100 text-slate-700 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Phone Number (Số điện thoại)</label>
            <input type="text" readOnly value="0337190635" className="w-full bg-slate-50/80 p-3 rounded-xl text-sm border border-slate-100 text-slate-700 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
            <input type="text" readOnly value="Mtranng1912@gmail.com" className="w-full bg-slate-50/80 p-3 rounded-xl text-sm border border-slate-100 text-slate-700 focus:outline-none" />
          </div>
        </div>
      </div>
    </div>

    {/* PHẦN 2: PROJECT RESOURCES */}
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <div className="flex items-center space-x-3 mb-8">
        <div className="bg-teal-50 p-2.5 rounded-xl text-teal-700">
          <FolderKanban size={24} />
        </div>
        <div>
          <h2 className="font-bold text-lg text-slate-800">Project Resources</h2>
          <p className="text-sm text-slate-400">Access and download technical project assets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Figma */}
        <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 hover:border-teal-200 transition-all shadow-sm shadow-slate-100/50">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-pink-50 text-pink-500 rounded-xl"><Figma size={20} /></div>
            <div>
              <div className="font-bold text-sm text-slate-700">Figma File</div>
              <div className="text-[11px] text-slate-400">UI/UX Design Assets</div>
            </div>
          </div>
          <button className="px-5 py-1.5 bg-white text-teal-700 border border-teal-100 rounded-full font-bold text-xs hover:bg-teal-50 transition">View Online</button>
        </div>

        {/* PDF Report */}
        <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 hover:border-teal-200 transition-all shadow-sm shadow-slate-100/50">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-red-50 text-red-500 rounded-xl"><FileText size={20} /></div>
            <div>
              <div className="font-bold text-sm text-slate-700">PDF Report</div>
              <div className="text-[11px] text-slate-400">Project Analysis v1.2</div>
            </div>
          </div>
          <button className="px-5 py-1.5 bg-white text-teal-700 border border-teal-100 rounded-full font-bold text-xs hover:bg-teal-50 transition">View Online</button>
        </div>


        <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-4">
            {/* Icon tờ giấy */}
            <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-700">API Documentation</div>
              <div className="text-[11px] text-slate-400">Integration Guidelines</div>
            </div>
          </div>


          <a
            href="/APIDoc_IOTSmartHome.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-1.5 bg-white text-teal-700 border border-teal-100 rounded-full font-bold text-xs hover:bg-teal-50 transition cursor-pointer"
          >
            View Online
          </a>
        </div>

        {/* Github */}
        <div className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-100 hover:border-teal-200 transition-all shadow-sm shadow-slate-100/50">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl"><CodeXml size={20} /></div>
            <div>
              <div className="font-bold text-sm text-slate-700">GitHub Repository</div>
              <div className="text-[11px] text-slate-400">Source Code & README</div>
            </div>
          </div>
          <button className="px-5 py-1.5 bg-white text-teal-700 border border-teal-100 rounded-full font-bold text-xs hover:bg-teal-50 transition">View Online</button>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex justify-end space-x-4 mt-12 pt-4">
        <button className="px-10 py-3 bg-white text-slate-500 border border-slate-200 rounded-full font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
        <button className="px-10 py-3 bg-teal-700 text-white rounded-full font-bold text-sm hover:bg-teal-800 shadow-lg shadow-teal-700/20 transition flex items-center">
          Save Changes
        </button>
      </div>
    </div>
  </div>
);

// --- TRANG 5: DEVICE STATISTICS ---
const DEVICE_COLORS = {
  'Air Conditioner': '#60a5fa',
  'Dehumidifier':    '#2dd4bf',
  'Smart Light':     '#fbbf24',
  'Smart TV':        '#a78bfa',
  'Water Pump':      '#34d399',
};
const DEVICES = Object.keys(DEVICE_COLORS);

const StatsPage = () => {
  const [days, setDays] = useState(7);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(buildApiUrl(`/api/stats/device-toggles?days=${days}`))
      .then(res => res.json())
      .then(json => { setData(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const formatDate = (d) => {
    const parts = d.split('/');
    return `${parts[2]}/${parts[1]}`;
  };

  const chartData = data.map(row => ({ ...row, date: formatDate(row.date) }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Device Toggle Statistics</h2>
            <p className="text-xs text-slate-400 mt-1">Số lần bật/tắt mỗi thiết bị theo ngày</p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${days === d ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {d} ngày
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center text-slate-400">Đang tải...</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                {DEVICES.map(device => (
                  <Bar key={device} dataKey={device} fill={DEVICE_COLORS[device]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bảng tổng hợp */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Tổng số lần bật/tắt ({days} ngày qua)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {DEVICES.map(device => {
            const total = data.reduce((sum, row) => sum + (row[device] || 0), 0);
            return (
              <div key={device} className="p-4 rounded-xl border border-slate-100 text-center">
                <div className="text-2xl font-bold" style={{ color: DEVICE_COLORS[device] }}>{total}</div>
                <div className="text-xs text-slate-500 mt-1">{device}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN LAYOUT & ROUTING (Giữ nguyên bản gốc)
// ==========================================
const Layout = ({ children, globalSearch, setGlobalSearch }) => {
  const location = useLocation();
  const navItems = [
    { path: '/',        label: 'Dashboard',              icon: LayoutDashboard },
    { path: '/sensor',  label: 'Sensor Data History',    icon: LineChartIcon },
    { path: '/activity',label: 'Device Activity History',icon: ListOrdered },
    { path: '/stats',   label: 'Device Statistics',      icon: BarChart2 },
    { path: '/profile', label: 'Profile',                icon: User },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <div className="bg-teal-700 text-white p-1.5 rounded-lg"><Lightbulb size={24} /></div>
          <div><h1 className="font-bold text-slate-800 tracking-tight">SmartHome</h1><p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">System Online</p></div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shrink-0">
          <div></div>
          <div className="flex items-center space-x-3">
            <div className="text-right text-xs">
              <div className="font-bold uppercase">MAITHUTRANG</div>
              <div className="text-slate-400">B22DCPT288</div>
            </div>
            {/* Đây là chỗ lấy lại ảnh của bạn nè */}
            <img
              src="/avatar.png"
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
              onError={(e) => {
                // Nếu không tìm thấy file ảnh, nó sẽ hiện vòng tròn xanh chữ MT như cũ cho đỡ lỗi
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />

          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
};

export default function App() {
  const [globalSearch, setGlobalSearch] = useState('');
  return (
    <BrowserRouter>
      <Layout globalSearch={globalSearch} setGlobalSearch={setGlobalSearch}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sensor" element={<SensorHistory searchTerm={globalSearch} />} />
          <Route path="/activity" element={<DeviceHistory searchTerm={globalSearch} />} />
          <Route path="/stats"    element={<StatsPage />} />
          <Route path="/profile"  element={<Profile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

