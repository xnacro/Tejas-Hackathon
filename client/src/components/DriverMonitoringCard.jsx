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
  Zap,
  Clock,
  AlertOctagon,
  Timer,
  Play,
  RotateCcw,
  Sparkles
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
import { useTrafficSafety } from "../context/TrafficSafetyContext";

export default function DriverMonitoringCard({ 
  aiState, 
  setAiState, 
  onTriggerRestArea 
}) {
  const { demoMode } = useTrafficSafety();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const simCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const simAnimRef = useRef(null);
  const faceMeshRef = useRef(null);
  const analyzerRef = useRef(new TemporalDrowsinessAnalyzer(8.0, 0.23, 0.60, 4.5));
  const hasTriggeredRestAreaRef = useRef(false);
  const lastStateUpdateTimeRef = useRef(0);

  // Active Source: 'WEBCAM' | 'LIVE_FEED'
  const [sourceMode, setSourceMode] = useState("WEBCAM");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [fps, setFps] = useState(30);
  const [trendHistory, setTrendHistory] = useState([14, 16, 18, 17, 19, 18, 17, 18, 19, 18]);

  // Live simulation states for interactive testing
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

  // Sync demoMode with aiState
  useEffect(() => {
    if (demoMode === "DROWSY") {
      setCurrentClosureSec(3.8);
      setAiState({
        drowsinessScore: 78,
        state: "DROWSY",
        stateLabel: "Drowsy",
        statusMessage: "⚠️ Drowsiness Warning (78% Fatigue). Eyes closing!",
        alertLevel: 2,
        indicators: { eyes: "Closed", yawning: "No", headPose: "Down / Nodding" },
        metrics: { avgEar: 0.12, mar: 0.18, closureDurationSec: 3.8, totalBlinks: 14 }
      });
    } else if (demoMode === "CRITICAL") {
      setCurrentClosureSec(4.8);
      setAiState({
        drowsinessScore: 94,
        state: "CRITICAL",
        stateLabel: "Critical",
        statusMessage: "🚨 CRITICAL: Extreme Fatigue & Microsleep! Pull over immediately!",
        alertLevel: 3,
        indicators: { eyes: "Closed", yawning: "Yes", headPose: "Down / Nodding" },
        metrics: { avgEar: 0.08, mar: 0.72, closureDurationSec: 4.8, totalBlinks: 19 }
      });
    } else if (demoMode === "NORMAL") {
      setCurrentClosureSec(0);
      setAiState({
        drowsinessScore: 16,
        state: "ALERT",
        stateLabel: "Alert",
        statusMessage: "You are Alert. Keep driving safely!",
        alertLevel: 0,
        indicators: { eyes: "Open", yawning: "No", headPose: "Normal" },
        metrics: { avgEar: 0.32, mar: 0.14, closureDurationSec: 0, totalBlinks: 8 }
      });
    }
  }, [demoMode, setAiState]);

  // ==========================================
  // 1. PHYSICAL WEBCAM START / STOP
  // ==========================================
  const startCamera = async () => {
    try {
      setCameraError(null);
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
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
          setSourceMode("WEBCAM");
        } catch (playErr) {
          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current.play();
              setCameraActive(true);
              setSourceMode("WEBCAM");
            } catch (err2) {
              console.warn("Video play error:", err2);
            }
          };
        }
      }
    } catch (err) {
      console.warn("Camera permission error:", err);
      setCameraError("Camera access required for physical face tracking.");
      setCameraActive(false);
      setSourceMode("LIVE_FEED"); // Fallback to live animated face tracking
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

  // Initialize MediaPipe FaceMesh
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
        console.warn("MediaPipe init:", err);
        setModelLoading(false);
      });

    // Attempt auto-start camera
    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  // Frame processing loop for real webcam
  useEffect(() => {
    if (!cameraActive || sourceMode !== "WEBCAM") return;

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

              const leftEar = calculateEAR(landmarks, LEFT_EYE, w, h);
              const rightEar = calculateEAR(landmarks, RIGHT_EYE, w, h);
              const mar = calculateMAR(landmarks, MOUTH, w, h);
              const headPose = estimateHeadPose(landmarks, w, h);

              const analysis = analyzerRef.current.update(leftEar, rightEar, mar, headPose);
              const closureSec = analysis.metrics?.closureDurationSec || 0;
              setCurrentClosureSec(closureSec);

              if (canvas) {
                drawFaceMeshOverlay(canvas, landmarks, analysis);
              }

              const isSignificant = analysis.state === "CRITICAL" || analysis.state === "DROWSY";
              if (now - lastStateUpdateTimeRef.current > 100 || isSignificant) {
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
          // ignore frame errors
        } finally {
          isProcessing = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(processLoop);
    };

    animationFrameRef.current = requestAnimationFrame(processLoop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [cameraActive, sourceMode, setAiState]);

  // ==========================================
  // 2. LIVE PROCEDURAL DRIVER FEED (When Webcam offline)
  // ==========================================
  useEffect(() => {
    if (cameraActive && sourceMode === "WEBCAM") return;

    let startTime = performance.now();
    let blinkTimer = 0;

    const renderLiveFeed = (now) => {
      const canvas = simCanvasRef.current;
      if (!canvas) {
        simAnimRef.current = requestAnimationFrame(renderLiveFeed);
        return;
      }

      const ctx = canvas.getContext("2d");
      const width = canvas.width = 640;
      const height = canvas.height = 400;

      // Dark futuristic cockpit cabin
      ctx.fillStyle = "#070c18";
      ctx.fillRect(0, 0, width, height);
      const grad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, 320);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#020617");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const t = (now - startTime) / 1000;
      blinkTimer += 0.016;

      // Simulated biometrics based on active demo state
      let targetEar = 0.32;
      let targetMar = 0.12;
      let headPose = "Normal";
      let headX = Math.sin(t * 0.8) * 5;
      let headY = Math.cos(t * 1.1) * 3;

      if (aiState.state === "DROWSY" || aiState.state === "CRITICAL" || demoMode === "DROWSY" || demoMode === "CRITICAL") {
        targetEar = 0.08; // Eyes closed
        targetMar = aiState.indicators?.yawning === "Yes" ? 0.72 : 0.15;
        headY += 12; // nodding down
        headPose = "Down / Nodding";
      } else {
        // Natural eye blinking every ~3.5s
        if (blinkTimer % 3.5 < 0.2) targetEar = 0.08;
        else targetEar = 0.32 + Math.sin(t * 2) * 0.01;
      }

      const isDrowsyAlert = aiState.state === "CRITICAL" || aiState.state === "DROWSY";
      const meshColor = isDrowsyAlert ? "#ef4444" : aiState.state === "CAUTION" ? "#f59e0b" : "#38bdf8";

      const cx = width / 2 + headX;
      const cy = height / 2 - 10 + headY;

      // Head Silhouette
      ctx.beginPath();
      ctx.ellipse(cx, cy, 90, 120, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `${meshColor}40`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Left Eye
      const eyeH = targetEar * 45;
      ctx.fillStyle = isDrowsyAlert ? "#ef4444" : "#10b981";
      ctx.beginPath();
      ctx.ellipse(cx - 36, cy - 20, 17, Math.max(2, eyeH), 0, 0, Math.PI * 2);
      ctx.strokeStyle = meshColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (targetEar > 0.15) {
        ctx.beginPath();
        ctx.arc(cx - 36, cy - 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Right Eye
      ctx.beginPath();
      ctx.ellipse(cx + 36, cy - 20, 17, Math.max(2, eyeH), 0, 0, Math.PI * 2);
      ctx.strokeStyle = meshColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (targetEar > 0.15) {
        ctx.beginPath();
        ctx.arc(cx + 36, cy - 20, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyebrows
      ctx.strokeStyle = meshColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 52, cy - 36);
      ctx.quadraticCurveTo(cx - 36, cy - 44, cx - 18, cy - 34);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 18, cy - 34);
      ctx.quadraticCurveTo(cx + 36, cy - 44, cx + 52, cy - 36);
      ctx.stroke();

      // Nose Bridge & Tip
      ctx.beginPath();
      ctx.moveTo(cx, cy - 28);
      ctx.lineTo(cx - 4, cy + 12);
      ctx.lineTo(cx, cy + 18);
      ctx.lineTo(cx + 4, cy + 12);
      ctx.strokeStyle = `${meshColor}90`;
      ctx.stroke();

      // Mouth
      const mouthH = targetMar * 60;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 50, 24, Math.max(4, mouthH), 0, 0, Math.PI * 2);
      ctx.strokeStyle = targetMar > 0.5 ? "#f97316" : meshColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Landmark Dots
      const pts = [
        [cx - 36, cy - 20], [cx + 36, cy - 20],
        [cx, cy - 28], [cx, cy + 18],
        [cx, cy + 50], [cx - 60, cy + 18], [cx + 60, cy + 18],
        [cx - 30, cy + 85], [cx + 30, cy + 85], [cx, cy + 100]
      ];
      ctx.fillStyle = meshColor;
      pts.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Connections
      ctx.strokeStyle = `${meshColor}25`;
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dist = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(pts[i][0], pts[i][1]);
            ctx.lineTo(pts[j][0], pts[j][1]);
            ctx.stroke();
          }
        }
      }

      simAnimRef.current = requestAnimationFrame(renderLiveFeed);
    };

    simAnimRef.current = requestAnimationFrame(renderLiveFeed);
    return () => {
      if (simAnimRef.current) cancelAnimationFrame(simAnimRef.current);
    };
  }, [cameraActive, sourceMode, aiState.state, demoMode]);

  // Audio Alerts & Trend History
  useEffect(() => {
    soundSynthesizer.setAlertLevel(aiState.alertLevel);
    setTrendHistory(prev => [...prev.slice(1), aiState.drowsinessScore]);

    if (aiState.drowsinessScore >= 60) {
      if (!hasTriggeredRestAreaRef.current) {
        hasTriggeredRestAreaRef.current = true;
        if (onTriggerRestArea) onTriggerRestArea();
      }
    } else {
      hasTriggeredRestAreaRef.current = false;
    }
  }, [aiState.drowsinessScore, aiState.alertLevel]);

  const toggleSound = () => {
    const muted = soundSynthesizer.toggleMute();
    setIsMuted(muted);
  };

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
    ? "bg-red-50 border-red-300 text-red-700"
    : isDrowsy
    ? "bg-orange-50 border-orange-300 text-orange-700"
    : isCaution
    ? "bg-amber-50 border-amber-300 text-amber-700"
    : "bg-emerald-50 border-emerald-300 text-emerald-800";

  const strokeColor = isCritical ? "#ef4444" : isDrowsy ? "#f97316" : isCaution ? "#f59e0b" : "#10b981";

  // Build SVG sparkline path
  const svgWidth = 110;
  const svgHeight = 28;
  const points = trendHistory.map((val, idx) => {
    const x = (idx / (trendHistory.length - 1)) * svgWidth;
    const y = svgHeight - ((val - 0) / 100) * (svgHeight - 6) - 3;
    return `${x},${y}`;
  }).join(" ");

  const closureProgressPct = Math.min(100, Math.round((currentClosureSec / closureThresholdSec) * 100));

  return (
    <div className="flex flex-col gap-3 font-poppins">
      {/* Driver Monitoring Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              Driver Monitoring (AI Vision)
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
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
            <span>{cameraActive ? "Webcam Active" : "Start Webcam"}</span>
          </button>

          <button
            onClick={() => setShowControls(!showControls)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              showControls ? "bg-blue-100 text-blue-700" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            title="Adjust AI Alarm Settings"
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
          className={`w-full h-full object-cover -scale-x-100 ${
            cameraActive ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
          }`}
        />

        {/* Real-time Facial Mesh Canvas for Webcam */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none object-cover -scale-x-100 ${
            cameraActive ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Live Animated Driver Canvas (Active when webcam is offline) */}
        {!cameraActive && (
          <canvas
            ref={simCanvasRef}
            className="w-full h-full object-cover"
          />
        )}

        {/* Top Badges Bar */}
        <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/20 backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full ${cameraActive ? "bg-emerald-400 animate-ping" : "bg-purple-400 animate-pulse"}`}></span>
            <span className="text-[10px] font-impact text-white tracking-wider">
              {cameraActive ? `WEBCAM LIVE (${fps} FPS)` : "AI LIVE FEED"}
            </span>
          </div>
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

        {/* Real-Time Eye Closure Countdown Progress Alert */}
        {currentClosureSec > 0.4 && (
          <div className="absolute bottom-14 left-3 right-3 z-30 flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-950/90 border border-red-500/50 shadow-2xl backdrop-blur-md animate-in fade-in">
            <div className="flex items-center justify-between w-full text-white font-extrabold text-xs font-impact tracking-wide">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Timer className="w-4 h-4 text-red-400 animate-spin" />
                EYES CLOSED: <strong className="text-red-400 text-sm">{currentClosureSec.toFixed(1)}s</strong> / {closureThresholdSec}s
              </span>
              <span className="text-amber-300 text-[10px] font-impact">{closureProgressPct}% THRESHOLD</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/20">
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
