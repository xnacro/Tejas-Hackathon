import React, { useState } from "react";
import { 
  Navigation, 
  CornerUpRight, 
  Volume2, 
  VolumeX, 
  Crosshair, 
  Plus, 
  Minus, 
  StopCircle,
  MapPin,
  AlertCircle
} from "lucide-react";

export default function LiveNavigationCard({ telemetry, onEndTrip }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isRecentered, setIsRecentered] = useState(true);

  return (
    <div className="flex flex-col gap-3.5 h-full">
      {/* Live Navigation Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <MapPin className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Live Navigation</h2>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
          <span>GPS Connected</span>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="relative w-full flex-1 min-h-[380px] lg:min-h-[460px] rounded-3xl overflow-hidden glass-panel border border-white shadow-lg bg-[#f1f5f9]">
        {/* Stylized Vector Highway Map */}
        <div 
          className="absolute inset-0 transition-transform duration-300 origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Map Grid / Topographic Background */}
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
              </pattern>
              <linearGradient id="routeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>

            {/* Background Base */}
            <rect width="100%" height="100%" fill="#f8fafc" />
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Minor roads */}
            <path d="M 40 400 L 220 180 L 400 80" stroke="#cbd5e1" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M 120 450 L 320 220 L 500 120" stroke="#f1f5f9" strokeWidth="12" fill="none" />
            <path d="M 120 450 L 320 220 L 500 120" stroke="#e2e8f0" strokeWidth="8" fill="none" />
            
            {/* NH 44 Main Arterial Highway Corridor */}
            <path d="M 280 480 L 310 320 L 325 180 L 340 60" stroke="#e2e8f0" strokeWidth="22" fill="none" strokeLinecap="round" />
            <path d="M 280 480 L 310 320 L 325 180 L 340 60" stroke="#fde047" strokeWidth="14" fill="none" strokeLinecap="round" />

            {/* Active Blue Navigation Route */}
            <path 
              d="M 305 350 L 310 320 L 325 180 L 340 60" 
              stroke="url(#routeGrad)" 
              strokeWidth="7" 
              fill="none" 
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-md"
            />

            {/* Waypoint Direction Arrows on Path */}
            <circle cx="316" cy="260" r="4" fill="#1d4ed8" />
            <circle cx="328" cy="140" r="4" fill="#1d4ed8" />

            {/* Speed Limit Marker (60) */}
            <g transform="translate(250, 200)">
              <circle cx="16" cy="16" r="16" fill="#ffffff" stroke="#ef4444" strokeWidth="3.5" className="drop-shadow-md" />
              <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f172a" fontFamily="sans-serif">60</text>
            </g>

            {/* Toll Plaza Marker */}
            <g transform="translate(320, 220)">
              <rect x="0" y="0" width="85" height="26" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" className="drop-shadow-sm" />
              <text x="8" y="17" fontSize="10" fontWeight="bold" fill="#1e293b">Toll Plaza 2</text>
              <text x="64" y="17" fontSize="9" fontWeight="medium" fill="#64748b">2 km</text>
            </g>

            {/* Road Number Shield (NH 44) */}
            <g transform="translate(220, 360)">
              <rect x="0" y="0" width="34" height="18" rx="4" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
              <text x="17" y="13" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#713f12">NH 44</text>
            </g>

            {/* Current Vehicle GPS Marker with Direction Cone */}
            <g transform="translate(305, 350)">
              <circle cx="0" cy="0" r="22" fill="#3b82f6" fillOpacity="0.2" className="animate-ping" />
              <circle cx="0" cy="0" r="14" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" className="drop-shadow-lg" />
              {/* Blue Direction Arrow */}
              <path d="M 0 -8 L 6 6 L 0 3 L -6 6 Z" fill="#2563eb" />
            </g>
          </svg>
        </div>

        {/* Top-Left Floating Turn-by-Turn Guidance Banner (Matching Reference) */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-emerald-800/95 text-white shadow-xl backdrop-blur-md border border-emerald-600/40 min-w-[200px] animate-in fade-in slide-in-from-top-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <CornerUpRight className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">1.2 km</div>
            <div className="text-xs font-semibold text-emerald-100 leading-tight">Turn right onto NH 44</div>
          </div>
        </div>

        {/* Floating Map Controls (Right Side) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => setVoiceMuted(!voiceMuted)}
            className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-md border border-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title={voiceMuted ? "Unmute Voice Guidance" : "Mute Voice Guidance"}
          >
            {voiceMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            onClick={() => setIsRecentered(true)}
            className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-md border border-white backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title="Recenter GPS Location"
          >
            <Crosshair className={`w-4 h-4 ${isRecentered ? "text-blue-600" : "text-slate-700"}`} />
          </button>

          <div className="flex flex-col rounded-xl bg-white/90 shadow-md border border-white backdrop-blur-md overflow-hidden">
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
              className="p-2 hover:bg-slate-100 text-slate-700 transition-colors border-b border-slate-100 cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.1))}
              className="p-2 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Trip Telemetry Strip (Inside Map) */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-xl text-slate-800">
          <div className="flex items-center gap-6 sm:gap-10">
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">56 min</div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">ETA 11:45 AM</div>
            </div>
            <div className="border-l border-slate-200 pl-4 sm:pl-8">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">38 km</div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">Distance</div>
            </div>
            <div className="border-l border-slate-200 pl-4 sm:pl-8 hidden sm:block">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">{telemetry?.currentRoad || "NH 44"}</div>
              <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">Current Road</div>
            </div>
          </div>

          <button
            onClick={onEndTrip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <StopCircle className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
            <span>End Trip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
