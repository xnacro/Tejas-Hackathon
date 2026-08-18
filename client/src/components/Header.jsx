import React, { useState } from "react";
import { Shield, CloudSun, Bell, ChevronDown, CheckCircle2 } from "lucide-react";

export default function Header({ profile, onOpenNotifications }) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <header className="relative w-full flex items-center justify-between px-6 py-3.5 z-30">
      {/* Left: Surakha Logo & AI Monitoring Badge */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/40">
            <Shield className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">Surakha</h1>
            </div>
            <p className="text-xs font-medium text-slate-500 tracking-wide">AI Driver Safety Co-Pilot</p>
          </div>
        </div>

        {/* AI Monitoring Active Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-emerald-700 tracking-wide">AI Monitoring Active</span>
        </div>
      </div>

      {/* Top Center Shield Top Tab Emblem */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 hidden md:block">
        <div className="relative px-8 py-2.5 bg-gradient-to-b from-blue-700 to-indigo-800 rounded-b-2xl shadow-xl shadow-blue-900/20 border-b border-x border-blue-400/30 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center">
            <Shield className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <span className="text-sm font-bold tracking-wider text-white uppercase">Surakha</span>
        </div>
      </div>

      {/* Right: Weather, Notifications & Driver Profile */}
      <div className="flex items-center gap-3.5">
        {/* Weather */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 border border-white shadow-xs backdrop-blur-md text-slate-700">
          <CloudSun className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold">{profile?.weather?.temp || "28°C"}</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-xl bg-white/80 hover:bg-white border border-white shadow-xs backdrop-blur-md text-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-700" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
            {profile?.notificationsCount || 3}
          </span>
        </button>

        {/* Driver Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-2xl bg-white/80 hover:bg-white border border-white shadow-xs backdrop-blur-md transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500/30 shadow-xs bg-slate-100 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                alt="Driver Rajesh Kumar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                {profile?.name || "Rajesh Kumar"}
              </div>
              <div className="text-[11px] font-medium text-slate-500 leading-tight">
                {profile?.role || "Truck Driver"}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-64 p-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-slate-100 mb-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Vehicle</div>
                <div className="text-sm font-bold text-slate-800">{profile?.vehicleNumber || "UP 32 BK 8921"}</div>
                <div className="text-xs text-slate-500">{profile?.vehicleType || "Tata Prima 4028.S (Heavy Commercial)"}</div>
              </div>
              <div className="p-2 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Shift Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active On-Duty
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>License Category:</span>
                  <span className="font-semibold text-slate-700">Commercial HMV</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
