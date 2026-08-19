// Surakha AI - Real-Time MediaPipe Face Mesh & Drowsiness CV Pipeline

export const LEFT_EYE = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
export const MOUTH = [78, 81, 13, 311, 308, 402, 14, 178];
export const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
];

/**
 * Calculates Euclidean distance between 2 points.
 */
export function euclideanDist(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates Eye Aspect Ratio (EAR).
 * EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
 */
export function calculateEAR(landmarks, eyeIndices, imgW = 640, imgH = 480) {
  if (!landmarks || landmarks.length < 468) return 0.0;
  const pts = eyeIndices.map(idx => ({
    x: (landmarks[idx].x || 0) * imgW,
    y: (landmarks[idx].y || 0) * imgH
  }));

  const d_v1 = euclideanDist(pts[1], pts[5]);
  const d_v2 = euclideanDist(pts[2], pts[4]);
  const d_h = euclideanDist(pts[0], pts[3]);

  if (d_h === 0) return 0.0;
  return (d_v1 + d_v2) / (2.0 * d_h);
}

/**
 * Calculates Mouth Aspect Ratio (MAR).
 * MAR = (|p2 - p8| + |p3 - p7| + |p4 - p6|) / (2 * |p1 - p5|)
 */
export function calculateMAR(landmarks, mouthIndices, imgW = 640, imgH = 480) {
  if (!landmarks || landmarks.length < 468) return 0.0;
  const pts = mouthIndices.map(idx => ({
    x: (landmarks[idx].x || 0) * imgW,
    y: (landmarks[idx].y || 0) * imgH
  }));

  const d_v1 = euclideanDist(pts[1], pts[7]);
  const d_v2 = euclideanDist(pts[2], pts[6]);
  const d_v3 = euclideanDist(pts[3], pts[5]);
  const d_h = euclideanDist(pts[0], pts[4]);

  if (d_h === 0) return 0.0;
  return (d_v1 + d_v2 + d_v3) / (2.0 * d_h);
}

/**
 * Estimates Pitch, Yaw, Roll and Head Nodding / Looking Away status.
 */
export function estimateHeadPose(landmarks, imgW = 640, imgH = 480) {
  try {
    if (!landmarks || landmarks.length < 468) {
      return { pitch: 0, yaw: 0, roll: 0, status: "Normal" };
    }

    const nose = { x: landmarks[1].x * imgW, y: landmarks[1].y * imgH };
    const chin = { x: landmarks[199].x * imgW, y: landmarks[199].y * imgH };
    const leftEye = { x: landmarks[33].x * imgW, y: landmarks[33].y * imgH };
    const rightEye = { x: landmarks[263].x * imgW, y: landmarks[263].y * imgH };

    const distLeft = euclideanDist(nose, leftEye);
    const distRight = euclideanDist(nose, rightEye);
    const totalEyeDist = euclideanDist(leftEye, rightEye);

    const yawRatio = (distRight - distLeft) / (totalEyeDist + 1e-6);
    const yawDeg = Math.max(-90, Math.min(90, yawRatio * 90.0));

    const eyeMidY = (leftEye.y + rightEye.y) / 2.0;
    let faceHeight = chin.y - eyeMidY;
    if (faceHeight <= 0) faceHeight = 100.0;

    const noseRelY = (nose.y - eyeMidY) / faceHeight;
    const pitchDeg = (noseRelY - 0.40) * 80.0;

    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const rollDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    let status = "Normal";
    if (pitchDeg > 18.0) {
      status = "Down / Nodding";
    } else if (pitchDeg < -18.0) {
      status = "Up";
    } else if (Math.abs(yawDeg) > 22.0) {
      status = "Looking Away";
    }

    return {
      pitch: Math.round(pitchDeg * 10) / 10,
      yaw: Math.round(yawDeg * 10) / 10,
      roll: Math.round(rollDeg * 10) / 10,
      status
    };
  } catch (e) {
    return { pitch: 0, yaw: 0, roll: 0, status: "Normal" };
  }
}

/**
 * Rolling Window Temporal Analyzer for Drowsiness Detection
 */
export class TemporalDrowsinessAnalyzer {
  constructor(windowSeconds = 8.0, earThreshold = 0.23, marThreshold = 0.60) {
    this.windowSeconds = windowSeconds;
    this.earThreshold = earThreshold;
    this.marThreshold = marThreshold;

    this.history = [];
    this.eyeClosedStartTime = null;
    this.yawnStartTime = null;
    this.recentYawns = [];
    this.totalBlinks = 0;
    this.lastBlinkTime = 0;
  }

  setThresholds({ earThreshold, marThreshold, windowSeconds }) {
    if (earThreshold !== undefined && !isNaN(earThreshold)) this.earThreshold = Number(earThreshold);
    if (marThreshold !== undefined && !isNaN(marThreshold)) this.marThreshold = Number(marThreshold);
    if (windowSeconds !== undefined && !isNaN(windowSeconds)) this.windowSeconds = Number(windowSeconds);
  }

  update(leftEar, rightEar, mar, headPose) {
    const now = performance.now() / 1000.0;
    const avgEar = (leftEar + rightEar) / 2.0;

    const isEyeClosed = avgEar < this.earThreshold;
    const isYawning = mar > this.marThreshold;
    const isHeadDown = (headPose.pitch || 0) > 18.0 || headPose.status === "Down / Nodding";

    // 1. Eye closure duration tracking
    let closureDuration = 0.0;
    if (isEyeClosed) {
      if (this.eyeClosedStartTime === null) {
        this.eyeClosedStartTime = now;
      }
      closureDuration = now - this.eyeClosedStartTime;
    } else {
      if (this.eyeClosedStartTime !== null) {
        const closedTime = now - this.eyeClosedStartTime;
        // Count normal blinks (between 0.08s and 0.45s)
        if (closedTime >= 0.08 && closedTime <= 0.45) {
          this.totalBlinks += 1;
          this.lastBlinkTime = now;
        }
      }
      this.eyeClosedStartTime = null;
      closureDuration = 0.0;
    }

    // 2. Yawning duration tracking
    let yawnDuration = 0.0;
    if (isYawning) {
      if (this.yawnStartTime === null) {
        this.yawnStartTime = now;
      }
      yawnDuration = now - this.yawnStartTime;
      if (yawnDuration > 1.2) {
        if (
          this.recentYawns.length === 0 ||
          now - this.recentYawns[this.recentYawns.length - 1] > 3.5
        ) {
          this.recentYawns.push(now);
        }
      }
    } else {
      this.yawnStartTime = null;
    }

    // 3. Sliding history
    this.history.push({
      time: now,
      avgEar,
      mar,
      isEyeClosed,
      isYawning,
      isHeadDown
    });

    // Clean older than window
    this.history = this.history.filter(item => now - item.time <= this.windowSeconds);
    this.recentYawns = this.recentYawns.filter(t => now - t <= 60.0);

    // 4. Compute metrics
    const totalSamples = this.history.length;
    let perclos = 0.0;
    let headDownPct = 0.0;

    if (totalSamples > 0) {
      const closedSamples = this.history.filter(i => i.isEyeClosed).length;
      perclos = (closedSamples / totalSamples) * 100.0;

      const headDownSamples = this.history.filter(i => i.isHeadDown).length;
      headDownPct = (headDownSamples / totalSamples) * 100.0;
    }

    const yawnsInWindow = this.recentYawns.length;

    // 5. Score computation
    let score = 0.0;

    // Baseline alert score
    score += Math.min(45.0, perclos * 1.5);

    // Instant continuous prolonged closure (Microsleep alert!)
    if (closureDuration > 0.8) {
      score += Math.min(55.0, (closureDuration - 0.8) * 45.0);
    }

    // Yawning factor
    if (yawnsInWindow >= 1) {
      score += Math.min(25.0, yawnsInWindow * 12.5);
    }

    // Head posture factor
    if (isHeadDown) {
      score += 15.0;
    }
    score += Math.min(15.0, headDownPct * 0.3);

    // Bound 0 - 100
    score = Math.max(0.0, Math.min(100.0, score));

    // 6. Assign Multi-level State
    let state = "ALERT";
    let stateLabel = "Alert";
    let statusMessage = "You are Alert. Keep driving safely!";
    let alertLevel = 0;

    if (score >= 75.0 || closureDuration >= 1.6) {
      state = "CRITICAL";
      stateLabel = "CRITICAL DROWSINESS";
      statusMessage = "CRITICAL DROWSINESS! Microsleep detected! Stop driving safely immediately.";
      alertLevel = 3;
    } else if (score >= 55.0 || closureDuration >= 1.0) {
      state = "DROWSY";
      stateLabel = "DROWSY";
      statusMessage = "Drowsiness detected. Please consider taking a rest break.";
      alertLevel = 2;
    } else if (score >= 28.0 || isYawning || isHeadDown) {
      state = "CAUTION";
      stateLabel = "CAUTION";
      statusMessage = isYawning ? "Yawning detected. Stay alert." : "Signs of fatigue detected. Please stay focused.";
      alertLevel = 1;
    }

    return {
      drowsinessScore: Math.round(score),
      state,
      stateLabel,
      statusMessage,
      alertLevel,
      indicators: {
        eyes: isEyeClosed ? "Closed" : "Open",
        yawning: isYawning ? "Yes" : "No",
        headPose: headPose.status || "Normal"
      },
      metrics: {
        avgEar: Math.round(avgEar * 1000) / 1000,
        leftEar: Math.round(leftEar * 1000) / 1000,
        rightEar: Math.round(rightEar * 1000) / 1000,
        mar: Math.round(mar * 1000) / 1000,
        perclos: Math.round(perclos * 10) / 10,
        closureDurationSec: Math.round(closureDuration * 10) / 10,
        yawnsRecent: yawnsInWindow,
        totalBlinks: this.totalBlinks,
        headPitch: headPose.pitch,
        headYaw: headPose.yaw,
        headRoll: headPose.roll
      },
      timestamp: Date.now()
    };
  }
}

/**
 * Ensures MediaPipe FaceMesh is ready from window or CDN
 */
export async function initializeFaceMesh() {
  if (typeof window === "undefined") return null;

  const createModel = (FaceMeshClass) => {
    const faceMesh = new FaceMeshClass({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    return faceMesh;
  };

  // 1. Check window.FaceMesh
  if (window.FaceMesh) {
    try {
      return createModel(window.FaceMesh);
    } catch (e) {
      console.warn("Error creating FaceMesh instance from window:", e);
    }
  }

  // 2. Dynamically load script
  return new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existing = document.querySelector('script[src*="face_mesh.js"]');
    if (existing && window.FaceMesh) {
      return resolve(createModel(window.FaceMesh));
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window.FaceMesh) {
        resolve(createModel(window.FaceMesh));
      } else {
        reject(new Error("Failed to initialize FaceMesh"));
      }
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Draws HUD overlays and facial landmarks onto the canvas
 */
export function drawFaceMeshOverlay(canvas, landmarks, stateInfo) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!landmarks || landmarks.length < 468) {
    return;
  }

  const isCritical = stateInfo?.state === "CRITICAL";
  const isDrowsy = stateInfo?.state === "DROWSY";
  const isCaution = stateInfo?.state === "CAUTION";

  const primaryColor = isCritical 
    ? "rgba(239, 68, 68, 0.95)" 
    : isDrowsy 
    ? "rgba(249, 115, 22, 0.95)" 
    : isCaution 
    ? "rgba(245, 158, 11, 0.95)" 
    : "rgba(16, 185, 129, 0.9)";

  const glowColor = isCritical 
    ? "rgba(239, 68, 68, 0.35)" 
    : isDrowsy 
    ? "rgba(249, 115, 22, 0.35)" 
    : isCaution 
    ? "rgba(245, 158, 11, 0.3)" 
    : "rgba(16, 185, 129, 0.25)";

  // 1. Draw Subtle Face Oval contour
  ctx.beginPath();
  FACE_OVAL.forEach((idx, i) => {
    const pt = landmarks[idx];
    const x = pt.x * w;
    const y = pt.y * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Helper for contours
  const drawContour = (indices, color, strokeW = 2.2, close = true) => {
    ctx.beginPath();
    indices.forEach((idx, i) => {
      const pt = landmarks[idx];
      const x = pt.x * w;
      const y = pt.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (close) ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeW;
    ctx.stroke();
  };

  // 3. Draw Left & Right Eye Contours
  const isEyeClosed = stateInfo?.indicators?.eyes === "Closed";
  const eyeColor = isEyeClosed ? "#ef4444" : "#38bdf8";
  drawContour(LEFT_EYE, eyeColor, isEyeClosed ? 3.0 : 2.0, true);
  drawContour(RIGHT_EYE, eyeColor, isEyeClosed ? 3.0 : 2.0, true);

  // 4. Draw Iris Centers (if present)
  if (landmarks.length >= 478) {
    const drawPoint = (idx, color, radius = 3) => {
      const pt = landmarks[idx];
      const x = pt.x * w;
      const y = pt.y * h;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    };
    drawPoint(468, isEyeClosed ? "#ef4444" : "#0284c7", 3.5);
    drawPoint(473, isEyeClosed ? "#ef4444" : "#0284c7", 3.5);
  }

  // 5. Draw Lips Contour
  const isYawning = stateInfo?.indicators?.yawning === "Yes";
  const mouthColor = isYawning ? "#f97316" : "rgba(255, 255, 255, 0.7)";
  drawContour(MOUTH, mouthColor, isYawning ? 3.0 : 1.8, true);

  // 6. Draw Key Landmark Tracking Dots
  [1, 199, 33, 263, 61, 291].forEach(idx => {
    const pt = landmarks[idx];
    const x = pt.x * w;
    const y = pt.y * h;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = primaryColor;
    ctx.fill();
  });
}
