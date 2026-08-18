import React from "react";
import { Gauge, Fuel, Thermometer, Route, Car } from "lucide-react";

export default function VehicleInfoCard({ telemetry }) {
  const items = [
    { label: "Speed", value: `${telemetry?.speed || 52} km/h`, icon: Gauge, color: "text-blue-600" },
    { label: "Fuel Level", value: `${telemetry?.fuelLevel || 62}%`, icon: Fuel, color: "text-amber-500" },
    { label: "Engine Temp", value: `${telemetry?.engineTemp || 87}°C`, icon: Thermometer, color: "text-rose-500" },
    { label: "Trip Distance", value: `${telemetry?.tripDistance || 234.8} km`, icon: Route, color: "text-indigo-500" },
  ];

  return (
    <div className="p-4 rounded-3xl glass-panel border border-white shadow-md flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
          <Car className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <h3 className="text-xs font-bold text-slate-800 tracking-tight">Vehicle Info</h3>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              <span className="font-bold text-slate-900">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
