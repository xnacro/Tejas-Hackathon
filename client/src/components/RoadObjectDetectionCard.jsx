import React from "react";
import { 
  Scan, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Layers, 
  AlertTriangle,
  Zap
} from "lucide-react";
import { usePerception } from "../context/PerceptionContext";
import RoadObjectDetectionView from "./RoadObjectDetectionView";

export default function RoadObjectDetectionCard() {
  const { objects, pathPlan } = usePerception();

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <Scan className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Forward Road Perception (AI Vision)
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            30 FPS • EKF
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {objects.length} Objects
          </span>
        </div>
      </div>

      {/* Main Forward CV Camera Viewport */}
      <RoadObjectDetectionView />
    </div>
  );
}
