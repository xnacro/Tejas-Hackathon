import React from "react";
import { Clock, AlertTriangle, Zap, Shield, FileText } from "lucide-react";

export default function TodaySummaryCard({ summary }) {
  const drivingTime = summary?.drivingTime || "04h 32m";
  const alertsCount = summary?.alerts !== undefined ? summary.alerts : 2;
  const topSpeed = summary?.topSpeed || 78;
  const safetyScore = summary?.safetyScore || 92;

  return (
    <div className="p-4 rounded-3xl glass-panel border border-white shadow-md flex flex-col justify-between font-poppins">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
          <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <h3 className="text-xs font-bold text-slate-800 tracking-tight">Today's Summary</h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold text-slate-600">Driving Time</span>
          </div>
          <span className="font-impact text-slate-900 text-xs tracking-wide">{drivingTime}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-600">Alerts</span>
          </div>
          <span className="font-impact text-slate-900 text-xs tracking-wide">{alertsCount}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold text-slate-600">Top Speed</span>
          </div>
          <span className="font-impact text-slate-900 text-xs tracking-wide">{topSpeed} km/h</span>
        </div>

        {/* Safety Score with Progress Bar */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold">Safety Score</span>
            </div>
            <span className="font-impact text-emerald-600 text-xs tracking-wide">{safetyScore}/100</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60 shadow-inner">
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
