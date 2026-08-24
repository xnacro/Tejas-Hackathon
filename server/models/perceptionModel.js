/**
 * ADAPT-INDIA — Perception, LiDAR, Object Tracking, Risk & Adaptive Path Planning Model
 * PS: SIH26037 (MathWorks / Team Legacy Coderz)
 */

class PerceptionModel {
  constructor() {
    this.scenarioState = "NORMAL"; // 'NORMAL' | 'PEDESTRIAN_INCURSION' | 'AVOIDANCE_REPLAN' | 'PATH_RECOVERED'
    this.scenarioStep = 0;
    this.scenarioAutoPlay = true;
    this.lastReplanTimestamp = Date.now();

    // Default vehicle state in ego coordinates (x: lateral, y: longitudinal, z: vertical)
    this.egoVehicle = {
      speedKmh: 42,
      targetSpeedKmh: 45,
      steeringAngleDeg: 0,
      laneOffsetMeters: 0,
      headingDeg: 0,
      status: "AUTONOMOUS_ENGAGED"
    };

    // Detected objects on an unstructured Indian road
    this.objects = [
      {
        id: "PERSON_03",
        trackId: "#03",
        type: "PERSON",
        name: "Pedestrian (Pedestrian Crossing)",
        confidence: 0.94,
        distance: 8.4,
        relativeDirection: "+8.2° Left",
        velocityMs: 1.7,
        velocityKmh: 6.1,
        risk: "HIGH",
        riskScore: 88,
        position: { x: -1.2, y: 8.3, z: 0.0 }, // x: lateral (-left, +right), y: longitudinal forward
        dimensions: { width: 0.6, length: 0.6, height: 1.75 },
        boundingBox2D: { x: 38, y: 44, w: 12, h: 28 }, // % in camera frame
        trajectory: [
          { x: -1.2, y: 8.3, t: 0 },
          { x: -0.6, y: 7.2, t: 0.6 },
          { x: 0.1, y: 6.1, t: 1.2 }, // enters ego path!
          { x: 0.8, y: 5.0, t: 1.8 }
        ],
        history: [
          { x: -2.4, y: 10.5 },
          { x: -1.8, y: 9.4 },
          { x: -1.2, y: 8.3 }
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
        name: "Stray Animal (Cow / Cattle on Shoulder)",
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
        name: "Road Hazard (Unmarked Pothole / Debris)",
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

    // Adaptive Path Planning State
    this.pathPlan = {
      status: "REPLANNING", // 'SAFE_PATH' | 'RISK_DETECTED' | 'REPLANNING' | 'NEW_SAFE_PATH'
      statusMessage: "Adaptive collision avoidance active: swerving left/right to clear pedestrian #03",
      collisionPredicted: true,
      conflictObjectId: "PERSON_03",
      timeToCollisionSec: 1.85,
      nominalPath: this.generateNominalPath(),
      adaptivePath: this.generateAdaptiveAvoidancePath(),
      metrics: {
        lateralOffsetMeters: +1.35,
        safetyMarginMeters: 2.1,
        curvatureSmoothnessScore: 0.96,
        targetSpeedReductionKmh: 14,
        replanLatencyMs: 18.4
      }
    };

    // System pipeline state strip
    this.pipelineStatus = {
      perception: "ACTIVE",
      lidar: "ACTIVE",
      tracking: "ACTIVE",
      prediction: "ACTIVE",
      riskEngine: "ACTIVE",
      pathPlanner: "ACTIVE",
      lidarFrequencyHz: 10,
      cameraFps: 30,
      radarFrequencyHz: 20,
      lastCycleLatencyMs: 24.2
    };
  }

  generateNominalPath() {
    const points = [];
    for (let y = 0; y <= 40; y += 1.5) {
      points.push({ x: 0.0, y: y, z: 0.0 });
    }
    return points;
  }

  generateAdaptiveAvoidancePath() {
    const points = [];
    // Cubic polynomial avoidance spline around pedestrian at y=8.4m, x=-1.2 moving to 0.1
    // Vehicle swerves safely to x=+1.35m between y=3m and y=15m, then returns to nominal corridor x=0.0
    for (let y = 0; y <= 40; y += 1.0) {
      let x = 0;
      if (y < 3.0) {
        x = 0;
      } else if (y >= 3.0 && y <= 9.0) {
        const t = (y - 3.0) / 6.0;
        x = 1.35 * (3 * t * t - 2 * t * t * t);
      } else if (y > 9.0 && y <= 15.0) {
        x = 1.35;
      } else if (y > 15.0 && y <= 24.0) {
        const t = (y - 15.0) / 9.0;
        x = 1.35 * (1 - (3 * t * t - 2 * t * t * t));
      } else {
        x = 0;
      }
      points.push({ x: Number(x.toFixed(2)), y: y, z: 0.0 });
    }
    return points;
  }

  getPerceptionSummary() {
    const totalObjects = this.objects.length;
    const trackedCount = this.objects.filter(o => o.trackId).length;
    const highRiskObjects = this.objects.filter(o => o.risk === "HIGH").length;
    const mediumRiskObjects = this.objects.filter(o => o.risk === "MEDIUM").length;
    const overallRiskScore = Math.max(...this.objects.map(o => o.riskScore || 0));

    return {
      branding: {
        title: "ADAPT-INDIA",
        fullName: "ADAPT-INDIA — Adaptive Perception-to-Path Planning for Unstructured Indian Roads",
        problemStatement: "SIH26037",
        organization: "MathWorks",
        team: "Legacy Coderz"
      },
      objectsDetected: totalObjects,
      trackedObjects: trackedCount,
      highRiskObjects: highRiskObjects,
      mediumRiskObjects: mediumRiskObjects,
      predictedConflicts: this.pathPlan.collisionPredicted ? 1 : 0,
      currentPathRiskPct: overallRiskScore,
      egoVehicle: this.egoVehicle,
      pipelineStatus: this.pipelineStatus,
      pathPlanStatus: this.pathPlan.status,
      pathPlanMessage: this.pathPlan.statusMessage,
      timestamp: new Date().toISOString()
    };
  }

  getObjects() {
    return this.objects;
  }

  getTrackingData() {
    return this.objects.map(obj => ({
      id: obj.id,
      trackId: obj.trackId,
      type: obj.type,
      position: obj.position,
      velocityMs: obj.velocityMs,
      history: obj.history,
      uncertaintyRadius: obj.uncertaintyRadius
    }));
  }

  getPredictionData() {
    return this.objects.map(obj => ({
      id: obj.id,
      trackId: obj.trackId,
      type: obj.type,
      trajectory: obj.trajectory,
      uncertaintyRadius: obj.uncertaintyRadius,
      collisionRisk: obj.risk
    }));
  }

  getRiskAssessment() {
    return {
      overallRisk: this.objects.some(o => o.risk === "HIGH") ? "HIGH" : "MEDIUM",
      riskScore: Math.max(...this.objects.map(o => o.riskScore || 0)),
      criticalObject: this.objects.find(o => o.risk === "HIGH") || null,
      zones: {
        safeEnvelopeMeters: { minX: -2.2, maxX: 2.2, forwardMeters: 30 },
        cautionZone: { minX: -4.0, maxX: 4.0, forwardMeters: 20 },
        highRiskZone: { minX: -1.5, maxX: 1.5, forwardMeters: 12 }
      },
      collisionPossibility: this.pathPlan.collisionPredicted
    };
  }

  getPathPlan() {
    return this.pathPlan;
  }

  getLidarPoints(sampleCount = 1200) {
    const points = [];
    
    // 1. Road surface points (unstructured road, -3.5m to +3.5m lateral, 0 to 45m forward)
    for (let i = 0; i < sampleCount * 0.45; i++) {
      const x = (Math.random() - 0.5) * 8.0;
      const y = Math.random() * 45.0 + 0.5;
      const z = (Math.random() - 0.5) * 0.06 - 0.4;
      const intensity = Math.random() * 0.4 + 0.1;
      const isDrivable = Math.abs(x) < 3.2;
      points.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), z: Number(z.toFixed(2)), intensity, class: isDrivable ? "DRIVABLE" : "GROUND" });
    }

    // 2. Road boundaries / shoulders / trees / roadside terrain
    for (let i = 0; i < sampleCount * 0.2; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (3.8 + Math.random() * 3.5);
      const y = Math.random() * 45.0;
      const z = Math.random() * 2.5 - 0.3;
      points.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), z: Number(z.toFixed(2)), intensity: 0.6, class: "BOUNDARY" });
    }

    // 3. Object point clusters corresponding to detected vehicles/pedestrians
    this.objects.forEach(obj => {
      const clusterPoints = 35;
      const { x: ox, y: oy, z: oz } = obj.position;
      const { width, length, height } = obj.dimensions;
      for (let j = 0; j < clusterPoints; j++) {
        const px = ox + (Math.random() - 0.5) * width;
        const py = oy + (Math.random() - 0.5) * length;
        const pz = oz + (Math.random() - 0.5) * height + height / 2;
        points.push({
          x: Number(px.toFixed(2)),
          y: Number(py.toFixed(2)),
          z: Number(pz.toFixed(2)),
          intensity: 0.9,
          class: obj.type,
          objectId: obj.id
        });
      }
    });

    return {
      timestamp: Date.now(),
      totalPoints: points.length,
      rangeMeters: 45,
      points
    };
  }

  triggerScenario(scenarioType) {
    if (scenarioType === "NORMAL") {
      this.scenarioState = "NORMAL";
      this.pathPlan.status = "SAFE_PATH";
      this.pathPlan.statusMessage = "Nominal trajectory active. Road clear, safe corridor maintained.";
      this.pathPlan.collisionPredicted = false;
      this.objects[0].risk = "LOW";
      this.objects[0].riskScore = 15;
      this.objects[0].position.x = -3.2;
      this.egoVehicle.speedKmh = 45;
    } else if (scenarioType === "PEDESTRIAN_INCURSION" || scenarioType === "REPLANNING" || scenarioType === "SIH26037_DEMO") {
      this.scenarioState = "AVOIDANCE_REPLAN";
      this.pathPlan.status = "REPLANNING";
      this.pathPlan.statusMessage = "CRITICAL: Pedestrian #03 incursion detected at 8.4m! Adaptive replanning engaged.";
      this.pathPlan.collisionPredicted = true;
      this.objects[0].risk = "HIGH";
      this.objects[0].riskScore = 92;
      this.objects[0].position.x = -0.4;
      this.egoVehicle.speedKmh = 31;
    } else if (scenarioType === "NEW_SAFE_PATH") {
      this.scenarioState = "PATH_RECOVERED";
      this.pathPlan.status = "NEW_SAFE_PATH";
      this.pathPlan.statusMessage = "Optimal collision-free path engaged. Obstacle cleared with 2.1m safe margin.";
      this.pathPlan.collisionPredicted = false;
      this.objects[0].risk = "LOW";
      this.objects[0].riskScore = 20;
      this.egoVehicle.speedKmh = 40;
    }

    return this.getPerceptionSummary();
  }
}

export const PerceptionService = new PerceptionModel();
