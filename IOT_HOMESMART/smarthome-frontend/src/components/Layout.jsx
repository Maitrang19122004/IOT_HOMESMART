import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lightbulb, LayoutDashboard, LineChart as LineChartIcon, ListOrdered, User } from 'lucide-react';

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/sensor', label: 'Sensor Data History', icon: LineChartIcon },
    { path: '/activity', label: 'Device Activity History', icon: ListOrdered },
    { path: '/profile', label: 'Profile', icon: User },
];

const Layout = ({ children }) => {
    const location = useLocation();

    return (
        <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
                    <div className="bg-teal-700 text-white p-1.5 rounded-lg"><Lightbulb size={24} /></div>
                    <div>
                        <h1 className="font-bold text-slate-800 tracking-tight">SmartHome</h1>
                        <p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">System Online</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-8 shrink-0">
                    <div />
                    <div className="flex items-center space-x-3">
                        <div className="text-right text-xs">
                            <div className="font-bold uppercase">MAITHUTRANG</div>
                            <div className="text-slate-400">B22DCPT288</div>
                        </div>
                        <img
                            src="/avatar.png"
                            alt="Profile"
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">{children}</div>
            </main>
        </div>
    );
};

export default Layout;
