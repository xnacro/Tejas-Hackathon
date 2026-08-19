import React from "react";
import { 
  Car, 
  AlertTriangle, 
  Camera, 
  Route, 
  TrendingUp, 
  ExternalLink 
} from "lucide-react";
import { useLocation } from "../context/LocationContext";

export default function TrafficSafetyCard({ telemetry, onReduceSpeed, onOpenRules }) {
  const { coords, currentRoad } = useLocation();

  const currentSpeed = coords.speedKmh !== null && coords.speedKmh !== undefined 
    ? coords.speedKmh 
    : (telemetry?.speed || 68);
  const speedLimit = telemetry?.speedLimit || 60;
  const isOverSpeed = currentSpeed > speedLimit;
  const diff = currentSpeed - speedLimit;


  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <Car className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Traffic & Safety</h2>
        </div>

        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Live Updates
        </span>
      </div>

      {/* 1. Speed Limit Alert Card (Matching Reference) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/90 via-white/80 to-rose-50/60 border border-rose-200/80 shadow-sm backdrop-blur-md relative overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Speed Limit Alert</span>
            </div>
            <p className="text-[11px] font-medium text-slate-600 leading-snug">
              You are driving <strong className="text-rose-600">{diff > 0 ? diff : 8} km/h</strong> above speed limit ({speedLimit} km/h)
            </p>
          </div>

          {/* Speed Badge (Circle) */}
          <div className="w-12 h-12 rounded-full border-2 border-rose-500 bg-white flex flex-col items-center justify-center shadow-xs shrink-0">
            <span className="text-sm font-black text-rose-600 leading-tight">{currentSpeed}</span>
            <span className="text-[8px] font-bold text-slate-400 -mt-0.5">km/h</span>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-center">
          <button
            onClick={onReduceSpeed}
            className="w-full py-1.5 rounded-xl bg-white hover:bg-rose-500 hover:text-white border border-rose-200 text-rose-600 text-xs font-bold transition-all shadow-2xs active:scale-98 cursor-pointer"
          >
            Reduce Speed
          </button>
        </div>
      </div>

      {/* 2. Speed Camera Ahead Card (Matching Reference) */}
      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 shadow-2xs backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Speed Camera Ahead</div>
            <div className="text-[11px] text-slate-500">200 meters ahead</div>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-amber-700 text-xs font-extrabold shadow-2xs">
          200 m
        </div>
      </div>

      {/* 3. Road Condition Card (Matching Reference) */}
      <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/70 shadow-2xs backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Road Condition</div>
            <div className="text-[11px] text-slate-500">Moderate traffic on {currentRoad || "NH 44"} • Drive Safe</div>
          </div>

        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenRules}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            View
          </button>
          <div className="w-7 h-7 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
