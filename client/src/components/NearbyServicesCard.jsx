import React from "react";
import { 
  Fuel, 
  Utensils, 
  Bed, 
  HeartPulse, 
  ShieldAlert, 
  MapPin,
  Navigation
} from "lucide-react";
import { useLocation } from "../context/LocationContext";
import { useNavigation } from "../context/NavigationContext";
import { calculateHaversineDistance } from "../utils/googleMapsLoader";

export default function NearbyServicesCard({ services, onSelectService, onViewAll }) {
  const { coords } = useLocation();
  const { selectDestination } = useNavigation();
  const { latitude, longitude } = coords;

  const defaultServices = [
    { name: "Indian Oil Petrol Pump", type: "Petrol Pump", distanceKm: 2.4, coordinates: { lat: 28.5390, lng: 77.3940 }, icon: Fuel, color: "text-emerald-600", bg: "bg-emerald-100" },
    { name: "Pahalwan Highway Dhaba", type: "Restaurant", distanceKm: 1.8, coordinates: { lat: 28.5330, lng: 77.3880 }, icon: Utensils, color: "text-amber-600", bg: "bg-amber-100" },
    { name: "Highway Oasis Rest Stop", type: "Rest Area", distanceKm: 5.6, coordinates: { lat: 28.5600, lng: 77.4100 }, icon: Bed, color: "text-blue-600", bg: "bg-blue-100" },
  ];

  const sourceList = services && services.length > 0 ? services : defaultServices;

  const displayList = sourceList.map(item => {
    let dist = item.distanceKm;
    if (latitude && longitude && item.coordinates?.lat && item.coordinates?.lng) {
      dist = calculateHaversineDistance(latitude, longitude, item.coordinates.lat, item.coordinates.lng);
    }
    return {
      ...item,
      dynamicDistanceKm: dist,
      displayDistance: typeof dist === "number" ? `${dist} km` : (item.distance || `${item.distanceKm} km`)
    };
  }).sort((a, b) => (Number(a.dynamicDistanceKm) || 0) - (Number(b.dynamicDistanceKm) || 0));

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

  const handleServiceClick = (item) => {
    if (item.coordinates?.lat && item.coordinates?.lng) {
      selectDestination({
        name: item.name || item.type,
        address: item.location || `${item.name || item.type} along highway corridor`,
        lat: item.coordinates.lat,
        lng: item.coordinates.lng,
        category: item.type
      });
    }
    if (onSelectService) {
      onSelectService(item);
    }
  };

  return (
    <div className="p-3 rounded-2xl glass-panel border border-white shadow-xs flex flex-col justify-between font-poppins">
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[11px] font-bold text-slate-800 tracking-tight">Nearby Services</h3>
        <button
          onClick={onViewAll}
          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          View All
        </button>
      </div>

      <div className="space-y-1.5">
        {displayList.slice(0, 3).map((item, idx) => {
          const Icon = item.icon || getIcon(item.type);
          const styling = item.color ? { color: item.color, bg: item.bg } : getColor(item.type);
          const dist = item.displayDistance;

          return (
            <div
              key={idx}
              onClick={() => handleServiceClick(item)}
              className="flex items-center justify-between p-1 rounded-xl hover:bg-blue-50/70 transition-all cursor-pointer group"
              title={`Tap to navigate to ${item.name || item.type}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg ${styling.bg} flex items-center justify-center ${styling.color} shrink-0`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{item.name || item.type}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-bold text-slate-500">{dist}</span>
                <Navigation className="w-2.5 h-2.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
