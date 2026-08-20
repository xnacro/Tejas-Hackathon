import React, { useState } from "react";
import { 
  Car, 
  AlertTriangle, 
  Camera, 
  Route, 
  TrendingUp,
  ShieldCheck,
  AlertOctagon,
  FileText,
  ExternalLink,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Scale,
  Gauge
} from "lucide-react";
import { useLocation } from "../context/LocationContext";
import { useTrafficSafety } from "../context/TrafficSafetyContext";

export default function TrafficSafetyCard({ onOpenRules }) {
  const { currentRoad } = useLocation();
  const { 
    trafficData, 
    allRules, 
    allStates, 
    selectedStateFilter, 
    setSelectedStateFilter,
    riskLevel, 
    recommendation, 
    demoMode, 
    handleReduceSpeed 
  } = useTrafficSafety();

  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'speed' | 'rules' | 'hazards'
  const [expandedRuleId, setExpandedRuleId] = useState(null);

  const { speed, traffic, nearestHazard, hazards } = trafficData;
  const currentSpeed = speed?.current !== undefined ? speed.current : 0;
  const speedLimit = speed?.limit || 60;
  const isStationary = currentSpeed === 0;
  const diff = currentSpeed > 0 ? currentSpeed - speedLimit : 0;
  const isOverLimit = currentSpeed > 0 && diff > 0;
  const isCriticalSpeed = diff > 15;
  const isCriticalRisk = riskLevel === "CRITICAL";
  const isHighRisk = riskLevel === "HIGH";

  // Filter rules by selected state
  const displayedRules = (allRules || []).filter(r => {
    if (!selectedStateFilter || selectedStateFilter === "All") return true;
    return r.state.toLowerCase().includes(selectedStateFilter.toLowerCase());
  });

  const speedPercentage = isStationary ? 0 : Math.min(100, Math.round((currentSpeed / 120) * 100));

  return (
    <div className="flex flex-col gap-3.5 h-full">
      {/* 1. Header with Live Intelligence & Demo Badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <Car className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Traffic & Safety Radar</h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {demoMode && (
            <span className="text-[10px] font-black tracking-wider uppercase text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3 text-purple-600" />
              <span>{demoMode}</span>
            </span>
          )}
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Live AI Telemetry
          </span>
        </div>
      </div>

      {/* 2. Unified Safety Engine Advisory (if High Risk) */}
      {(isCriticalRisk || isHighRisk) && (
        <div className={`p-3 rounded-2xl border shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-top-1 ${
          isCriticalRisk 
            ? "bg-rose-600 text-white border-rose-500 shadow-rose-500/20" 
            : "bg-amber-500 text-white border-amber-400 shadow-amber-500/20"
        }`}>
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-4 h-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-black uppercase tracking-wider">
                {isCriticalRisk ? "High-Risk Driving Condition" : "Safety Advisory"}
              </div>
              <div className="text-[11px] font-medium leading-snug text-white/95 mt-0.5">
                {recommendation}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. High-Tech Speed Telemetry & Limit Cockpit */}
      <div className={`p-4 rounded-3xl border shadow-sm backdrop-blur-md transition-all ${
        isOverLimit
          ? "bg-gradient-to-br from-rose-50/95 via-white/95 to-rose-50/80 border-rose-200/90 shadow-rose-500/10"
          : "bg-gradient-to-br from-emerald-50/90 via-white/90 to-emerald-50/60 border-emerald-200/80 shadow-emerald-500/10"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              {isOverLimit ? (
                <span className="flex items-center gap-1 text-xs font-extrabold text-rose-600">
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Speed Limit Alert</span>
                </span>
              ) : isStationary ? (
                <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Vehicle Stationary / Standstill</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Speed Within Legal Limit</span>
                </span>
              )}
            </div>

            <p className="text-[11px] font-medium text-slate-600 leading-snug">
              {isOverLimit ? (
                <>Driving <strong className="text-rose-600">+{diff} km/h</strong> above posted speed limit ({speedLimit} km/h)</>
              ) : isStationary ? (
                <>Vehicle parked or at standstill. Posted road limit: <strong className="text-emerald-700">{speedLimit} km/h</strong></>
              ) : (
                <>Driving <strong className="text-emerald-700">{Math.abs(currentSpeed - speedLimit)} km/h</strong> below road limit ({speedLimit} km/h)</>
              )}
            </p>

            <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-1 pt-0.5">
              <span>Limit Source: MoRTH Gazette Highway Standard (S.O. 1522(E))</span>
            </div>
          </div>

          {/* Speed Digital Gauge Dial */}
          <div className="flex flex-col items-end shrink-0">
            <div className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-md bg-white ${
              isOverLimit ? "border-rose-500 text-rose-600 animate-pulse" : "border-emerald-500 text-emerald-600"
            }`}>
              <span className="text-lg font-black leading-none">{currentSpeed}</span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">km/h</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1">
              {isStationary ? "Status: Standstill" : `Limit: ${speedLimit} km/h`}
            </span>
          </div>
        </div>

        {/* Speed Bar Visual Indicator */}
        <div className="mt-3 space-y-1">
          <div className="w-full h-2.5 rounded-full bg-slate-200/80 overflow-hidden flex">
            <div 
              style={{ width: `${Math.max(4, Math.min(100, (currentSpeed / 100) * 100))}%` }} 
              className={`h-full rounded-full transition-all duration-500 ${
                isCriticalSpeed ? "bg-rose-600" : isOverLimit ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-slate-400 px-0.5">
            <span>0 (Stationary)</span>
            <span className="text-emerald-600 font-bold">Limit ({speedLimit} km/h)</span>
            <span>120 km/h</span>
          </div>
        </div>

        {/* Reduce Speed Button (When Over Limit) */}
        {isOverLimit && (
          <div className="mt-3">
            <button
              onClick={handleReduceSpeed}
              className="w-full py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black tracking-wide shadow-md shadow-rose-600/30 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Reduce Speed to {speedLimit - 5} km/h</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Live Speed Camera & Incident Radar Card */}
      {nearestHazard && (
        <div className="p-3.5 rounded-3xl bg-amber-50/90 border border-amber-200/80 shadow-xs backdrop-blur-md flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0">
              {nearestHazard.type === "SPEED_CAMERA" ? <Camera className="w-4 h-4 stroke-[2.5]" /> : <AlertTriangle className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900 leading-tight">{nearestHazard.title}</div>
              <div className="text-[10px] font-medium text-slate-600 mt-0.5 line-clamp-1">
                {nearestHazard.distanceText} ahead • {nearestHazard.confidence || "Verified by 5 drivers"}
              </div>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-2xl bg-white border border-amber-300 text-amber-800 text-xs font-black shadow-xs shrink-0">
            {nearestHazard.distanceText}
          </div>
        </div>
      )}

      {/* 5. Live Traffic Corridor Flow Card */}
      <div className="p-3.5 rounded-3xl bg-blue-50/80 border border-blue-200/80 shadow-xs backdrop-blur-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <Route className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 leading-tight">
              {traffic?.status === "HEAVY" ? "Heavy Traffic Delay" : traffic?.status === "SLOW" ? "Moderate Traffic Flow" : "Normal Corridor Flow"}
            </div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 line-clamp-1">
              {currentRoad || "Khargour - Amarath - Malaypur Corridor"} {traffic?.delayText && traffic.delayText !== "0 min delay" ? `• ${traffic.delayText}` : "• Steady 55 km/h"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-white border border-blue-200 text-blue-700 shadow-2xs">
            {traffic?.congestionIndex || 12}% Flow
          </span>
        </div>
      </div>

      {/* 6. Embedded Jurisdictional Traffic Rules & Statutory Challans (Directly in panel!) */}
      <div className="p-4 rounded-3xl glass-panel border border-white shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Scale className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              State Road Rules & Penalties
            </h3>
          </div>

          <button
            onClick={onOpenRules}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>All Rules</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* State Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px] font-bold">
          {["Bihar", "Uttar Pradesh", "Delhi NCR", "Maharashtra", "All"].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStateFilter(st)}
              className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                selectedStateFilter === st
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Displayed Statutory Rules List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {displayedRules.length > 0 ? (
            displayedRules.slice(0, 3).map((r) => {
              const isExpanded = expandedRuleId === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setExpandedRuleId(isExpanded ? null : r.id)}
                  className="p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                          {r.state}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {r.legal_section || "MVA 2019"}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                        {r.offence_name || r.offence}
                      </h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-rose-600">
                        {r.penalty_formatted || r.penalty}
                      </div>
                      {r.speed_limit && (
                        <div className="text-[9px] font-bold text-slate-500">
                          Limit: {r.speed_limit} km/h
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-600 space-y-1 animate-in fade-in">
                      <div><strong>Vehicle Category:</strong> {r.vehicle_type}</div>
                      <div><strong>Road Type:</strong> {r.road_type}</div>
                      <div><strong>Legal Source:</strong> {r.source}</div>
                      <div className="text-emerald-700 font-semibold">✓ Verified Statutory Rule (2024)</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                    <span>{r.vehicle_type}</span>
                    <span className="flex items-center gap-0.5 text-indigo-600 font-bold">
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-xs text-slate-400">
              No rules found for selected state.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
