import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "./LocationContext";
import io from "socket.io-client";

const TrafficSafetyContext = createContext(null);

const DEFAULT_TRAFFIC_STATE = {
  speed: {
    current: 52,
    limit: 60,
    difference: -8,
    status: "WITHIN_LIMIT",
    message: "🟢 You are driving safely within the 60 km/h road limit.",
    source: "Road Data Model",
  },
  traffic: {
    status: "NORMAL",
    delaySeconds: 0,
    delayText: "0 min delay",
    congestionIndex: 12,
  },
  road: {
    name: "Khargour - Amarath Road, Jamui",
    state: "Bihar",
    speedLimit: 60,
  },
  hazards: [],
  nearestHazard: {
    id: "HAZ-JM-01",
    type: "SPEED_CAMERA",
    title: "Speed Camera Ahead",
    distanceText: "200 m",
    distanceKm: 0.2,
    severity: "medium",
    confidence: "High Confidence (5 drivers confirmed)",
  },
  nearestRestArea: {
    id: "SRV-REST-01",
    name: "Highway Oasis Truck & Driver Rest Plaza",
    distanceText: "1.8 km",
    distanceKm: 1.8,
  },
  applicableRule: {
    offence_name: "Over Speeding (Commercial Heavy / Truck)",
    speed_limit: 60,
    penalty_formatted: "₹2,000 - ₹4,000",
    legal_section: "Section 183(2) Motor Vehicles Act 2019",
    source: "MoRTH Gazette Notification S.O. 1522(E)",
    source_url: "https://morth.nic.in",
  },
  overallSafety: 94,
  riskLevel: "SAFE",
  riskFactors: [],
  recommendation: "You are driving safely. Maintain steady speed and safe following distance.",
  driver: {
    drowsinessScore: 15,
    alertnessState: "ALERT",
  },
  updatedAt: new Date().toISOString(),
};

// Simulated Demo Mode Scenarios for Hackathon Presentation
const DEMO_SCENARIOS = {
  NORMAL: {
    speed: {
      current: 52,
      limit: 60,
      difference: -8,
      status: "WITHIN_LIMIT",
      message: "🟢 You are driving safely within the 60 km/h road limit.",
      source: "Road Data Model",
    },
    traffic: { status: "NORMAL", delaySeconds: 0, delayText: "0 min delay", congestionIndex: 10 },
    overallSafety: 96,
    riskLevel: "SAFE",
    riskFactors: [],
    recommendation: "🟢 Normal Driving: Vehicle speed is within safety limits and road condition is clear.",
    driver: { drowsinessScore: 12, alertnessState: "ALERT" },
  },
  OVERSPEED: {
    speed: {
      current: 74,
      limit: 60,
      difference: 14,
      status: "OVER_LIMIT",
      message: "⚠️ Speed Limit Alert: Driving 14 km/h above the posted road limit of 60 km/h.",
      source: "Road Data Model",
    },
    traffic: { status: "NORMAL", delaySeconds: 0, delayText: "0 min delay", congestionIndex: 15 },
    overallSafety: 72,
    riskLevel: "HIGH",
    riskFactors: ["SPEED_LIMIT_EXCEEDED"],
    recommendation: "⚠️ Speed Warning: Driving 14 km/h over the 60 km/h posted limit. Decelerate to avoid safety penalty.",
    driver: { drowsinessScore: 18, alertnessState: "ALERT" },
  },
  DROWSY: {
    speed: {
      current: 58,
      limit: 60,
      difference: -2,
      status: "WITHIN_LIMIT",
      message: "🟢 Speed within limit, but driver fatigue detected.",
      source: "Road Data Model",
    },
    traffic: { status: "NORMAL", delaySeconds: 0, delayText: "0 min delay", congestionIndex: 12 },
    overallSafety: 48,
    riskLevel: "HIGH",
    riskFactors: ["MODERATE_FATIGUE_WARNING"],
    recommendation: "🟠 Fatigue Alert: Prolonged eye closure detected. Take a break at Highway Oasis Rest Stop (1.8 km ahead).",
    driver: { drowsinessScore: 78, alertnessState: "DROWSY" },
  },
  HAZARD: {
    speed: {
      current: 48,
      limit: 60,
      difference: -12,
      status: "WITHIN_LIMIT",
      message: "🟢 Speed safe. Incident reported on route ahead.",
      source: "Road Data Model",
    },
    traffic: { status: "SLOW", delaySeconds: 360, delayText: "+6 min delay", congestionIndex: 45 },
    overallSafety: 68,
    riskLevel: "MODERATE",
    riskFactors: ["ACCIDENT_AHEAD_1.8 KM"],
    recommendation: "🚨 Incident Ahead: Accident reported 1.8 km ahead on right lane. Reduce speed and prepare for traffic slowdown.",
    nearestHazard: {
      id: "HAZ-JM-02",
      type: "ACCIDENT",
      title: "Accident Reported: Overturned Tractor on Right Shoulder",
      distanceText: "1.8 km",
      distanceKm: 1.8,
      severity: "high",
      confidence: "Confirmed by 3 drivers",
    },
    driver: { drowsinessScore: 22, alertnessState: "ALERT" },
  },
  CRITICAL: {
    speed: {
      current: 76,
      limit: 60,
      difference: 16,
      status: "CRITICAL",
      message: "🔴 CRITICAL: Severe overspeeding combined with driver fatigue.",
      source: "Road Data Model",
    },
    traffic: { status: "HEAVY", delaySeconds: 720, delayText: "+12 min delay", congestionIndex: 78 },
    overallSafety: 28,
    riskLevel: "CRITICAL",
    riskFactors: ["CRITICAL_DROWSINESS_DETECTED", "CRITICAL_OVERSPEEDING", "HEAVY_TRAFFIC_CONGESTION"],
    recommendation: "🔴 HIGH-RISK DRIVING CONDITION: Drowsiness detected + Vehicle above speed limit + Heavy traffic ahead. Recommended: Take a break immediately at the nearest safe rest area.",
    driver: { drowsinessScore: 86, alertnessState: "CRITICAL" },
  },
};

export function TrafficSafetyProvider({ children }) {
  const { coords, currentRoad } = useLocation();
  const [trafficData, setTrafficData] = useState(DEFAULT_TRAFFIC_STATE);
  const [demoMode, setDemoMode] = useState(null); // null (Live) | 'NORMAL' | 'OVERSPEED' | 'DROWSY' | 'HAZARD' | 'CRITICAL'
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef(null);

  // Fetch unified safety & traffic status from Node.js backend
  const fetchTrafficStatus = useCallback(async () => {
    if (demoMode) return; // In demo mode, rely on selected scenario

    const lat = coords.latitude || 24.9528;
    const lng = coords.longitude || 86.1831;
    const speed = coords.speedKmh !== null && coords.speedKmh !== undefined ? coords.speedKmh : 52;

    try {
      const res = await fetch(`/api/traffic/current?lat=${lat}&lng=${lng}&speed=${speed}&road=${encodeURIComponent(currentRoad || "Khargour - Amarath Road")}`);
      if (res.ok) {
        const data = await res.json();
        
        // Fetch unified safety engine assessment
        const safetyRes = await fetch("/api/safety/status");
        let safetyData = {};
        if (safetyRes.ok) {
          safetyData = await safetyRes.json();
        }

        setTrafficData(prev => ({
          ...prev,
          speed: data.speed || prev.speed,
          traffic: data.traffic || prev.traffic,
          road: data.road || prev.road,
          hazards: data.hazards || prev.hazards,
          nearestHazard: data.nearestHazard || prev.nearestHazard,
          nearestRestArea: safetyData.nearestRestArea || prev.nearestRestArea,
          applicableRule: safetyData.applicableRule || prev.applicableRule,
          overallSafety: safetyData.overallSafety !== undefined ? safetyData.overallSafety : prev.overallSafety,
          riskLevel: safetyData.riskLevel || prev.riskLevel,
          riskFactors: safetyData.riskFactors || prev.riskFactors,
          recommendation: safetyData.recommendation || prev.recommendation,
          driver: safetyData.driver || prev.driver,
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch {
      // Graceful fallback
    }
  }, [coords.latitude, coords.longitude, coords.speedKmh, currentRoad, demoMode]);

  // Set up WebSocket subscriptions & periodic polling
  useEffect(() => {
    fetchTrafficStatus();

    // Connect Socket.io client
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("traffic:update", (updatedTraffic) => {
      if (!demoMode) {
        setTrafficData(prev => ({ ...prev, traffic: updatedTraffic }));
      }
    });

    socket.on("safety:riskAlert", (riskAlert) => {
      if (!demoMode) {
        setTrafficData(prev => ({
          ...prev,
          overallSafety: riskAlert.overallSafety,
          riskLevel: riskAlert.riskLevel,
          riskFactors: riskAlert.riskFactors,
          recommendation: riskAlert.recommendation,
        }));
      }
    });

    socket.on("hazard:new", (newHazard) => {
      setTrafficData(prev => ({
        ...prev,
        hazards: [newHazard, ...prev.hazards],
        nearestHazard: newHazard,
      }));
    });

    // Throttled refresh interval (every 8 seconds)
    const interval = setInterval(fetchTrafficStatus, 8000);

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [fetchTrafficStatus, demoMode]);

  // Handle Demo Mode selection
  const switchDemoMode = (mode) => {
    if (!mode) {
      setDemoMode(null);
      fetchTrafficStatus();
      return;
    }

    const scenario = DEMO_SCENARIOS[mode];
    if (scenario) {
      setDemoMode(mode);
      setTrafficData(prev => ({
        ...prev,
        ...scenario,
        road: {
          ...prev.road,
          name: currentRoad || prev.road.name,
        },
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  // Trigger manual speed reduction action
  const handleReduceSpeed = useCallback(() => {
    setTrafficData(prev => {
      const targetSpeed = Math.max(30, (prev.speed?.limit || 60) - 5);
      return {
        ...prev,
        speed: {
          ...prev.speed,
          current: targetSpeed,
          difference: targetSpeed - (prev.speed?.limit || 60),
          status: "WITHIN_LIMIT",
          message: `🟢 Speed reduced to ${targetSpeed} km/h. Within safe road limit.`,
        },
        overallSafety: Math.min(100, prev.overallSafety + 20),
        riskLevel: "SAFE",
        recommendation: "🟢 Speed safely reduced. Maintain safe headway distance.",
      };
    });
  }, []);

  return (
    <TrafficSafetyContext.Provider
      value={{
        trafficData,
        overallSafety: trafficData.overallSafety,
        riskLevel: trafficData.riskLevel,
        riskFactors: trafficData.riskFactors,
        recommendation: trafficData.recommendation,
        demoMode,
        switchDemoMode,
        handleReduceSpeed,
        refreshTraffic: fetchTrafficStatus,
        isLoading,
      }}
    >
      {children}
    </TrafficSafetyContext.Provider>
  );
}

export function useTrafficSafety() {
  const ctx = useContext(TrafficSafetyContext);
  if (!ctx) {
    throw new Error("useTrafficSafety must be used within a TrafficSafetyProvider");
  }
  return ctx;
}
