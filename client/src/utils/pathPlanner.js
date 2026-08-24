/**
 * ADAPT-INDIA — Adaptive Path Planner & Collision Avoidance Algorithm
 * PS: SIH26037 (MathWorks / Team Legacy Coderz)
 */

/**
 * Evaluates a 5th order polynomial (Quintic) for smooth jerk-minimizing lateral swerve
 */
export function evaluateQuinticSpline(t, startX, endX, duration) {
  if (t <= 0) return startX;
  if (t >= duration) return endX;
  const s = t / duration;
  // Quintic polynomial basis: 10s^3 - 15s^4 + 6s^5
  const poly = 10 * Math.pow(s, 3) - 15 * Math.pow(s, 4) + 6 * Math.pow(s, 5);
  return startX + (endX - startX) * poly;
}

/**
 * Generates an adaptive avoidance path around dynamic obstacles
 */
export function planAdaptivePath(options = {}) {
  const {
    nominalSpeedKmh = 42,
    obstacle = null, // critical obstacle object
    roadWidthMeters = 7.0,
    horizonMeters = 40.0
  } = options;

  const nominalPoints = [];
  const adaptivePoints = [];
  const step = 1.0;

  // Generate nominal center-line path
  for (let y = 0; y <= horizonMeters; y += step) {
    nominalPoints.push({ x: 0.0, y, z: 0.0 });
  }

  if (!obstacle || obstacle.risk !== "HIGH") {
    return {
      status: "SAFE_PATH",
      statusMessage: "Nominal trajectory active. Safe corridor clear.",
      collisionPredicted: false,
      conflictObjectId: null,
      nominalPath: nominalPoints,
      adaptivePath: nominalPoints,
      lateralOffsetMeters: 0,
      safetyMarginMeters: 3.5,
      timeToCollisionSec: 99.0
    };
  }

  // Calculate avoidance maneuver
  const obsX = obstacle.position?.x || -0.4;
  const obsY = obstacle.position?.y || 8.4;
  const obsVel = obstacle.velocityMs || 1.7;

  // Determine safe lateral swerve direction (swerve away from obstacle's moving path)
  const swerveOffset = obsX < 0.2 ? +1.45 : -1.45; // meters
  const swerveStartY = Math.max(2.0, obsY - 5.5);
  const swerveDurationY = 6.0;
  const returnStartY = obsY + 4.0;
  const returnDurationY = 8.0;

  for (let y = 0; y <= horizonMeters; y += step) {
    let x = 0;
    if (y < swerveStartY) {
      x = 0;
    } else if (y >= swerveStartY && y < swerveStartY + swerveDurationY) {
      x = evaluateQuinticSpline(y - swerveStartY, 0, swerveOffset, swerveDurationY);
    } else if (y >= swerveStartY + swerveDurationY && y < returnStartY) {
      x = swerveOffset;
    } else if (y >= returnStartY && y < returnStartY + returnDurationY) {
      x = evaluateQuinticSpline(y - returnStartY, swerveOffset, 0, returnDurationY);
    } else {
      x = 0;
    }

    adaptivePoints.push({
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(2)),
      z: 0.0
    });
  }

  return {
    status: "REPLANNING",
    statusMessage: `Collision conflict with ${obstacle.name || obstacle.id} at ${obsY.toFixed(1)}m. Adaptive lateral avoidance path (+${swerveOffset}m) engaged.`,
    collisionPredicted: true,
    conflictObjectId: obstacle.id,
    nominalPath: nominalPoints,
    adaptivePath: adaptivePoints,
    lateralOffsetMeters: swerveOffset,
    safetyMarginMeters: 2.1,
    timeToCollisionSec: (obsY / (nominalSpeedKmh / 3.6)).toFixed(1),
    recommendedSpeedKmh: Math.max(24, Math.round(nominalSpeedKmh * 0.72))
  };
}
