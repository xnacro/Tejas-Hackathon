import React, { useRef, useEffect, useState } from "react";
import { 
  ShieldCheck, 
  Eye, 
  Smile, 
  UserCheck, 
  Volume2, 
  VolumeX, 
  Camera, 
  CameraOff, 
  AlertTriangle,
  Sliders,
  Sparkles
} from "lucide-react";
import { soundSynthesizer } from "../utils/audioAlerts";

export default function DriverMonitoringCard({ 
  aiState, 
  setAiState, 
  onTriggerRestArea 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showSimControls, setShowSimControls] = useState(false);
  const [trendHistory, setTrendHistory] = useState([14, 16, 18, 17, 19, 18, 17, 18, 19, 18]);

  // Start webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Webcam access error:", err);
      setCameraError("Camera unavailable. Running simulated driver telemetry.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Update audio alerts and trend history when score changes
  useEffect(() => {
    soundSynthesizer.setAlertLevel(aiState.alertLevel);

    setTrendHistory(prev => {
      const next = [...prev.slice(1), aiState.drowsinessScore];
      return next;
    });

    if (aiState.drowsinessScore >= 60 && onTriggerRestArea) {
      onTriggerRestArea();
    }
  }, [aiState.drowsinessScore, aiState.alertLevel]);

  const toggleSound = () => {
    const muted = soundSynthesizer.toggleMute();
    setIsMuted(muted);
  };

  // Simulation presets
  const applyPreset = (score, state, message, eyes, yawning, headPose, alertLevel) => {
    setAiState({
      drowsinessScore: score,
      state,
      stateLabel: state,
      statusMessage: message,
      alertLevel,
      indicators: { eyes, yawning, headPose }
    });
  };

  // Color scheme based on state
  const isAlert = aiState.state === "ALERT";
  const isCaution = aiState.state === "CAUTION";
  const isDrowsy = aiState.state === "DROWSY";
  const isCritical = aiState.state === "CRITICAL";

  const scoreColor = isCritical 
    ? "text-red-500" 
    : isDrowsy 
    ? "text-orange-500" 
    : isCaution 
    ? "text-amber-400" 
    : "text-emerald-400";

  const statusBg = isCritical
    ? "bg-red-50/90 border-red-200 text-red-700"
    : isDrowsy
    ? "bg-orange-50/90 border-orange-200 text-orange-700"
    : isCaution
    ? "bg-amber-50/90 border-amber-200 text-amber-700"
    : "bg-emerald-50/90 border-emerald-200 text-emerald-800";

  const strokeColor = isCritical ? "#ef4444" : isDrowsy ? "#f97316" : isCaution ? "#f59e0b" : "#10b981";

  // Build SVG sparkline path
  const minVal = 0;
  const maxVal = 100;
  const svgWidth = 110;
  const svgHeight = 28;
  const points = trendHistory.map((val, idx) => {
    const x = (idx / (trendHistory.length - 1)) * svgWidth;
    const y = svgHeight - ((val - minVal) / (maxVal - minVal)) * (svgHeight - 6) - 3;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="flex flex-col gap-3.5 h-full">
      {/* Driver Monitoring Card Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Driver Monitoring</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimControls(!showSimControls)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Toggle AI Simulation Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulate AI</span>
          </button>
        </div>
      </div>

      {/* Main Camera Viewport Card */}
      <div className="relative w-full aspect-16/10 rounded-3xl overflow-hidden glass-panel border border-white shadow-lg bg-slate-900 flex items-center justify-center">
        {/* Real Video or Simulation Placeholder */}
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"
              alt="Driver Monitoring View"
              className="w-full h-full object-cover opacity-90 filter contrast-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
          </div>
        )}

        {/* LIVE Badge (Top Right) */}
        <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/70 border border-white/20 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-[11px] font-bold text-white tracking-wider">LIVE</span>
        </div>

        {/* Face Bounding Box & Target Brackets (Matching Reference) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-36 h-44 sm:w-44 sm:h-52">
            {/* 4 Corner Brackets */}
            <div className={`absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 rounded-tl-lg transition-colors duration-300 ${
              isCritical ? "border-red-500" : isDrowsy ? "border-orange-500" : "border-emerald-400"
            }`} />
            <div className={`absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 rounded-tr-lg transition-colors duration-300 ${
              isCritical ? "border-red-500" : isDrowsy ? "border-orange-500" : "border-emerald-400"
            }`} />
            <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 rounded-bl-lg transition-colors duration-300 ${
              isCritical ? "border-red-500" : isDrowsy ? "border-orange-500" : "border-emerald-400"
            }`} />
            <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 rounded-br-lg transition-colors duration-300 ${
              isCritical ? "border-red-500" : isDrowsy ? "border-orange-500" : "border-emerald-400"
            }`} />
          </div>
        </div>

        {/* Floating Translucent Drowsiness Score HUD (Top-Left) */}
        <div className="absolute top-3.5 left-3.5 z-20 p-3 rounded-2xl glass-hud min-w-[130px] border border-white/20">
          <div className="text-[11px] font-medium text-slate-300 tracking-tight">Drowsiness Score</div>
          <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 ${scoreColor}`}>
            {aiState.drowsinessScore}%
          </div>
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            {aiState.stateLabel}
          </div>

          {/* Mini Waveform Sparkline Graph */}
          <div className="mt-2 w-full h-7 overflow-hidden">
            <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
              <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
          </div>
        </div>

        {/* Bottom Sensor Bar Overlay inside Camera */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/75 border border-white/15 backdrop-blur-md text-[11px] font-medium text-white/90">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Eyes: <strong className={aiState.indicators.eyes === "Closed" ? "text-red-400" : "text-emerald-400"}>{aiState.indicators.eyes}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>Yawning: <strong className={aiState.indicators.yawning === "Yes" ? "text-orange-400" : "text-emerald-400"}>{aiState.indicators.yawning}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Head Pose: <strong className={aiState.indicators.headPose !== "Normal" ? "text-amber-400" : "text-emerald-400"}>{aiState.indicators.headPose}</strong></span>
          </div>
        </div>
      </div>

      {/* Driver Status Banner Under Video */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-all duration-300 shadow-xs ${statusBg}`}>
        <div className="flex items-center gap-2">
          {isAlert ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 stroke-[2.5]" />
          )}
          <span className="text-xs font-bold leading-tight">{aiState.statusMessage}</span>
        </div>

        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg hover:bg-black/5 text-slate-700 transition-colors cursor-pointer"
          title={isMuted ? "Unmute Alerts" : "Mute Alerts"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Interactive Simulation Drawer / Controls */}
      {showSimControls && (
        <div className="p-3.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-md backdrop-blur-md space-y-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> AI Drowsiness Simulator
            </span>
            <span className="text-blue-600 font-extrabold">{aiState.drowsinessScore}%</span>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => applyPreset(18, "ALERT", "You are Alert. Keep driving safely!", "Open", "No", "Normal", 0)}
              className="py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200"
            >
              🟢 Alert (18%)
            </button>
            <button
              onClick={() => applyPreset(45, "CAUTION", "You appear tired. Please stay alert.", "Open", "Yes", "Normal", 1)}
              className="py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200"
            >
              🟡 Caution (45%)
            </button>
            <button
              onClick={() => applyPreset(72, "DROWSY", "Drowsiness detected. Please consider taking a break.", "Closed", "Yes", "Down / Nodding", 2)}
              className="py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200"
            >
              🟠 Drowsy (72%)
            </button>
            <button
              onClick={() => applyPreset(92, "CRITICAL", "CRITICAL DROWSINESS! Please stop driving safely immediately.", "Closed", "Yes", "Down / Nodding", 3)}
              className="py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200"
            >
              🔴 Critical (92%)
            </button>
          </div>

          {/* Manual Slider */}
          <input
            type="range"
            min="0"
            max="100"
            value={aiState.drowsinessScore}
            onChange={(e) => {
              const val = Number(e.target.value);
              let state = "ALERT";
              let msg = "You are Alert. Keep driving safely!";
              let alertLevel = 0;
              let eyes = "Open";
              let yawning = "No";
              let headPose = "Normal";

              if (val >= 80) {
                state = "CRITICAL";
                msg = "CRITICAL DROWSINESS! Please stop driving safely immediately.";
                alertLevel = 3;
                eyes = "Closed";
                yawning = "Yes";
                headPose = "Down / Nodding";
              } else if (val >= 60) {
                state = "DROWSY";
                msg = "Drowsiness detected. Please consider taking a break.";
                alertLevel = 2;
                eyes = "Closed";
                yawning = "Yes";
                headPose = "Down / Nodding";
              } else if (val >= 30) {
                state = "CAUTION";
                msg = "You appear tired. Please stay alert.";
                alertLevel = 1;
                eyes = "Open";
                yawning = "Yes";
              }

              applyPreset(val, state, msg, eyes, yawning, headPose, alertLevel);
            }}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
