import React, { useState } from "react";
import { Shield, CloudSun, Bell, ChevronDown, CheckCircle2, Zap, Play, RotateCcw } from "lucide-react";
import { useTrafficSafety } from "../context/TrafficSafetyContext";

export default function Header({ profile, onOpenNotifications }) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const { demoMode, switchDemoMode } = useTrafficSafety();

  return (
    <header className="relative w-full flex items-center justify-between px-4 sm:px-6 py-3.5 z-30">
      {/* Left: Surakha Logo & AI Monitoring Badge */}
      <div className="flex items-center gap-4 sm:gap-6">
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

        {/* Hackathon Demo Mode Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDemoDropdown(!showDemoDropdown)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs border cursor-pointer ${
              demoMode
                ? "bg-purple-600 text-white border-purple-500 shadow-purple-500/20 animate-pulse"
                : "bg-white/80 hover:bg-white text-slate-700 border-slate-200/80"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{demoMode ? `DEMO: ${demoMode}` : "Demo Simulator"}</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {showDemoDropdown && (
            <div className="absolute left-0 mt-2 w-60 p-2 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-slate-800">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>Hackathon Demo Scenarios</span>
                <Play className="w-3 h-3 text-purple-600" />
              </div>

              <div className="space-y-1 mt-1 text-xs font-semibold">
                <button
                  onClick={() => { switchDemoMode(null); setShowDemoDropdown(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                    !demoMode ? "bg-emerald-50 text-emerald-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span>🟢 Live Production Mode</span>
                  {!demoMode && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 rounded-md">Active</span>}
                </button>

                <button
                  onClick={() => { switchDemoMode("NORMAL"); setShowDemoDropdown(false); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <span>1. Safe Normal Driving (96%)</span>
                </button>

                <button
                  onClick={() => { switchDemoMode("OVERSPEED"); setShowDemoDropdown(false); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-amber-50 text-amber-700 text-left transition-colors cursor-pointer"
                >
                  <span>2. Speed Warning (+14 km/h)</span>
                </button>

                <button
                  onClick={() => { switchDemoMode("DROWSY"); setShowDemoDropdown(false); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-orange-50 text-orange-700 text-left transition-colors cursor-pointer"
                >
                  <span>3. Drowsiness Warning (78%)</span>
                </button>

                <button
                  onClick={() => { switchDemoMode("HAZARD"); setShowDemoDropdown(false); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-blue-50 text-blue-700 text-left transition-colors cursor-pointer"
                >
                  <span>4. Road Accident (1.8 km)</span>
                </button>

                <button
                  onClick={() => { switchDemoMode("CRITICAL"); setShowDemoDropdown(false); }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-rose-700 font-bold text-left transition-colors cursor-pointer"
                >
                  <span>5. 🔴 High-Risk Combined Risk</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Center Shield Emblem */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 hidden md:block">
        <div className="relative px-8 py-2.5 bg-gradient-to-b from-blue-700 to-indigo-800 rounded-b-2xl shadow-xl shadow-blue-900/20 border-b border-x border-blue-400/30 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center">
            <Shield className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <span className="text-sm font-bold tracking-wider text-white uppercase">Surakha</span>
        </div>
      </div>

      {/* Right: Weather, Notifications & Driver Profile */}
      <div className="flex items-center gap-3 sm:gap-3.5">
        {/* Weather */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-white shadow-xs backdrop-blur-md text-slate-700">
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
