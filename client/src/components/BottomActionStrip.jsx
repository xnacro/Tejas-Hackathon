import React from "react";
import { ChevronRight, Users, Radio, AlertOctagon } from "lucide-react";

export default function BottomActionStrip({ 
  onOpenSos, 
  onOpenShareLocation, 
  onOpenCommunity, 
  locationSharingActive, 
  contactsCount, 
  nearbyDriversCount 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full pt-1">
      {/* 1. SOS Emergency Action Card (Red Glassmorphism) */}
      <button
        onClick={onOpenSos}
        className="group flex items-center justify-between p-3.5 rounded-3xl bg-gradient-to-r from-rose-50/90 via-rose-50/70 to-white/80 border border-rose-200/80 shadow-md backdrop-blur-md hover:shadow-lg hover:border-rose-300 transition-all active:scale-98 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white text-xs font-black shadow-md shadow-rose-500/30 group-hover:scale-105 transition-transform">
            SOS
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-rose-600 leading-tight">SOS Emergency</div>
            <div className="text-[11px] font-medium text-slate-500">Tap for help & 112 dispatch</div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-xl bg-white/90 border border-rose-200/60 flex items-center justify-center text-rose-500 group-hover:translate-x-0.5 transition-transform">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </button>

      {/* 2. Share Live Location Action Card (Green Glassmorphism) */}
      <button
        onClick={onOpenShareLocation}
        className="group flex items-center justify-between p-3.5 rounded-3xl bg-gradient-to-r from-emerald-50/90 via-emerald-50/70 to-white/80 border border-emerald-200/80 shadow-md backdrop-blur-md hover:shadow-lg hover:border-emerald-300 transition-all active:scale-98 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">Share Live Location</div>
            <div className="text-[11px] font-medium text-slate-500">
              {locationSharingActive ? `${contactsCount || 2} contacts tracking` : "Opt-in trip sharing"}
            </div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-xl bg-white/90 border border-emerald-200/60 flex items-center justify-center text-emerald-600 group-hover:translate-x-0.5 transition-transform">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </button>

      {/* 3. Community Action Card (Purple Glassmorphism) */}
      <button
        onClick={onOpenCommunity}
        className="group flex items-center justify-between p-3.5 rounded-3xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-white/80 border border-indigo-200/80 shadow-md backdrop-blur-md hover:shadow-lg hover:border-indigo-300 transition-all active:scale-98 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">Community</div>
            <div className="text-[11px] font-medium text-slate-500">
              {nearbyDriversCount || 8} drivers nearby in your area
            </div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-xl bg-white/90 border border-indigo-200/60 flex items-center justify-center text-indigo-600 group-hover:translate-x-0.5 transition-transform">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </button>
    </div>
  );
}
