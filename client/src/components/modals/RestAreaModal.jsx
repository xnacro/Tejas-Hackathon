import React from "react";
import { X, Bed, Navigation, Coffee, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigation } from "../../context/NavigationContext";

export default function RestAreaModal({ isOpen, onClose, onNavigate }) {
  const { selectDestination } = useNavigation();

  if (!isOpen) return null;

  const handleReroute = () => {
    selectDestination({
      name: "Highway Oasis Driver Rest Complex",
      address: "NH 44, Mile 238 Highway Rest Hub",
      lat: 28.5600,
      lng: 77.4100,
      category: "Rest Stop"
    });
    if (onNavigate) onNavigate();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl border border-amber-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Bed className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Drowsiness Detected</h2>
              <p className="text-xs text-amber-100 font-medium">Recommended Rest Area Ahead</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Nearest Safe Stop</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white font-extrabold text-amber-700 text-xs border border-amber-200 shadow-2xs">
                2.1 km ahead
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Highway Oasis Driver Rest Complex</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Equipped with secure truck parking bays, air-conditioned resting pods, showers, and 24/7 hot tea/food.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <Bed className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-700">Dorm Beds</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <Coffee className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-700">Hot Tea/Food</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-700">CCTV Guard</span>
            </div>
          </div>

          {/* Navigate Action */}
          <button
            onClick={handleReroute}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>Reroute & Navigate to Rest Area</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
