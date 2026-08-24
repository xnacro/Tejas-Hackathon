import React from "react";
import { 
  LayoutGrid, 
  Video, 
  MapPin, 
  Car, 
  Users, 
  BellRing, 
  Settings, 
  ChevronDown,
  Box,
  Radar,
  Scan
} from "lucide-react";
import { usePerception } from "../context/PerceptionContext";

export default function CenterNav({ activeTab, setActiveTab, onOpenSos, onOpenTrafficRules, onOpenCommunity }) {
  const { setCenterViewMode } = usePerception();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid, onClick: () => { setActiveTab("dashboard"); setCenterViewMode("MAP"); } },
    { id: "lidar", label: "LiDAR 3D", icon: Box, onClick: () => { setActiveTab("lidar"); setCenterViewMode("LIDAR_3D"); } },
    { id: "road_cv", label: "Road CV", icon: Scan, onClick: () => setActiveTab("road_cv") },
    { id: "monitoring", label: "Driver AI", icon: Video, onClick: () => setActiveTab("monitoring") },
    { id: "navigation", label: "Navigation", icon: MapPin, onClick: () => { setActiveTab("navigation"); setCenterViewMode("MAP"); } },
    { id: "traffic", label: "Traffic", icon: Car, onClick: onOpenTrafficRules },
    { id: "community", label: "Community", icon: Users, onClick: onOpenCommunity },
    { id: "sos", label: "SOS", icon: BellRing, isDanger: true, onClick: onOpenSos },
    { id: "settings", label: "Settings", icon: Settings },
  ];




  return (
    <nav className="flex flex-col items-center justify-between py-4 px-2.5 rounded-3xl glass-nav-pill h-full shadow-lg">
      <div className="flex flex-col items-center gap-3 w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center w-14 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-105"
                  : item.isDanger
                  ? "text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
              title={item.label}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : ""}`} />
              <span className={`text-[10px] font-semibold mt-1 tracking-tight ${
                isActive ? "text-white" : item.isDanger ? "text-rose-500" : "text-slate-600"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <button 
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="More Options"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
