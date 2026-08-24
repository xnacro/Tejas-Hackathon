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
  Zap,
  Clock,
  AlertOctagon,
  Timer
} from "lucide-react";
import { soundSynthesizer } from "../utils/audioAlerts";
import { 
  initializeFaceMesh, 
  calculateEAR, 
  calculateMAR, 
  estimateHeadPose, 
  TemporalDrowsinessAnalyzer,
  drawFaceMeshOverlay,
  LEFT_EYE,
  RIGHT_EYE,
  MOUTH
} from "../utils/faceMeshDetector";

export default function DriverMonitoringCard({ 
  aiState, 
  setAiState, 
  onTriggerRestArea 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const faceMeshRef = useRef(null);
  const analyzerRef = useRef(new TemporalDrowsinessAnalyzer(8.0, 0.23, 0.60, 4.5));
  const hasTriggeredRestAreaRef = useRef(false);
  const lastStateUpdateTimeRef = useRef(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [fps, setFps] = useState(0);
  const [trendHistory, setTrendHistory] = useState([14, 16, 18, 17, 19, 18, 17, 18, 19, 18]);

  // Live indicators for rapid UI responsiveness
  const [currentClosureSec, setCurrentClosureSec] = useState(0);

  // User Customizable AI Thresholds
  const [closureThresholdSec, setClosureThresholdSec] = useState(4.5); // Default 4.5 seconds
  const [earThreshold, setEarThreshold] = useState(0.23);
  const [marThreshold, setMarThreshold] = useState(0.60);

  // Sync analyzer thresholds
  useEffect(() => {
    if (analyzerRef.current) {
      analyzerRef.current.setThresholds({ 
        earThreshold, 
        marThreshold, 
        closureThresholdSec 
      });
    }
  }, [earThreshold, marThreshold, closureThresholdSec]);

  // Start webcam with fallback-tolerant constraints
  const startCamera = async () => {
    try {
      setCameraError(null);
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 }, 
            facingMode: "user"
          },
          audio: false
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          setCameraActive(true);
        } catch (playErr) {
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current.play();
              setCameraActive(true);
            } catch (err2) {
              console.warn("Video play error:", err2);
            }
          };
        }
      }
    } catch (err) {
      console.warn("Camera permission error:", err);
      setCameraError("Camera access required for real-time face tracking. Please allow camera access in browser.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setFaceDetected(false);
    setCurrentClosureSec(0);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // 1. Initialize FaceMesh & auto-start Camera on mount
  useEffect(() => {
    let isMounted = true;
    setModelLoading(true);

    initializeFaceMesh()
      .then((fm) => {
        if (!isMounted) return;
        faceMeshRef.current = fm;
        setModelLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("MediaPipe initialization error:", err);
        setModelLoading(false);
      });

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  // 2. Real-Time Frame Processing Loop with Throttled State Updates
  useEffect(() => {
    if (!cameraActive) return;

    let lastTime = performance.now();
    let frameCounter = 0;
    let isProcessing = false;

    const processLoop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processLoop);
        return;
      }

      const now = performance.now();
      frameCounter++;
      if (now - lastTime >= 1000) {
        setFps(frameCounter);
        frameCounter = 0;
        lastTime = now;
      }

      if (canvas && video.videoWidth > 0 && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      if (faceMeshRef.current && !isProcessing) {
        isProcessing = true;
        try {
          faceMeshRef.current.onResults((results) => {
            if (results && results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              setFaceDetected(true);
              const landmarks = results.multiFaceLandmarks[0];
              const w = video.videoWidth || 640;
              const h = video.videoHeight || 480;

              // 1. Calculate Geometry
              const leftEar = calculateEAR(landmarks, LEFT_EYE, w, h);
              const rightEar = calculateEAR(landmarks, RIGHT_EYE, w, h);
              const mar = calculateMAR(landmarks, MOUTH, w, h);
              const headPose = estimateHeadPose(landmarks, w, h);

              // 2. Temporal Analysis
              const analysis = analyzerRef.current.update(leftEar, rightEar, mar, headPose);
              const closureSec = analysis.metrics?.closureDurationSec || 0;
              setCurrentClosureSec(closureSec);

              // 3. Draw live canvas mesh
              if (canvas) {
                drawFaceMeshOverlay(canvas, landmarks, analysis);
              }

              // 4. Throttled parent state update
              const isSignificant = analysis.state === "CRITICAL" || analysis.state === "DROWSY";
              if (now - lastStateUpdateTimeRef.current > 120 || isSignificant) {
                lastStateUpdateTimeRef.current = now;
                setAiState(analysis);
              }
            } else {
              setFaceDetected(false);
              setCurrentClosureSec(0);
              if (canvas) {
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
            }
          });

          await faceMeshRef.current.send({ image: video });
        } catch (err) {
          // Frame error
        } finally {
          isProcessing = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(processLoop);
    };

    animationFrameRef.current = requestAnimationFrame(processLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, setAiState]);

  // Audio Alerts & Single-Fire Rest Area Modal trigger
  useEffect(() => {
    soundSynthesizer.setAlertLevel(aiState.alertLevel);

    setTrendHistory(prev => {
      const next = [...prev.slice(1), aiState.drowsinessScore];
      return next;
    });

    if (aiState.drowsinessScore >= 60) {
      if (!hasTriggeredRestAreaRef.current) {
        hasTriggeredRestAreaRef.current = true;
        if (onTriggerRestArea) {
          onTriggerRestArea();
        }
      }
    } else {
      hasTriggeredRestAreaRef.current = false;
    }
  }, [aiState.drowsinessScore, aiState.alertLevel]);

  const toggleSound = () => {
    const muted = soundSynthesizer.toggleMute();
    setIsMuted(muted);
  };

  // Color scheme based on real state
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
    ? "bg-red-50/95 border-red-300 text-red-700"
    : isDrowsy
    ? "bg-orange-50/95 border-orange-300 text-orange-700"
    : isCaution
    ? "bg-amber-50/95 border-amber-300 text-amber-700"
    : "bg-emerald-50/95 border-emerald-300 text-emerald-800";

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

  // Progress percentage of eye closure towards critical threshold
  const closureProgressPct = Math.min(100, Math.round((currentClosureSec / closureThresholdSec) * 100));

  return (
    <div className="flex flex-col gap-3.5 h-full font-poppins">
      {/* Driver Monitoring Card Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Driver Monitoring (AI Vision)</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (cameraActive) stopCamera();
              else startCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              cameraActive 
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
            }`}
          >
            {cameraActive ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            <span>{cameraActive ? "Camera Online" : "Start Camera"}</span>
          </button>

          <button
            onClick={() => setShowControls(!showControls)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              showControls ? "bg-blue-100 text-blue-700" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            title="Adjust Eye Closure Alarm Duration & Settings"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="font-mono">{closureThresholdSec}s</span>
          </button>
        </div>
      </div>

      {/* Main Camera Viewport Card */}
      <div className="relative w-full aspect-16/10 rounded-3xl overflow-hidden glass-panel border border-white shadow-lg bg-slate-950 flex items-center justify-center">
        {/* Real Video Element (ALWAYS Mounted in DOM) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${
            cameraActive ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
          }`}
        />

        {/* Real-time Facial Mesh Canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none object-cover -scale-x-100 ${
            cameraActive ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Fallback Overlay when Camera is Stopped */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 backdrop-blur-md z-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3 animate-pulse">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1 font-poppins">Real-Time Face Drowsiness AI</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed font-poppins">
              {cameraError || "Enable webcam for real-time computer vision tracking of eye blinks, fatigue, and yawning."}
            </p>
            <button
              onClick={startCamera}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Allow & Start Camera</span>
            </button>
          </div>
        )}

        {/* Top Badges Bar */}
        <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/20 backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full ${faceDetected ? "bg-emerald-400 animate-ping" : cameraActive ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`}></span>
            <span className="text-[10px] font-impact text-white tracking-wider">
              {modelLoading 
                ? "LOADING AI..." 
                : !cameraActive 
                ? "CAMERA OFF" 
                : faceDetected 
                ? `AI ACTIVE (${fps} FPS)` 
                : "LOOK AT CAMERA"}
            </span>
          </div>

          {cameraActive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/30 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] font-impact text-white tracking-wider">LIVE</span>
            </div>
          )}
        </div>

        {/* Floating Real Drowsiness Score HUD (Top-Left) */}
        <div className="absolute top-3.5 left-3.5 z-20 p-3 rounded-2xl glass-hud min-w-[130px] border border-white/20">
          <div className="text-[11px] font-medium text-slate-300 tracking-tight font-poppins">Drowsiness Score</div>
          <div className={`text-2xl sm:text-3xl font-impact tracking-tight mt-0.5 ${scoreColor}`}>
            {aiState.drowsinessScore}%
          </div>
          <div className="text-[11px] font-impact text-slate-300 uppercase tracking-wide">
            {aiState.stateLabel}
          </div>

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

        {/* Real-Time Eye Closure Countdown / Progress Bar (Shows when eyes are closed) */}
        {cameraActive && currentClosureSec > 0.4 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-slate-950/90 border border-red-500/50 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-white font-extrabold text-xs font-impact tracking-wide">
              <Timer className="w-4 h-4 text-red-400 animate-spin" />
              <span>Eyes Closed: <strong className="text-red-400 text-sm">{currentClosureSec.toFixed(1)}s</strong> / {closureThresholdSec}s</span>
            </div>
            <div className="w-48 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-white/20">
              <div 
                className={`h-full transition-all duration-100 ${
                  currentClosureSec >= closureThresholdSec 
                    ? "bg-red-500 animate-pulse" 
                    : currentClosureSec >= closureThresholdSec * 0.6 
                    ? "bg-orange-500" 
                    : "bg-amber-400"
                }`}
                style={{ width: `${closureProgressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-300 font-medium">
              {currentClosureSec >= closureThresholdSec ? "🚨 CRITICAL MICROSLEEP ALARM!" : "Microsleep countdown..."}
            </span>
          </div>
        )}

        {/* Bottom Real Sensor Bar Overlay inside Camera */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/85 border border-white/15 backdrop-blur-md text-[11px] font-medium text-white/90">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Eyes: <strong className={aiState.indicators?.eyes === "Closed" ? "text-red-400 font-impact" : "text-emerald-400 font-impact"}>{aiState.indicators?.eyes || "Open"}</strong></span>
            {aiState.metrics?.avgEar !== undefined && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-impact ${
                aiState.indicators?.eyes === "Closed" ? "bg-red-500/20 text-red-300" : "bg-blue-500/20 text-blue-300"
              }`}>
                EAR: {aiState.metrics.avgEar}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>Yawn: <strong className={aiState.indicators?.yawning === "Yes" ? "text-orange-400 font-impact" : "text-emerald-400 font-impact"}>{aiState.indicators?.yawning || "No"}</strong></span>
            {aiState.metrics?.mar !== undefined && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-impact ${
                aiState.indicators?.yawning === "Yes" ? "bg-orange-500/20 text-orange-300" : "bg-amber-500/20 text-amber-300"
              }`}>
                MAR: {aiState.metrics.mar}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Head: <strong className={aiState.indicators?.headPose !== "Normal" ? "text-amber-400 font-impact" : "text-emerald-400 font-impact"}>{aiState.indicators?.headPose || "Normal"}</strong></span>
          </div>
        </div>
      </div>

      {/* Driver Status Banner Under Video */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-all duration-300 shadow-xs ${statusBg}`}>
        <div className="flex items-center gap-2">
          {isAlert ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
          ) : isCritical ? (
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 stroke-[2.5] animate-bounce" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 stroke-[2.5]" />
          )}
          <span className="text-xs font-bold leading-tight">{aiState.statusMessage}</span>
        </div>

        <button
          onClick={toggleSound}
          className="p-1.5 rounded-lg hover:bg-black/5 text-slate-700 transition-colors cursor-pointer"
          title={isMuted ? "Unmute Siren" : "Mute Siren"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* AI Sensitivity & Threshold Settings Drawer */}
      {showControls && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-lg space-y-3.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" /> Driver Drowsiness Custom Settings
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Total Blinks: {aiState.metrics?.totalBlinks || 0}
            </span>
          </div>

          {/* 1. EYE CLOSURE DURATION THRESHOLD */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Eye Closure Alarm Delay:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-xs font-extrabold">
                {closureThresholdSec} seconds
              </span>
            </div>

            <input
              type="range"
              min="2.0"
              max="8.0"
              step="0.5"
              value={closureThresholdSec}
              onChange={(e) => setClosureThresholdSec(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />

            <div className="flex items-center justify-between gap-1.5 pt-1">
              <button
                onClick={() => setClosureThresholdSec(3.0)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                  closureThresholdSec === 3.0 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                3.0s (Fast)
              </button>
              <button
                onClick={() => setClosureThresholdSec(4.5)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                  closureThresholdSec === 4.5 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                4.5s (Default)
              </button>
              <button
                onClick={() => setClosureThresholdSec(6.0)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                  closureThresholdSec === 6.0 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                6.0s (Relaxed)
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Alarm triggers only when your eyes stay closed continuously for at least <strong>{closureThresholdSec} seconds</strong>.
            </p>
          </div>

          {/* 2. SENSITIVITY THRESHOLDS */}
          <div className="space-y-2.5 text-[11px] pt-1">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span>Eye Openness (EAR) Sensitivity:</span>
              <strong className="text-slate-800 font-mono text-xs">{earThreshold} (Live EAR: {aiState.metrics?.avgEar || 0})</strong>
            </div>
            <input
              type="range"
              min="0.16"
              max="0.30"
              step="0.01"
              value={earThreshold}
              onChange={(e) => setEarThreshold(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />

            <div className="flex items-center justify-between text-slate-600 font-medium pt-1.5 border-t border-slate-100">
              <span>Yawn Detection (MAR) Threshold:</span>
              <strong className="text-slate-800 font-mono text-xs">{marThreshold} (Live MAR: {aiState.metrics?.mar || 0})</strong>
            </div>
            <input
              type="range"
              min="0.45"
              max="0.80"
              step="0.01"
              value={marThreshold}
              onChange={(e) => setMarThreshold(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
