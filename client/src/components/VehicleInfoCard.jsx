import React from "react";
import { Gauge, Fuel, Thermometer, Route, Car } from "lucide-react";
import { useLocation } from "../context/LocationContext";

export default function VehicleInfoCard({ telemetry }) {
  const { coords } = useLocation();

  const baseSpeed = coords.speedKmh !== null && coords.speedKmh !== undefined
    ? coords.speedKmh
    : (telemetry?.speed !== undefined ? telemetry.speed : 48);

  const items = [
    { label: "Speed", value: `${baseSpeed} km/h`, icon: Gauge, color: "text-blue-600" },
    { label: "Fuel Level", value: `${telemetry?.fuelLevel || 62}%`, icon: Fuel, color: "text-amber-500" },
    { label: "Engine Temp", value: `${telemetry?.engineTemp || 88}°C`, icon: Thermometer, color: "text-rose-500" },
    { label: "Trip Distance", value: `${telemetry?.tripDistance || 234.8} km`, icon: Route, color: "text-indigo-500" },
  ];

  return (
    <div className="p-3 rounded-2xl glass-panel border border-white shadow-xs flex flex-col justify-between font-poppins">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-5 h-5 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
          <Car className="w-3 h-3 stroke-[2.5]" />
        </div>
        <h3 className="text-[11px] font-bold text-slate-800 tracking-tight">Vehicle Info</h3>
      </div>

      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Icon className={`w-3 h-3 ${item.color}`} />
                <span className="font-semibold text-slate-600">{item.label}</span>
              </div>
              <span className="font-impact text-slate-900 text-[11px] tracking-wide">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
