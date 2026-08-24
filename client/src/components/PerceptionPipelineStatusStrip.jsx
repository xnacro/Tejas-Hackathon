import React from "react";
import { 
  Cpu, 
  Activity, 
  Layers, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw,
  Sparkles
} from "lucide-react";
import { usePerception } from "../context/PerceptionContext";

export default function PerceptionPipelineStatusStrip() {
  const {
    pipelineStatus,
    scenarioStep,
    setScenario,
    isAutoPlayingScenario,
    setIsAutoPlayingScenario,
    pathPlan
  } = usePerception();

  const isRiskState = pathPlan?.status === "REPLANNING" || pathPlan?.status === "RISK_DETECTED";

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 text-white border border-slate-800 shadow-md backdrop-blur-md text-[11px]">
      {/* Left: Pipeline Modules Status Strip */}
      <div className="flex items-center gap-3 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none font-bold tracking-tight">
        <div className="flex items-center gap-1.5 text-emerald-400 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] uppercase font-mono">PERCEPTION: ACTIVE</span>
        </div>

        <span className="text-slate-600">|</span>

        <div className="flex items-center gap-1 text-emerald-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-[10px] uppercase font-mono">LiDAR: ACTIVE (10Hz)</span>
        </div>

        <span className="text-slate-600">|</span>

        <div className="flex items-center gap-1 text-emerald-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-[10px] uppercase font-mono">TRACKING: ACTIVE</span>
        </div>

        <span className="text-slate-600">|</span>

        <div className="flex items-center gap-1 text-emerald-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-[10px] uppercase font-mono">PREDICTION: ACTIVE</span>
        </div>

        <span className="text-slate-600">|</span>

        <div className="flex items-center gap-1 text-emerald-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-[10px] uppercase font-mono">RISK ENGINE: ACTIVE</span>
        </div>

        <span className="text-slate-600">|</span>

        <div className={`flex items-center gap-1 shrink-0 ${isRiskState ? "text-rose-400" : "text-emerald-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isRiskState ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`}></span>
          <span className="text-[10px] uppercase font-mono">PATH PLANNER: ACTIVE</span>
        </div>
      </div>

      {/* Right: SIH26037 Scenario Interactive Stepper */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300">
          <span className="text-purple-400 font-bold">SIH26037 Scenario:</span>
          <span className={`font-mono font-bold ${isRiskState ? "text-rose-400" : "text-emerald-400"}`}>
            {scenarioStep === 0 && "1. Safe Path"}
            {scenarioStep === 1 && "2. Pedestrian Incursion"}
            {scenarioStep === 2 && "3. Adaptive Replanning"}
            {scenarioStep === 3 && "4. Path Recovered"}
          </span>
        </div>

        {/* Step Buttons */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-800 border border-slate-700">
          {[0, 1, 2, 3].map((stepIdx) => (
            <button
              key={stepIdx}
              onClick={() => {
                setIsAutoPlayingScenario(false);
                setScenario(stepIdx);
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                scenarioStep === stepIdx ? "bg-purple-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              S{stepIdx + 1}
            </button>
          ))}
        </div>

        {/* Auto-Play Toggle */}
        <button
          onClick={() => setIsAutoPlayingScenario(!isAutoPlayingScenario)}
          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
            isAutoPlayingScenario ? "bg-purple-600/30 border-purple-500 text-purple-300" : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
          title={isAutoPlayingScenario ? "Pause Auto Demo" : "Play Auto Demo"}
        >
          {isAutoPlayingScenario ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
