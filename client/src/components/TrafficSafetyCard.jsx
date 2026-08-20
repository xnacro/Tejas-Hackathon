import React from "react";
import { 
  Car, 
  AlertTriangle, 
  Camera, 
  Route, 
  TrendingUp,
  ShieldCheck,
  AlertOctagon,
  Clock,
  ExternalLink,
  Zap
} from "lucide-react";
import { useLocation } from "../context/LocationContext";
import { useTrafficSafety } from "../context/TrafficSafetyContext";

export default function TrafficSafetyCard({ onOpenRules }) {
  const { currentRoad } = useLocation();
  const { 
    trafficData, 
    riskLevel, 
    recommendation, 
    demoMode, 
    handleReduceSpeed 
  } = useTrafficSafety();

  const { speed, traffic, nearestHazard, applicableRule } = trafficData;
  const currentSpeed = speed?.current || 52;
  const speedLimit = speed?.limit || 60;
  const diff = speed?.difference || (currentSpeed - speedLimit);
  const isOverLimit = speed?.status === "OVER_LIMIT" || speed?.status === "CRITICAL" || diff > 0;
  const isCriticalRisk = riskLevel === "CRITICAL";
  const isHighRisk = riskLevel === "HIGH";

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Header with Live Status & Demo Badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <Car className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Traffic & Safety</h2>
        </div>

        <div className="flex items-center gap-1.5">
          {demoMode && (
            <span className="text-[10px] font-black tracking-wider uppercase text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3 text-purple-600" />
              <span>DEMO: {demoMode}</span>
            </span>
          )}
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Live Intelligence
          </span>
        </div>
      </div>

      {/* 2. Unified Safety Engine Advisory Banner (Appears when Multi-Risk Active) */}
      {(isCriticalRisk || isHighRisk) && (
        <div className={`p-3 rounded-2xl border shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-top-1 ${
          isCriticalRisk 
            ? "bg-rose-600/90 text-white border-rose-500 shadow-rose-500/20" 
            : "bg-amber-500/90 text-white border-amber-400 shadow-amber-500/20"
        }`}>
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-4 h-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-black uppercase tracking-wider">
                {isCriticalRisk ? "High-Risk Driving Condition" : "Safety Recommendation"}
              </div>
              <div className="text-[11px] font-medium leading-snug text-white/95 mt-0.5">
                {recommendation}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Speed Limit Intelligence Card */}
      {isOverLimit ? (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/95 via-white/90 to-rose-50/70 border border-rose-200/90 shadow-sm backdrop-blur-md relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-600">
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Speed Limit Alert</span>
              </div>
              <p className="text-[11px] font-medium text-slate-600 leading-snug">
                You are driving <strong className="text-rose-600">{diff > 0 ? `+${diff}` : "+8"} km/h</strong> above speed limit ({speedLimit} km/h)
              </p>
              <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-1">
                <span>Speed limit source: Road data</span>
              </div>
            </div>

            {/* Circular Speed Gauge */}
            <div className="w-12 h-12 rounded-full border-2 border-rose-500 bg-white flex flex-col items-center justify-center shadow-xs shrink-0 animate-pulse">
              <span className="text-sm font-black text-rose-600 leading-tight">{currentSpeed}</span>
              <span className="text-[8px] font-bold text-slate-400 -mt-0.5">km/h</span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-center">
            <button
              onClick={handleReduceSpeed}
              className="w-full py-1.5 rounded-xl bg-white hover:bg-rose-500 hover:text-white border border-rose-200 text-rose-600 text-xs font-bold transition-all shadow-2xs active:scale-98 cursor-pointer"
            >
              Reduce Speed
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-white/90 to-emerald-50/60 border border-emerald-200/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span>Speed Within Limit</span>
              </div>
              <p className="text-[11px] font-medium text-slate-600 leading-snug">
                Speed: <strong>{currentSpeed} km/h</strong> • Road Limit: <strong>{speedLimit} km/h</strong>
              </p>
              <div className="text-[9px] font-semibold text-slate-400">
                Speed limit source: Road data
              </div>
            </div>

            <div className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-white flex flex-col items-center justify-center shadow-xs shrink-0">
              <span className="text-sm font-black text-emerald-600 leading-tight">{currentSpeed}</span>
              <span className="text-[8px] font-bold text-slate-400 -mt-0.5">km/h</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Upcoming Road Hazard / Speed Camera Card */}
      {nearestHazard ? (
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 shadow-2xs backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              {nearestHazard.type === "SPEED_CAMERA" ? <Camera className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">{nearestHazard.title}</div>
              <div className="text-[10px] text-slate-500 line-clamp-1">
                {nearestHazard.distanceText} ahead • {nearestHazard.confidence || "Verified"}
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-amber-700 text-xs font-extrabold shadow-2xs shrink-0">
            {nearestHazard.distanceText}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 shadow-2xs backdrop-blur-md flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xs font-bold text-slate-700">No Road Hazards Nearby</div>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Clear Road</span>
        </div>
      )}

      {/* 5. Live Traffic & Road Condition Card */}
      <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/70 shadow-2xs backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">
              {traffic?.status === "HEAVY" ? "Heavy Traffic Congestion" : traffic?.status === "SLOW" ? "Moderate Traffic Flow" : "Normal Road Traffic"}
            </div>
            <div className="text-[10px] text-slate-500 line-clamp-1">
              {currentRoad || "Khargour - Amarath Road"} {traffic?.delayText && traffic.delayText !== "0 min delay" ? `• ${traffic.delayText}` : "• Steady"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenRules}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
          >
            <span>Rules</span>
            <ExternalLink className="w-3 h-3" />
          </button>
          <div className="w-7 h-7 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
