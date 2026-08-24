/**
 * ADAPT-INDIA — 3D LiDAR & Point Cloud Simulation Utilities
 * PS: SIH26037 (MathWorks / Team Legacy Coderz)
 */

export function generateLidarScanPoints(objects = [], options = {}) {
  const {
    rangeMeters = 40,
    roadWidthMeters = 7.0,
    beamCount = 32,
    pointsPerBeam = 180,
    scanAngleRad = 0
  } = options;

  const points = [];
  const colors = []; // RGB floats 0..1

  // 1. Road ground surface points (unstructured Indian road with slight roughness)
  const groundCount = 1800;
  for (let i = 0; i < groundCount; i++) {
    const forward = Math.random() * rangeMeters + 0.5;
    const lateral = (Math.random() - 0.5) * 14.0;
    const isRoad = Math.abs(lateral) <= roadWidthMeters / 2.0;

    // Ground elevation with road crowning & slight pothole roughness
    let z = -0.35 + (Math.random() - 0.5) * 0.03;
    if (!isRoad) {
      z += 0.08 + Math.random() * 0.15; // roadside shoulder berm
    }

    points.push(lateral, forward, z);

    if (isRoad) {
      // Drivable lane - subtle cyan-blue/slate points
      colors.push(0.12, 0.45, 0.85);
    } else {
      // Roadside shoulder / grass
      colors.push(0.2, 0.35, 0.25);
    }
  }

  // 2. Road boundaries, curbs, trees & barriers
  const boundaryCount = 450;
  for (let i = 0; i < boundaryCount; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const lateral = side * (roadWidthMeters / 2.0 + 0.3 + Math.random() * 3.5);
    const forward = Math.random() * rangeMeters;
    const height = Math.random() * 2.8;

    points.push(lateral, forward, height - 0.35);
    colors.push(0.4, 0.5, 0.6);
  }

  // 3. High-density LiDAR return clusters for detected road objects
  objects.forEach((obj) => {
    const { x: ox, y: oy, z: oz = 0 } = obj.position || {};
    const { width = 1.0, length = 1.0, height = 1.5 } = obj.dimensions || {};
    const clusterCount = 120;

    // Color based on risk level
    let cr = 0.2, cg = 0.8, cb = 0.4;
    if (obj.risk === "HIGH") {
      cr = 0.95; cg = 0.2; cb = 0.25; // Red
    } else if (obj.risk === "MEDIUM") {
      cr = 0.95; cg = 0.7; cb = 0.15; // Amber
    } else {
      cr = 0.25; cg = 0.75; cb = 0.95; // Cyan
    }

    for (let j = 0; j < clusterCount; j++) {
      // Sample surface of bounding box / object mesh
      const px = ox + (Math.random() - 0.5) * width;
      const py = oy + (Math.random() - 0.5) * length;
      const pz = oz + Math.random() * height - 0.35;

      points.push(px, py, pz);
      colors.push(cr, cg, cb);
    }
  });

  return {
    positions: new Float32Array(points),
    colors: new Float32Array(colors),
    count: points.length / 3
  };
}

export const DISTANCE_RINGS_METERS = [10, 20, 30, 40];
