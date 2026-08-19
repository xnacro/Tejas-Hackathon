import React, { useRef, useEffect, useState, useCallback } from "react";
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
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  AlertOctagon
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
  const analyzerRef = useRef(new TemporalDrowsinessAnalyzer(8.0, 0.23, 0.60));

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [fps, setFps] = useState(0);
  const [trendHistory, setTrendHistory] = useState([14, 16, 18, 17, 19, 18, 17, 18, 19, 18]);

  // Sensitivity settings
  const [earThreshold, setEarThreshold] = useState(0.23);
  const [marThreshold, setMarThreshold] = useState(0.60);

  // Sync analyzer thresholds
  useEffect(() => {
    if (analyzerRef.current) {
      analyzerRef.current.setThresholds({ earThreshold, marThreshold });
    }
  }, [earThreshold, marThreshold]);

  // Start webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: "user"
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            setCameraActive(true);
          } catch (playErr) {
            console.warn("Video play error:", playErr);
          }
        };
      }
    } catch (err) {
      console.warn("Camera permission / access error:", err);
      setCameraError("Camera access required for real-time face tracking. Please allow camera access.");
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
        console.log("MediaPipe FaceMesh engine ready.");
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("MediaPipe initialization error:", err);
        setModelLoading(false);
      });

    // Auto-attempt camera start
    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  // 2. Real-Time Frame Processing Loop
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

      // Sync canvas dimensions with video
      if (canvas && video.videoWidth > 0 && canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Process FaceMesh frame
      if (faceMeshRef.current && !isProcessing) {
        isProcessing = true;
        try {
          faceMeshRef.current.onResults((results) => {
            if (results && results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              setFaceDetected(true);
              const landmarks = results.multiFaceLandmarks[0];
              const w = video.videoWidth || 640;
              const h = video.videoHeight || 480;

              // Compute Real Facial Geometry Metrics
              const leftEar = calculateEAR(landmarks, LEFT_EYE, w, h);
              const rightEar = calculateEAR(landmarks, RIGHT_EYE, w, h);
              const avgEar = (leftEar + rightEar) / 2.0;
              const mar = calculateMAR(landmarks, MOUTH, w, h);
              const headPose = estimateHeadPose(landmarks, w, h);

              // Temporal Analyzer (Sliding window Drowsiness & Microsleep detection)
              const analysis = analyzerRef.current.update(leftEar, rightEar, mar, headPose);

              // Update React App State in real time
              setAiState(analysis);

              // Draw Live Canvas Mesh Overlay
              if (canvas) {
                drawFaceMeshOverlay(canvas, landmarks, analysis);
              }
            } else {
              setFaceDetected(false);
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

  // Update audio alerts and trend history when score changes
  useEffect(() => {
    soundSynthesizer.setAlertLevel(aiState.alertLevel);

    setTrendHistory(prev => {
      const next = [...prev.slice(1), aiState.drowsinessScore];
      return next;
    });

    if (aiState.drowsinessScore >= 55 && onTriggerRestArea) {
      onTriggerRestArea();
    }
  }, [aiState.drowsinessScore, aiState.alertLevel, onTriggerRestArea]);

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

  return (
    <div className="flex flex-col gap-3.5 h-full">
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
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Adjust AI Thresholds"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings</span>
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

        {/* Real-time Facial Mesh Canvas (ALWAYS Mounted in DOM) */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none object-cover -scale-x-100 ${
            cameraActive ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Fallback Overlay when Camera is Stopped or Blocked */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3 animate-pulse">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Real-Time Face Drowsiness AI</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
              {cameraError || "Enable your webcam to start real-time computer vision tracking of eye blinks, yawning, and fatigue."}
            </p>
            <button
              onClick={startCamera}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-blue-500/30 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Allow & Start Real Camera</span>
            </button>
          </div>
        )}

        {/* Top Badges Bar */}
        <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
          {/* AI Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/20 backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full ${faceDetected ? "bg-emerald-400 animate-ping" : cameraActive ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`}></span>
            <span className="text-[10px] font-bold text-white tracking-wider">
              {modelLoading 
                ? "LOADING MODEL..." 
                : !cameraActive 
                ? "CAMERA OFF" 
                : faceDetected 
                ? `FACE TRACKING (${fps} FPS)` 
                : "LOOK AT CAMERA"}
            </span>
          </div>

          {/* LIVE Badge */}
          {cameraActive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/30 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
            </div>
          )}
        </div>

        {/* Face Bounding Box & Target Brackets */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-36 h-44 sm:w-44 sm:h-52">
              <div className={`absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 rounded-tl-lg transition-colors duration-300 ${
                isCritical ? "border-red-500" : isDrowsy ? "border-orange-500" : faceDetected ? "border-emerald-400" : "border-slate-600"
              }`} />
              <div className={`absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 rounded-tr-lg transition-colors duration-300 ${
                isCritical ? "border-red-500" : isDrowsy ? "border-orange-500" : faceDetected ? "border-emerald-400" : "border-slate-600"
              }`} />
              <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 rounded-bl-lg transition-colors duration-300 ${
                isCritical ? "border-red-500" : isDrowsy ? "border-orange-500" : faceDetected ? "border-emerald-400" : "border-slate-600"
              }`} />
              <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 rounded-br-lg transition-colors duration-300 ${
                isCritical ? "border-red-500" : isDrowsy ? "border-orange-500" : faceDetected ? "border-emerald-400" : "border-slate-600"
              }`} />
            </div>
          </div>
        )}

        {/* Floating Real Drowsiness Score HUD (Top-Left) */}
        <div className="absolute top-3.5 left-3.5 z-20 p-3 rounded-2xl glass-hud min-w-[130px] border border-white/20">
          <div className="text-[11px] font-medium text-slate-300 tracking-tight">Drowsiness Score</div>
          <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 ${scoreColor}`}>
            {aiState.drowsinessScore}%
          </div>
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            {aiState.stateLabel}
          </div>

          {/* Mini Waveform Sparkline */}
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

        {/* Bottom Real Sensor Bar Overlay inside Camera */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/85 border border-white/15 backdrop-blur-md text-[11px] font-medium text-white/90">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Eyes: <strong className={aiState.indicators?.eyes === "Closed" ? "text-red-400" : "text-emerald-400"}>{aiState.indicators?.eyes || "Open"}</strong></span>
            {aiState.metrics?.avgEar !== undefined && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                aiState.indicators?.eyes === "Closed" ? "bg-red-500/20 text-red-300" : "bg-blue-500/20 text-blue-300"
              }`}>
                EAR: {aiState.metrics.avgEar}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-amber-400" />
            <span>Yawn: <strong className={aiState.indicators?.yawning === "Yes" ? "text-orange-400" : "text-emerald-400"}>{aiState.indicators?.yawning || "No"}</strong></span>
            {aiState.metrics?.mar !== undefined && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                aiState.indicators?.yawning === "Yes" ? "bg-orange-500/20 text-orange-300" : "bg-amber-500/20 text-amber-300"
              }`}>
                MAR: {aiState.metrics.mar}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Head: <strong className={aiState.indicators?.headPose !== "Normal" ? "text-amber-400" : "text-emerald-400"}>{aiState.indicators?.headPose || "Normal"}</strong></span>
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
          title={isMuted ? "Unmute Audio Siren" : "Mute Audio Siren"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* AI Sensitivity & Threshold Settings Drawer */}
      {showControls && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" /> AI Detection Sensitivity
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Blinks: {aiState.metrics?.totalBlinks || 0}
            </span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span>Eye Closure (EAR) Threshold:</span>
              <strong className="text-blue-600 font-mono text-xs">{earThreshold} (Current: {aiState.metrics?.avgEar || 0})</strong>
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
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Tighter (0.16)</span>
              <span>Default (0.23)</span>
              <span>Sensitive (0.30)</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 font-medium pt-2 border-t border-slate-100">
              <span>Yawn Detection (MAR) Threshold:</span>
              <strong className="text-amber-600 font-mono text-xs">{marThreshold} (Current: {aiState.metrics?.mar || 0})</strong>
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
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Sensitive (0.45)</span>
              <span>Default (0.60)</span>
              <span>Wide (0.80)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
