import React, { useRef, useEffect, useState } from "react";
import { 
  Crosshair, 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Scan, 
  Layers, 
  Camera, 
  RefreshCw,
  Navigation
} from "lucide-react";
import { usePerception } from "../context/PerceptionContext";

export default function RoadObjectDetectionView() {
  const canvasRef = useRef(null);
  const {
    objects,
    selectedObjectId,
    setSelectedObjectId,
    pathPlan,
    egoVehicle,
    scenarioStep
  } = usePerception();

  const [fps, setFps] = useState(30);

  // Render CV overlays on dynamic simulated Indian road canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Clear Canvas
      ctx.clearRect(0, 0, w, h);

      // 2. Draw Simulated Indian Road Horizon & Unstructured Asphalt Corridor
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.48);
      skyGrad.addColorStop(0, "#0b132b");
      skyGrad.addColorStop(1, "#1c2541");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.48);

      // Road ground gradient
      const roadGrad = ctx.createLinearGradient(0, h * 0.48, 0, h);
      roadGrad.addColorStop(0, "#1e293b");
      roadGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, h * 0.48, w, h * 0.52);

      // Horizon line
      const horizonY = h * 0.48;

      // Unmarked Indian Road Edges (Vanishing Perspective)
      ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);

      // Left shoulder
      ctx.beginPath();
      ctx.moveTo(w * 0.48, horizonY);
      ctx.lineTo(w * 0.05, h);
      ctx.stroke();

      // Right shoulder
      ctx.beginPath();
      ctx.moveTo(w * 0.52, horizonY);
      ctx.lineTo(w * 0.95, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Dynamic Green Drivable Free-Space Corridor Polygon (Adaptive Polygon)
      ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
      ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.49, horizonY);
      ctx.lineTo(w * 0.85, h);
      ctx.lineTo(w * 0.15, h);
      ctx.lineTo(w * 0.51, horizonY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 4. Draw Adaptive Path Trajectory Spline (Forward Corridor)
      if (pathPlan && pathPlan.adaptivePath) {
        ctx.beginPath();
        const isReplanning = pathPlan.status === "REPLANNING";
        ctx.strokeStyle = isReplanning ? "#f43f5e" : "#10b981";
        ctx.lineWidth = 3;
        ctx.shadowColor = isReplanning ? "rgba(244, 63, 94, 0.8)" : "rgba(16, 185, 129, 0.8)";
        ctx.shadowBlur = 10;

        pathPlan.adaptivePath.forEach((pt, idx) => {
          // Project (x, y) ego coordinates to canvas (cx, cy)
          const forwardPct = pt.y / 40.0;
          const py = h - forwardPct * (h - horizonY);
          const lateralScale = (1 - forwardPct * 0.8) * (w * 0.4);
          const px = w * 0.5 + (pt.x / 4.0) * lateralScale;

          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });

        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      // 5. Draw Detected Objects Bounding Boxes with CV Corner Brackets
      objects.forEach(obj => {
        const { x: boxX, y: boxY, w: boxW, h: boxH } = obj.boundingBox2D;
        const rx = (boxX / 100) * w;
        const ry = (boxY / 100) * h;
        const rw = (boxW / 100) * w;
        const rh = (boxH / 100) * h;

        const isHigh = obj.risk === "HIGH";
        const isMed = obj.risk === "MEDIUM";
        const color = isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#38bdf8";

        // Semi-transparent box background
        ctx.fillStyle = isHigh ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.08)";
        ctx.fillRect(rx, ry, rw, rh);

        // Bounding Box Border
        ctx.strokeStyle = color;
        ctx.lineWidth = isHigh ? 2.5 : 1.5;
        ctx.strokeRect(rx, ry, rw, rh);

        // High-Tech Corner Reticle Brackets
        const bracketLen = 8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(rx, ry + bracketLen); ctx.lineTo(rx, ry); ctx.lineTo(rx + bracketLen, ry);
        // Top-right
        ctx.moveTo(rx + rw - bracketLen, ry); ctx.lineTo(rx + rw, ry); ctx.lineTo(rx + rw, ry + bracketLen);
        // Bottom-left
        ctx.moveTo(rx, ry + rh - bracketLen); ctx.lineTo(rx, ry + rh); ctx.lineTo(rx + bracketLen, ry + rh);
        // Bottom-right
        ctx.moveTo(rx + rw - bracketLen, ry + rh); ctx.lineTo(rx + rw, ry + rh); ctx.lineTo(rx + rw, ry + rh - bracketLen);
        ctx.stroke();

        // Historical tracking trail line
        if (obj.history && obj.history.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.moveTo(rx + rw / 2, ry + rh);
          ctx.lineTo(rx + rw / 2 - 18, ry + rh - 12);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Object Tracking ID & Category Badge Tag (Top)
        const tagH = 18;
        ctx.fillStyle = color;
        ctx.fillRect(rx, ry - tagH, rw, tagH);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.fillText(`${obj.type} ${obj.trackId} (${Math.round(obj.confidence * 100)}%)`, rx + 4, ry - 5);

        // Distance & Risk Tag (Bottom)
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(rx, ry + rh, rw, 16);

        ctx.fillStyle = color;
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillText(`${obj.distance}m • ${obj.risk}`, rx + 4, ry + rh + 12);

        // Trajectory Directional Arrow
        if (obj.velocityMs > 0) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(rx + rw / 2, ry + rh / 2);
          const arrowOffset = obj.position.x < 0 ? 25 : -25;
          ctx.lineTo(rx + rw / 2 + arrowOffset, ry + rh / 2 + 10);
          ctx.stroke();
        }
      });

      // 6. Center Collision Warning Crosshair (if Collision Predicted)
      if (pathPlan && pathPlan.collisionPredicted) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(w * 0.44, h * 0.62, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.fillText("⚠️ COLLISION RISK (TTC: 1.8s)", w * 0.44 - 65, h * 0.62 - 42);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [objects, pathPlan]);

  return (
    <div className="relative w-full aspect-16/10 rounded-3xl overflow-hidden glass-panel border border-white shadow-lg bg-slate-950 flex items-center justify-center">
      {/* 1. Real-time CV Render Canvas */}
      <canvas
        ref={canvasRef}
        width={640}
        height={400}
        className="w-full h-full object-cover"
      />

      {/* 2. Top-Left HUD: Perception Status */}
      <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-blue-500/40 text-white backdrop-blur-md shadow-lg">
          <Scan className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span className="text-[11px] font-black tracking-wider uppercase">Road CV Detection</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
            30 FPS
          </span>
        </div>
      </div>

      {/* 3. Top-Right Mode Badges */}
      <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-white/20 text-white backdrop-blur-md text-[10px] font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>TRACKING {objects.length} OBJECTS</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/85 border border-red-500/30 text-white backdrop-blur-md text-[10px] font-bold">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span>CAMERA LIVE</span>
        </div>
      </div>

      {/* 4. Adaptive Path Replanning Banner (Floating in Video) */}
      <div className="absolute bottom-11 inset-x-3.5 z-20 flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-white/20 text-white backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-2 text-xs">
          {pathPlan.status === "REPLANNING" ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span className="font-bold">{pathPlan.statusMessage}</span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/30">
            LAT_SWERVE: +1.35m
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">
            MARGIN: 2.1m
          </span>
        </div>
      </div>

      {/* 5. Bottom CV Detection Stream Feed Strip */}
      <div className="absolute bottom-2.5 inset-x-3.5 z-20 flex items-center justify-between text-[10px] font-mono text-slate-300 px-2">
        <span>DETECTION: PERSON (94%), AUTO (96%), BIKE (91%)</span>
        <span>EKF TRACKER: ACTIVE • 24ms</span>
      </div>
    </div>
  );
}
