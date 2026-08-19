import React from "react";
import { X, Bell } from "lucide-react";

export default function NotificationsModal({ isOpen, onClose, notifications }) {
  if (!isOpen) return null;

  const defaultNotifications = [
    { id: 1, title: "Speed Camera Warning", desc: "NH 44 Mile 235 camera in 200m", time: "2m ago", type: "warning" },
    { id: 2, title: "Weather Alert", desc: "Mild crosswinds reported near Yamuna bridge", time: "15m ago", type: "info" },
    { id: 3, title: "Safety Score Update", desc: "Safety streak achieved: 92/100 (+4 pts)", time: "1h ago", type: "success" }
  ];

  const list = notifications || defaultNotifications;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Driver Notifications</h2>
              <p className="text-xs text-slate-300 font-medium">Real-time alerts & safety telemetry updates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          {list.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-blue-300 shadow-2xs transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800">{item.title}</div>
                <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
