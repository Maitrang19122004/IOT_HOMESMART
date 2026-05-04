import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../services/api';
import { normalizeSearchValue, looksLikeDateTime } from '../utils/helpers';

const DeviceHistory = ({ searchTerm = '' }) => {
    const [logs, setLogs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(7);
    const [searchInput, setSearchInput] = useState('');
    const [searchType, setSearchType] = useState('all');

    useEffect(() => {
        apiClient.getDeviceHistory()
            .then(data => { if (Array.isArray(data)) setLogs(data); else setLogs([]); })
            .catch(err => console.error('Lỗi lấy lịch sử thiết bị:', err));
    }, []);

    const filteredLogs = logs.filter((row) => {
        let matchesSearch = true;
        const searchLower = searchInput.toLowerCase();

        if (searchInput) {
            if (searchType === 'all') {
                matchesSearch = (row.device && row.device.toLowerCase().includes(searchLower)) ||
                    (row.action && row.action.toLowerCase().includes(searchLower)) ||
                    (row.time && row.time.toLowerCase().includes(searchLower));
            } else if (searchType === 'device') {
                matchesSearch = row.device && row.device.toLowerCase().includes(searchLower);
            } else if (searchType === 'action') {
                matchesSearch = row.action && row.action.toLowerCase().includes(searchLower);
            } else if (searchType === 'time') {
                matchesSearch = row.time && row.time.toLowerCase().includes(searchLower);
            }
        }

        return matchesSearch;
    });

    useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage, searchInput, searchType]);

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
        for (let i = start; i <= end; i += 1) pages.push(i);
        return pages;
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Device Activity History</h2>
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

                <div className="flex gap-2 items-center">
                    <div className="flex-1 flex gap-2">
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-teal-500 transition cursor-pointer"
                        >
                            <option value="all">Tìm tất cả</option>
                            <option value="device">Tìm theo thiết bị</option>
                            <option value="action">Tìm theo hành động</option>
                            <option value="time">Tìm theo thời gian</option>
                        </select>
                        <input
                            type="text"
                            placeholder={
                                searchType === 'device' ? 'VD: Smart Light, Air Conditioner...' :
                                    searchType === 'action' ? 'VD: ON, OFF, AUTO...' :
                                        searchType === 'time' ? 'VD: 2026/04/12 11:22:33 PM (copy từ bảng)' :
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

            {filteredLogs.length > 0 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 flex-wrap gap-4">
                    <span className="text-sm text-slate-500">Hiển thị {indexOfFirstItem + 1} đến {Math.min(indexOfLastItem, filteredLogs.length)} / {filteredLogs.length}</span>
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
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === number ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
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

export default DeviceHistory;
