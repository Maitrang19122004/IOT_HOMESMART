import React from 'react';
import { IdCard, User, FolderKanban, Figma, FileText, CodeXml } from 'lucide-react';

const Profile = () => (
  <div className="max-w-5xl mx-auto space-y-6">
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <div className="flex items-center space-x-3 mb-8">
        <div className="bg-teal-50 p-2.5 rounded-xl text-teal-700"><IdCard size={24} /></div>
        <div>
          <h2 className="font-bold text-lg text-slate-800">Student Information</h2>
          <p className="text-xs text-slate-400">Academic and personal profile details</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        <div className="flex flex-col items-center">
          <div className="w-44 h-52 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 relative overflow-hidden group">
            <img
              src="/avatar.png"
              className="object-cover w-full h-full z-10"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <User className="absolute z-0 text-slate-200" size={64} />
          </div>
        </div>

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

    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <div className="flex items-center space-x-3 mb-8">
        <div className="bg-teal-50 p-2.5 rounded-xl text-teal-700"><FolderKanban size={24} /></div>
        <div>
          <h2 className="font-bold text-lg text-slate-800">Project Resources</h2>
          <p className="text-sm text-slate-400">Access and download technical project assets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl"><FileText size={20} /></div>
            <div>
              <div className="font-bold text-sm text-slate-700">API Documentation</div>
              <div className="text-[11px] text-slate-400">Integration Guidelines</div>
            </div>
          </div>
          <a
            href="https://documenter.getpostman.com/view/50583409/2sBXiqE8gy#48fd613f-f77e-407d-9684-e828af6b2762"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-1.5 bg-white text-teal-700 border border-teal-100 rounded-full font-bold text-xs hover:bg-teal-50 transition cursor-pointer"
          >
            View Online
          </a>
        </div>

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

      <div className="flex justify-end space-x-4 mt-12 pt-4">
        <button className="px-10 py-3 bg-white text-slate-500 border border-slate-200 rounded-full font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
        <button className="px-10 py-3 bg-teal-700 text-white rounded-full font-bold text-sm hover:bg-teal-800 shadow-lg shadow-teal-700/20 transition flex items-center">Save Changes</button>
      </div>
    </div>
  </div>
);

export default Profile;
