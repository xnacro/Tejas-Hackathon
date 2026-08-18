import React from "react";
import { 
  Fuel, 
  Utensils, 
  Bed, 
  HeartPulse, 
  ShieldAlert, 
  ChevronRight,
  MapPin
} from "lucide-react";

export default function NearbyServicesCard({ services, onSelectService, onViewAll }) {
  const defaultServices = [
    { name: "Petrol Pump", distance: "2.4 km", icon: Fuel, color: "text-emerald-600", bg: "bg-emerald-100" },
    { name: "Restaurant", distance: "1.8 km", icon: Utensils, color: "text-amber-600", bg: "bg-amber-100" },
    { name: "Rest Area", distance: "5.6 km", icon: Bed, color: "text-blue-600", bg: "bg-blue-100" },
    { name: "Hospital", distance: "8.2 km", icon: HeartPulse, color: "text-rose-600", bg: "bg-rose-100" },
  ];

  const displayList = services && services.length > 0 ? services : defaultServices;

  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "petrol pump": return Fuel;
      case "restaurant": return Utensils;
      case "rest area": return Bed;
      case "hospital": return HeartPulse;
      case "police station": return ShieldAlert;
      default: return MapPin;
    }
  };

  const getColor = (type) => {
    switch (type?.toLowerCase()) {
      case "petrol pump": return { color: "text-emerald-600", bg: "bg-emerald-100" };
      case "restaurant": return { color: "text-amber-600", bg: "bg-amber-100" };
      case "rest area": return { color: "text-blue-600", bg: "bg-blue-100" };
      case "hospital": return { color: "text-rose-600", bg: "bg-rose-100" };
      case "police station": return { color: "text-indigo-600", bg: "bg-indigo-100" };
      default: return { color: "text-slate-600", bg: "bg-slate-100" };
    }
  };

  return (
    <div className="p-4 rounded-3xl glass-panel border border-white shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-800 tracking-tight">Nearby Services</h3>
        <button
          onClick={onViewAll}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          View All
        </button>
      </div>

      <div className="space-y-2.5">
        {displayList.slice(0, 4).map((item, idx) => {
          const Icon = item.icon || getIcon(item.type);
          const styling = item.color ? { color: item.color, bg: item.bg } : getColor(item.type);
          const dist = item.distance || `${item.distanceKm} km`;

          return (
            <div
              key={idx}
              onClick={() => onSelectService && onSelectService(item)}
              className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg ${styling.bg} flex items-center justify-center ${styling.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-800">{item.name || item.type}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">{dist}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
