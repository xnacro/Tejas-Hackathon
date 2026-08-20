import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "./LocationContext";
import io from "socket.io-client";

const TrafficSafetyContext = createContext(null);

const DEFAULT_TRAFFIC_STATE = {
  speed: {
    current: 0,
    limit: 60,
    difference: 0,
    status: "WITHIN_LIMIT",
    message: "🟢 Vehicle Stationary / Standstill. Road speed limit: 60 km/h.",
    source: "MoRTH Gazette Highway Standard (S.O. 1522(E))",
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
    distanceText: "1.1 km",
    distanceKm: 1.1,
  },
  applicableRule: {
    offence_name: "Over Speeding (Commercial Heavy / Truck)",
    speed_limit: 60,
    penalty_formatted: "₹2,000 - ₹4,000",
    legal_section: "Section 183(2) Motor Vehicles Act 2019",
    source: "MoRTH Gazette Notification S.O. 1522(E)",
    source_url: "https://morth.nic.in",
  },
  overallSafety: 95,
  riskLevel: "SAFE",
  riskFactors: [],
  recommendation: "🟢 Normal Driving: Vehicle speed is within safety limits and road condition is clear.",
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
      source: "MoRTH Gazette Road Data",
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
      source: "MoRTH Gazette Road Data",
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
      current: 54,
      limit: 60,
      difference: -6,
      status: "WITHIN_LIMIT",
      message: "🟢 Speed within limit, but driver fatigue detected.",
      source: "MoRTH Gazette Road Data",
    },
    traffic: { status: "NORMAL", delaySeconds: 0, delayText: "0 min delay", congestionIndex: 12 },
    overallSafety: 48,
    riskLevel: "HIGH",
    riskFactors: ["MODERATE_FATIGUE_WARNING"],
    recommendation: "🟠 Fatigue Alert: Prolonged eye closure detected. Take a break at Highway Oasis Rest Stop (1.1 km ahead).",
    driver: { drowsinessScore: 78, alertnessState: "DROWSY" },
  },
  HAZARD: {
    speed: {
      current: 48,
      limit: 60,
      difference: -12,
      status: "WITHIN_LIMIT",
      message: "🟢 Speed safe. Incident reported on route ahead.",
      source: "MoRTH Gazette Road Data",
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
      source: "MoRTH Gazette Road Data",
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
  const [allRules, setAllRules] = useState([]);
  const [allStates, setAllStates] = useState(["Bihar", "Uttar Pradesh", "Delhi NCR", "Maharashtra", "Karnataka", "Assam"]);
  const [selectedStateFilter, setSelectedStateFilter] = useState("Bihar");
  const [demoMode, setDemoMode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef(null);

  // Fetch all statutory rules on mount
  useEffect(() => {
    fetch("/api/traffic/rules")
      .then(res => res.json())
      .then(data => {
        if (data?.rules) {
          setAllRules(data.rules);
          if (data.allStates) setAllStates(["All", ...data.allStates]);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch unified safety & traffic status from Node.js backend
  const fetchTrafficStatus = useCallback(async () => {
    if (demoMode) return;

    const lat = coords.latitude || 24.9528;
    const lng = coords.longitude || 86.1831;
    const rawSpeed = coords.speedKmh !== null && coords.speedKmh !== undefined ? coords.speedKmh : 52;

    try {
      const res = await fetch(`/api/traffic/current?lat=${lat}&lng=${lng}&speed=${rawSpeed}&road=${encodeURIComponent(currentRoad || "Khargour - Amarath Road")}`);
      if (res.ok) {
        const data = await res.json();
        
        const safetyRes = await fetch("/api/safety/status");
        let safetyData = {};
        if (safetyRes.ok) {
          safetyData = await safetyRes.json();
        }

        // Accurately compute real speed evaluation
        const currentSpeed = rawSpeed;
        const speedLimit = data.speed?.speedLimit || 60;
        const diff = currentSpeed > 0 ? currentSpeed - speedLimit : 0;
        const speedStatus = currentSpeed === 0 
          ? "WITHIN_LIMIT" 
          : diff > 15 
            ? "CRITICAL" 
            : diff > 5 
              ? "OVER_LIMIT" 
              : diff > 0 
                ? "NEAR_LIMIT" 
                : "WITHIN_LIMIT";

        setTrafficData(prev => ({
          ...prev,
          speed: {
            current: currentSpeed,
            limit: speedLimit,
            difference: diff,
            status: speedStatus,
            message: currentSpeed === 0
              ? `🟢 Vehicle Stationary / Standstill. Road speed limit: ${speedLimit} km/h.`
              : speedStatus === "WITHIN_LIMIT" 
                ? `🟢 You are driving safely within the ${speedLimit} km/h road limit (${Math.abs(currentSpeed - speedLimit)} km/h margin).`
                : `⚠️ Speed Alert: Driving +${diff} km/h above speed limit (${speedLimit} km/h).`,
            source: data.speed?.source || "MoRTH Gazette Highway Standard (S.O. 1522(E))",
          },
          traffic: data.traffic || prev.traffic,
          road: data.road || prev.road,
          hazards: data.hazards || prev.hazards,
          nearestHazard: data.nearestHazard || prev.nearestHazard,
          nearestRestArea: safetyData.nearestRestArea || prev.nearestRestArea,
          applicableRule: safetyData.applicableRule || prev.applicableRule,
          overallSafety: safetyData.overallSafety !== undefined ? safetyData.overallSafety : prev.overallSafety,
          riskLevel: safetyData.riskLevel || (diff > 5 ? "HIGH" : "SAFE"),
          riskFactors: safetyData.riskFactors || (diff > 5 ? ["SPEED_LIMIT_EXCEEDED"] : []),
          recommendation: safetyData.recommendation || (diff > 5 ? `⚠️ Reduce speed: You are driving +${diff} km/h above the ${speedLimit} km/h limit.` : "🟢 Normal driving condition. Drive attentively."),
          driver: safetyData.driver || prev.driver,
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch {
      // Fail silently
    }
  }, [coords.latitude, coords.longitude, coords.speedKmh, currentRoad, demoMode]);

  useEffect(() => {
    fetchTrafficStatus();

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

    const interval = setInterval(fetchTrafficStatus, 6000);

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [fetchTrafficStatus, demoMode]);

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
          message: `🟢 Speed reduced to ${targetSpeed} km/h. Safely within road limit.`,
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
        allRules,
        allStates,
        selectedStateFilter,
        setSelectedStateFilter,
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
