import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { apiClient } from '../services/api';
import { normalizeSearchValue, looksLikeDateTime } from '../utils/helpers';

const SensorHistory = ({ searchTerm = '' }) => {
    const [filters, setFilters] = useState({ startTime: '', endTime: '', sensor: 'All', status: 'All' });
    const [showFilter, setShowFilter] = useState(null);
    const [history, setHistory] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(7);
    const [searchInput, setSearchInput] = useState('');
    const [searchType, setSearchType] = useState('all');

    useEffect(() => {
        apiClient.getSensorHistory()
            .then(data => { if (Array.isArray(data)) setHistory(data); else setHistory([]); })
            .catch(err => console.error('Lỗi:', err));
    }, []);

    const filteredHistory = history
        .filter(row => {
            let matchesSearch = true;
            const searchLower = searchInput.toLowerCase();

            if (searchInput) {
                if (searchType === 'all') {
                    matchesSearch = (row.time && row.time.toLowerCase().includes(searchLower)) ||
                        (row.sensor && row.sensor.toLowerCase().includes(searchLower)) ||
                        (row.value && row.value.toLowerCase().includes(searchLower));
                } else if (searchType === 'time') {
                    matchesSearch = row.time && row.time.toLowerCase().includes(searchLower);
                } else if (searchType === 'sensor') {
                    matchesSearch = row.sensor && row.sensor.toLowerCase().includes(searchLower);
                } else if (searchType === 'value') {
                    matchesSearch = row.value && row.value.toLowerCase().includes(searchLower);
                }
            }

            const matchesSensor = filters.sensor === 'All' || row.sensor === filters.sensor;
            let matchesTime = true;
            if (filters.startTime || filters.endTime) {
                const rowDate = new Date(row.time.replace(/\//g, '-'));
                if (filters.startTime && rowDate < new Date(filters.startTime)) matchesTime = false;
                if (filters.endTime && rowDate > new Date(filters.endTime)) matchesTime = false;
            }
            return matchesSearch && matchesSensor && matchesTime;
        })
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
        for (let i = start; i <= end; i += 1) { pages.push(i); }
        return pages;
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col min-h-[600px]">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Sensor Data History</h2>
                    <div className="flex items-center space-x-2">
                        {(filters.sensor !== 'All' || filters.startTime || filters.endTime || searchInput) && (
                            <button
                                onClick={() => {
                                    setFilters({ startTime: '', endTime: '', sensor: 'All', status: 'All' });
                                    setSearchInput('');
                                }}
                                className="text-xs text-red-500 hover:text-red-700 font-bold bg-red-50 px-2 py-1 rounded-lg transition-colors"
                            >
                                Xóa tất cả ✕
                            </button>
                        )}
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
                            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-teal-500 transition cursor-pointer"
                        >
                            <option value={5}>5 dòng</option>
                            <option value={7}>7 dòng</option>
                            <option value={10}>10 dòng</option>
                            <option value={15}>15 dòng</option>
                            <option value={20}>20 dòng</option>
                            <option value={50}>50 dòng</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="flex-1 flex gap-2">
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-teal-500 transition cursor-pointer"
                        >
                            <option value="all">Tìm tất cả</option>
                            <option value="time">Tìm theo thời gian</option>
                            <option value="sensor">Tìm theo loại cảm biến</option>
                            <option value="value">Tìm theo giá trị</option>
                        </select>
                        <input
                            type="text"
                            placeholder={
                                searchType === 'time' ? 'VD: 2026/04/12 11:22:33 PM (copy từ bảng)' :
                                    searchType === 'sensor' ? 'VD: Temperature, Humidity...' :
                                        searchType === 'value' ? 'VD: 25.5, 60...' :
                                            'Nhập từ khóa...'
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
                        <button
                            onClick={() => setSearchInput('')}
                            className="px-2 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
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
                                            <input
                                                type="datetime-local"
                                                step="1"
                                                className="w-full border p-2 rounded"
                                                value={filters.startTime}
                                                onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
                                            />
                                            <label className="font-bold">Đến:</label>
                                            <input
                                                type="datetime-local"
                                                step="1"
                                                className="w-full border p-2 rounded"
                                                value={filters.endTime}
                                                onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                                            />
                                            <button
                                                onClick={() => setShowFilter(null)}
                                                className="w-full py-2 bg-blue-500 text-white rounded-lg mt-2 font-bold"
                                            >
                                                Lọc ngay
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </th>
                            <th className="pb-4 font-semibold relative">
                                <div className="flex items-center space-x-2">
                                    <span>SENSOR NAME</span>
                                    <button onClick={() => setShowFilter(showFilter === 'sensor' ? null : 'sensor')}>
                                        <Filter size={14} className={filters.sensor !== 'All' ? 'text-blue-500' : ''} />
                                    </button>
                                </div>
                                {showFilter === 'sensor' && (
                                    <div className="absolute top-10 left-0 z-50 p-2 bg-white border shadow-xl rounded-lg w-40">
                                        <select
                                            className="w-full text-xs p-1"
                                            value={filters.sensor}
                                            onChange={(e) => { setFilters({ ...filters, sensor: e.target.value }); setShowFilter(null); }}
                                        >
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
                                    <td className="py-4 font-bold text-slate-800">{row.value}</td>
                                    <td className="py-4 text-right">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${row.status === 'Normal' ? 'text-emerald-500 bg-emerald-50 border border-emerald-100' : row.status === 'High' ? 'text-red-500 bg-red-50 border border-red-100' : row.status === 'Low' ? 'text-blue-500 bg-blue-50 border border-blue-100' : 'text-gray-500 bg-gray-50 border border-gray-100'}`}>
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
                    <span className="text-sm text-slate-500">Hiển thị {indexOfFirstItem + 1} đến {Math.min(indexOfLastItem, filteredHistory.length)} / {filteredHistory.length}</span>
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
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === number ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
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
                                        const p = parseInt(e.target.value, 10);
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

export default SensorHistory;
