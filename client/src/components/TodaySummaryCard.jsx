import React from "react";
import { Clock, AlertTriangle, Zap, Shield, FileText } from "lucide-react";

export default function TodaySummaryCard({ summary }) {
  const drivingTime = summary?.drivingTime || "04h 32m";
  const alertsCount = summary?.alerts !== undefined ? summary.alerts : 2;
  const topSpeed = summary?.topSpeed || 78;
  const safetyScore = summary?.safetyScore || 92;

  return (
    <div className="p-3 rounded-2xl glass-panel border border-white shadow-xs flex flex-col justify-between font-poppins">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
          <FileText className="w-3 h-3 stroke-[2.5]" />
        </div>
        <h3 className="text-[11px] font-bold text-slate-800 tracking-tight">Today's Summary</h3>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3 h-3 text-blue-500" />
            <span className="font-semibold text-slate-600">Driving Time</span>
          </div>
          <span className="font-impact text-slate-900 text-[11px] tracking-wide">{drivingTime}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span className="font-semibold text-slate-600">Alerts</span>
          </div>
          <span className="font-impact text-slate-900 text-[11px] tracking-wide">{alertsCount}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Zap className="w-3 h-3 text-indigo-500" />
            <span className="font-semibold text-slate-600">Top Speed</span>
          </div>
          <span className="font-impact text-slate-900 text-[11px] tracking-wide">{topSpeed} km/h</span>
        </div>

        {/* Safety Score with Progress Bar */}
        <div className="pt-0.5">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <div className="flex items-center gap-1 text-slate-600">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span className="font-semibold">Safety Score</span>
            </div>
            <span className="font-impact text-emerald-600 text-[10px] tracking-wide">{safetyScore}/100</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${safetyScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
