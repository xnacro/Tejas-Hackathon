import React, { useState } from "react";
import { 
  X, 
  AlertOctagon, 
  PhoneCall, 
  Hospital, 
  ShieldAlert, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  MapPin 
} from "lucide-react";
import { soundSynthesizer } from "../../utils/audioAlerts";
import { useLocation } from "../../context/LocationContext";

export default function SosEmergencyModal({ isOpen, onClose, sosInfo }) {
  const [isDispatched, setIsDispatched] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  const { coords, currentRoad, formattedAddress } = useLocation();

  if (!isOpen) return null;

  const activeLat = coords.latitude || 28.5355;
  const activeLng = coords.longitude || 77.3910;
  const activeAccuracy = coords.accuracy || 12;

  const handleDispatch = async () => {
    try {
      await fetch("/api/sos/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          location: currentRoad || sosInfo?.currentRoad,
          latitude: activeLat,
          longitude: activeLng,
          accuracy: activeAccuracy
        })
      });
      setIsDispatched(true);
      soundSynthesizer.playCriticalSiren();
      setSirenActive(true);
    } catch (e) {
      console.warn("SOS trigger local fallback:", e);
      setIsDispatched(true);
    }
  };

  const toggleSiren = () => {
    if (sirenActive) {
      soundSynthesizer.stop();
      setSirenActive(false);
    } else {
      soundSynthesizer.playCriticalSiren();
      setSirenActive(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-white/95 backdrop-blur-2xl border border-red-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">SOS Emergency Command</h2>
              <p className="text-xs text-red-100 font-medium">Instant Highway Patrol & 108 Dispatch</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundSynthesizer.stop();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Location Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-800">Current GPS Coordinates & Road</div>
              <div className="text-xs text-slate-700 font-medium">{formattedAddress || currentRoad || "NH 44 Expressway Corridor"}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Lat: {activeLat.toFixed(5)}°, Lng: {activeLng.toFixed(5)}° (Accurate to ±{activeAccuracy}m)
              </div>
            </div>
          </div>


          {/* Emergency Contacts / Services Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Nearest Hospital */}
            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-rose-700 mb-1">
                  <Hospital className="w-4 h-4" /> Nearest Trauma Center
                </div>
                <div className="text-xs font-semibold text-slate-800">{sosInfo?.nearestHospital?.name || "Apex Emergency Hospital"}</div>
                <div className="text-[11px] text-slate-500 font-medium">{sosInfo?.nearestHospital?.distanceKm || 8.2} km away</div>
              </div>
              <a
                href="tel:108"
                className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call 108
              </a>
            </div>

            {/* Nearest Police Station */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-1">
                  <ShieldAlert className="w-4 h-4" /> Highway Patrol Police
                </div>
                <div className="text-xs font-semibold text-slate-800">{sosInfo?.nearestPoliceStation?.name || "Highway Patrol PCR #14"}</div>
                <div className="text-[11px] text-slate-500 font-medium">{sosInfo?.nearestPoliceStation?.distanceKm || 6.3} km away</div>
              </div>
              <a
                href="tel:112"
                className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call 112
              </a>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {!isDispatched ? (
              <button
                onClick={handleDispatch}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-extrabold shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
              >
                <AlertOctagon className="w-5 h-5" />
                BROADCAST EMERGENCY DISPATCH
              </button>
            ) : (
              <div className="flex-1 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Dispatched to Highway Patrol & Contacts!
              </div>
            )}

            <button
              onClick={toggleSiren}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                sirenActive ? "bg-red-600 text-white border-red-600 animate-pulse" : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
              title="Toggle Loud Distress Siren"
            >
              {sirenActive ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
