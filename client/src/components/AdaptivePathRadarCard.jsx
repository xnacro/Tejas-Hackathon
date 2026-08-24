import React from "react";
import { 
  Radar, 
  ShieldCheck, 
  AlertOctagon, 
  GitMerge, 
  Activity, 
  Navigation2, 
  ArrowRight,
  TrendingUp,
  Cpu
} from "lucide-react";
import { usePerception } from "../context/PerceptionContext";

export default function AdaptivePathRadarCard() {
  const {
    objects,
    pathPlan,
    egoVehicle,
    scenarioStep
  } = usePerception();

  const totalObjects = objects.length;
  const trackedCount = objects.filter(o => o.trackId).length;
  const highRiskCount = objects.filter(o => o.risk === "HIGH").length;
  const predictedConflicts = pathPlan?.collisionPredicted ? 1 : 0;
  const pathRiskPct = highRiskCount > 0 ? 88 : 18;

  const isReplanning = pathPlan?.status === "REPLANNING";
  const isSafe = pathPlan?.status === "SAFE_PATH" || pathPlan?.status === "NEW_SAFE_PATH";

  return (
    <div className="p-4 rounded-3xl glass-panel border border-white shadow-md space-y-3 font-poppins">

      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Radar className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            AI Perception Radar
          </h3>
        </div>

        <span className="text-[10px] font-impact px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
          SIH26037 Engine
        </span>
      </div>

      {/* 5 Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 text-center shadow-2xs">
          <div className="text-xl font-impact text-slate-800 leading-tight">{totalObjects}</div>
          <div className="text-[9px] font-semibold text-slate-400 mt-0.5">Objects Detected</div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 text-center shadow-2xs">
          <div className="text-xl font-impact text-blue-600 leading-tight">{trackedCount}</div>
          <div className="text-[9px] font-semibold text-slate-400 mt-0.5">Tracked Objects</div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 text-center shadow-2xs">
          <div className={`text-xl font-impact leading-tight ${highRiskCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {highRiskCount}
          </div>
          <div className="text-[9px] font-semibold text-slate-400 mt-0.5">High Risk</div>
        </div>
      </div>

      {/* Path Risk & Conflict Banner */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-left">
          <div className="text-[9px] font-bold text-slate-400 uppercase">Predicted Conflicts</div>
          <div className={`text-xs font-impact mt-0.5 ${predictedConflicts > 0 ? "text-rose-600" : "text-slate-700"}`}>
            {predictedConflicts > 0 ? "1 (Pedestrian #03)" : "0 (Clear Path)"}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-left">
          <div className="text-[9px] font-bold text-slate-400 uppercase">Current Path Risk</div>
          <div className={`text-xs font-impact mt-0.5 ${pathRiskPct > 50 ? "text-rose-600" : "text-emerald-600"}`}>
            {pathRiskPct}% Risk
          </div>
        </div>
      </div>

      {/* Dynamic Adaptive Replanning Status Strip */}
      <div className={`p-3 rounded-2xl border transition-all ${
        isReplanning
          ? "bg-rose-50 border-rose-200 text-rose-800"
          : "bg-emerald-50 border-emerald-200 text-emerald-800"
      }`}>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 uppercase font-impact tracking-wide">
            {isReplanning ? (
              <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span>{pathPlan?.status || "SAFE PATH"}</span>
          </span>
          <span className="text-[10px] font-impact px-2 py-0.5 rounded-md bg-white border border-slate-200 shrink-0">
            {isReplanning ? "LAT: +1.35m" : "LAT: 0.0m"}
          </span>
        </div>


        <p className="text-[10px] text-slate-600 mt-1 leading-snug">
          {pathPlan?.statusMessage || "Nominal path maintained."}
        </p>

        {/* 4-Step Perception Flow Pipeline Indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2 text-[9px] font-black uppercase text-slate-500">
          <span className="text-blue-600">Perceive</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
          <span className="text-blue-600">Predict</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
          <span className={highRiskCount > 0 ? "text-rose-600" : "text-slate-600"}>Risk</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
          <span className={isReplanning ? "text-purple-600 font-extrabold" : "text-emerald-600 font-extrabold"}>Replan</span>
        </div>
      </div>
    </div>
  );
}
