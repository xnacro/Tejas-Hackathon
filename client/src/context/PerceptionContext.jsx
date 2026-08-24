import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import { planAdaptivePath } from "../utils/pathPlanner";

const PerceptionContext = createContext(null);

const INITIAL_OBJECTS = [
  {
    id: "PERSON_03",
    trackId: "#03",
    type: "PERSON",
    name: "Pedestrian (Crossing Unmarked Road)",
    confidence: 0.94,
    distance: 8.4,
    relativeDirection: "+8.2° Left",
    velocityMs: 1.7,
    velocityKmh: 6.1,
    risk: "HIGH",
    riskScore: 88,
    position: { x: -0.6, y: 8.4, z: 0.0 },
    dimensions: { width: 0.6, length: 0.6, height: 1.75 },
    boundingBox2D: { x: 38, y: 44, w: 12, h: 28 },
    trajectory: [
      { x: -0.6, y: 8.4, t: 0 },
      { x: -0.2, y: 7.2, t: 0.6 },
      { x: 0.2, y: 6.0, t: 1.2 },
      { x: 0.6, y: 4.8, t: 1.8 }
    ],
    history: [
      { x: -1.8, y: 10.5 },
      { x: -1.2, y: 9.4 },
      { x: -0.6, y: 8.4 }
    ],
    uncertaintyRadius: 0.45
  },
  {
    id: "AUTO_05",
    trackId: "#05",
    type: "AUTO",
    name: "Auto-Rickshaw (Bajaj RE)",
    confidence: 0.96,
    distance: 14.2,
    relativeDirection: "+14.5° Right",
    velocityMs: 6.8,
    velocityKmh: 24.5,
    risk: "MEDIUM",
    riskScore: 52,
    position: { x: 2.4, y: 14.0, z: 0.0 },
    dimensions: { width: 1.4, length: 2.6, height: 1.8 },
    boundingBox2D: { x: 62, y: 50, w: 18, h: 24 },
    trajectory: [
      { x: 2.4, y: 14.0, t: 0 },
      { x: 2.2, y: 10.0, t: 0.6 },
      { x: 2.0, y: 6.0, t: 1.2 }
    ],
    history: [
      { x: 2.7, y: 18.0 },
      { x: 2.5, y: 16.0 },
      { x: 2.4, y: 14.0 }
    ],
    uncertaintyRadius: 0.6
  },
  {
    id: "BIKE_07",
    trackId: "#07",
    type: "BIKE",
    name: "Motorcycle (Hero Splendor)",
    confidence: 0.91,
    distance: 12.7,
    relativeDirection: "-18.0° Left",
    velocityMs: 8.2,
    velocityKmh: 29.5,
    risk: "MEDIUM",
    riskScore: 45,
    position: { x: -2.8, y: 12.4, z: 0.0 },
    dimensions: { width: 0.8, length: 2.0, height: 1.4 },
    boundingBox2D: { x: 18, y: 52, w: 14, h: 22 },
    trajectory: [
      { x: -2.8, y: 12.4, t: 0 },
      { x: -2.9, y: 8.0, t: 0.6 },
      { x: -3.0, y: 3.5, t: 1.2 }
    ],
    history: [
      { x: -2.6, y: 16.5 },
      { x: -2.7, y: 14.5 },
      { x: -2.8, y: 12.4 }
    ],
    uncertaintyRadius: 0.55
  },
  {
    id: "CAR_12",
    trackId: "#12",
    type: "CAR",
    name: "Car (Maruti Swift)",
    confidence: 0.98,
    distance: 21.2,
    relativeDirection: "+4.1° Center-Right",
    velocityMs: 11.1,
    velocityKmh: 40.0,
    risk: "LOW",
    riskScore: 18,
    position: { x: 1.5, y: 21.1, z: 0.0 },
    dimensions: { width: 1.7, length: 3.8, height: 1.5 },
    boundingBox2D: { x: 50, y: 54, w: 16, h: 18 },
    trajectory: [
      { x: 1.5, y: 21.1, t: 0 },
      { x: 1.5, y: 15.0, t: 0.6 },
      { x: 1.5, y: 9.0, t: 1.2 }
    ],
    history: [
      { x: 1.5, y: 27.0 },
      { x: 1.5, y: 24.0 },
      { x: 1.5, y: 21.1 }
    ],
    uncertaintyRadius: 0.4
  },
  {
    id: "ANIMAL_02",
    trackId: "#02",
    type: "ANIMAL",
    name: "Stray Animal (Cow on Shoulder)",
    confidence: 0.89,
    distance: 18.5,
    relativeDirection: "-22.5° Left Shoulder",
    velocityMs: 0.3,
    velocityKmh: 1.1,
    risk: "LOW",
    riskScore: 22,
    position: { x: -3.6, y: 18.1, z: 0.0 },
    dimensions: { width: 1.2, length: 2.2, height: 1.4 },
    boundingBox2D: { x: 6, y: 56, w: 14, h: 16 },
    trajectory: [
      { x: -3.6, y: 18.1, t: 0 },
      { x: -3.5, y: 17.9, t: 0.6 },
      { x: -3.4, y: 17.7, t: 1.2 }
    ],
    history: [
      { x: -3.7, y: 18.5 },
      { x: -3.6, y: 18.1 }
    ],
    uncertaintyRadius: 0.7
  },
  {
    id: "OBSTACLE_09",
    trackId: "#09",
    type: "OBSTACLE",
    name: "Road Hazard (Unmarked Pothole)",
    confidence: 0.93,
    distance: 9.8,
    relativeDirection: "+12.0° Right Track",
    velocityMs: 0.0,
    velocityKmh: 0.0,
    risk: "MEDIUM",
    riskScore: 48,
    position: { x: 1.4, y: 9.7, z: 0.0 },
    dimensions: { width: 0.9, length: 1.2, height: 0.2 },
    boundingBox2D: { x: 58, y: 72, w: 10, h: 8 },
    trajectory: [
      { x: 1.4, y: 9.7, t: 0 },
      { x: 1.4, y: 9.7, t: 0.6 }
    ],
    history: [
      { x: 1.4, y: 9.7 }
    ],
    uncertaintyRadius: 0.2
  }
];

export function PerceptionProvider({ children }) {
  // Global Mode: 'DRIVER_SAFETY' | 'AUTONOMOUS_PERCEPTION' | 'SIMULATION_MODE'
  const [activeSystemMode, setActiveSystemMode] = useState("AUTONOMOUS_PERCEPTION");
  
  // Camera View Mode: 'FACE_DROWSINESS' | 'ROAD_OBJECT_DETECTION'
  const [cameraPerceptionMode, setCameraPerceptionMode] = useState("ROAD_OBJECT_DETECTION");

  // Center Viewport Mode: 'MAP' | 'LIDAR_3D'
  const [centerViewMode, setCenterViewMode] = useState("MAP");

  // AI Perception Map Overlay Toggle (when viewing standard map)
  const [showMapPerceptionOverlay, setShowMapPerceptionOverlay] = useState(true);

  // 3D LiDAR Viewer Layer Toggles
  const [lidarLayers, setLidarLayers] = useState({
    pointCloud: true,
    detectedObjects: true,
    riskOverlay: true,
    predictedTrajectories: true,
    adaptivePath: true,
    distanceRings: true,
    drivableArea: true
  });

  // Dynamic Objects State
  const [objects, setObjects] = useState(INITIAL_OBJECTS);
  const [selectedObjectId, setSelectedObjectId] = useState("PERSON_03");

  // Ego Vehicle State
  const [egoVehicle, setEgoVehicle] = useState({
    speedKmh: 38,
    targetSpeedKmh: 45,
    steeringAngleDeg: 4.2,
    lateralDeviationMeters: 1.35,
    status: "AUTONOMOUS_ENGAGED"
  });

  // SIH26037 Scenario State Machine
  // 0: SAFE_PATH, 1: PEDESTRIAN_CROSSING_INCURSION, 2: REPLANNING, 3: NEW_SAFE_PATH_AVOIDED
  const [scenarioStep, setScenarioStep] = useState(2);
  const [isAutoPlayingScenario, setIsAutoPlayingScenario] = useState(true);

  // Path Planner State
  const [pathPlan, setPathPlan] = useState(() => {
    return planAdaptivePath({
      nominalSpeedKmh: 42,
      obstacle: INITIAL_OBJECTS[0]
    });
  });

  // System Pipeline Strip
  const [pipelineStatus, setPipelineStatus] = useState({
    perception: "ACTIVE",
    lidar: "ACTIVE",
    tracking: "ACTIVE",
    prediction: "ACTIVE",
    riskEngine: "ACTIVE",
    pathPlanner: "ACTIVE",
    latencyMs: 24,
    cameraFps: 30,
    lidarHz: 10
  });

  // Toggle single LiDAR layer
  const toggleLidarLayer = (layerKey) => {
    setLidarLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Trigger specific SIH scenario step
  const setScenario = useCallback((stepIndex) => {
    setScenarioStep(stepIndex);

    setObjects(prev => {
      const cloned = JSON.parse(JSON.stringify(prev));
      const person = cloned.find(o => o.id === "PERSON_03");

      if (stepIndex === 0) {
        // Safe Path
        if (person) {
          person.risk = "LOW";
          person.riskScore = 15;
          person.position.x = -2.8; // far shoulder
          person.distance = 18.0;
        }
      } else if (stepIndex === 1 || stepIndex === 2) {
        // Pedestrian Incursion & Replanning
        if (person) {
          person.risk = "HIGH";
          person.riskScore = 92;
          person.position.x = -0.4; // directly in path
          person.distance = 8.4;
        }
      } else if (stepIndex === 3) {
        // Clear & New Safe Path
        if (person) {
          person.risk = "LOW";
          person.riskScore = 20;
          person.position.x = 2.4; // crossed over
          person.distance = 12.0;
        }
      }
      return cloned;
    });
  }, []);

  // Update path plan when objects change or scenario step changes
  useEffect(() => {
    const critical = objects.find(o => o.risk === "HIGH");
    const newPlan = planAdaptivePath({
      nominalSpeedKmh: egoVehicle.speedKmh,
      obstacle: critical
    });

    if (scenarioStep === 0) {
      newPlan.status = "SAFE_PATH";
      newPlan.statusMessage = "Nominal Path Active — Road corridor clear.";
    } else if (scenarioStep === 1) {
      newPlan.status = "RISK_DETECTED";
      newPlan.statusMessage = "RISK DETECTED: Pedestrian #03 entering trajectory in 1.8s!";
    } else if (scenarioStep === 2) {
      newPlan.status = "REPLANNING";
      newPlan.statusMessage = "REPLANNING: Executing optimal lateral avoidance maneuver (+1.35m).";
    } else if (scenarioStep === 3) {
      newPlan.status = "NEW_SAFE_PATH";
      newPlan.statusMessage = "NEW SAFE PATH: Hazard avoided with 2.1m safe margin.";
    }

    setPathPlan(newPlan);
  }, [objects, scenarioStep, egoVehicle.speedKmh]);

  // Automated Scenario Simulation Cycle
  useEffect(() => {
    if (!isAutoPlayingScenario) return;

    const interval = setInterval(() => {
      setScenarioStep(prev => {
        const next = (prev + 1) % 4;
        setScenario(next);
        return next;
      });
    }, 5500);

    return () => clearInterval(interval);
  }, [isAutoPlayingScenario, setScenario]);

  // Subtle real-time object tracking jitter & distance animation to simulate 30FPS live CV tracker
  useEffect(() => {
    const trackerInterval = setInterval(() => {
      setObjects(prev =>
        prev.map(obj => {
          const jitterX = (Math.random() - 0.5) * 0.04;
          const jitterY = (Math.random() - 0.5) * 0.04;
          const newX = Number((obj.position.x + jitterX).toFixed(2));
          const newY = Number((obj.position.y + jitterY).toFixed(2));
          const dist = Number(Math.sqrt(newX * newX + newY * newY).toFixed(1));

          return {
            ...obj,
            distance: dist,
            position: { ...obj.position, x: newX, y: newY }
          };
        })
      );
    }, 600);

    return () => clearInterval(trackerInterval);
  }, []);

  const selectedObject = objects.find(o => o.id === selectedObjectId) || objects[0];

  return (
    <PerceptionContext.Provider
      value={{
        activeSystemMode,
        setActiveSystemMode,
        cameraPerceptionMode,
        setCameraPerceptionMode,
        centerViewMode,
        setCenterViewMode,
        showMapPerceptionOverlay,
        setShowMapPerceptionOverlay,
        lidarLayers,
        toggleLidarLayer,
        objects,
        selectedObjectId,
        setSelectedObjectId,
        selectedObject,
        egoVehicle,
        setEgoVehicle,
        scenarioStep,
        setScenario,
        isAutoPlayingScenario,
        setIsAutoPlayingScenario,
        pathPlan,
        pipelineStatus
      }}
    >
      {children}
    </PerceptionContext.Provider>
  );
}

export function usePerception() {
  const ctx = useContext(PerceptionContext);
  if (!ctx) {
    throw new Error("usePerception must be used within a PerceptionProvider");
  }
  return ctx;
}
