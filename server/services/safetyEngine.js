// Surakha AI - Unified Driver Safety & Multi-Factor Risk Assessment Engine
// Fuses Python CV Drowsiness + Vehicle Speed vs Road Limit + Traffic Congestion + Road Hazards

import { evaluateSpeedStatus } from "./roadsService.js";
import { TrafficRulesService } from "./trafficRulesService.js";
import { HazardService } from "./hazardService.js";
import { getNearbyServices } from "./placesService.js";

/**
 * Computes a holistic multi-factor driver safety risk assessment.
 */
export function assessDrivingSafety({
  drowsinessScore = 15,
  driverAlertnessState = "ALERT",
  currentSpeed = 52,
  speedLimit = 60,
  trafficCondition = "NORMAL",
  trafficDelaySec = 0,
  latitude = 24.9528,
  longitude = 86.1831,
  roadName = "NH 333 / Jamui Corridor",
  state = "Bihar",
  vehicleType = "truck",
} = {}) {
  const speedStatus = evaluateSpeedStatus(currentSpeed, speedLimit);
  const nearbyHazards = HazardService.getNearbyHazards(latitude, longitude, 5);
  const nearestHazard = nearbyHazards[0] || null;
  const nearbyServices = getNearbyServices(latitude, longitude, "Rest Area", 25);
  const nearestRestArea = nearbyServices[0] || null;
  const applicableRule = TrafficRulesService.findApplicableRule(state, vehicleType, "overspeeding");

  const riskFactors = [];
  let deduction = 0;

  // 1. Drowsiness Assessment (Highest Safety Priority)
  const dScore = Number(drowsinessScore) || 0;
  if (dScore >= 75 || driverAlertnessState === "CRITICAL") {
    riskFactors.push("CRITICAL_DROWSINESS_DETECTED");
    deduction += 45;
  } else if (dScore >= 50 || driverAlertnessState === "DROWSY") {
    riskFactors.push("MODERATE_FATIGUE_WARNING");
    deduction += 25;
  } else if (dScore >= 35 || driverAlertnessState === "WARNING") {
    riskFactors.push("MILD_INATTENTION");
    deduction += 10;
  }

  // 2. Speed Violation Assessment
  if (speedStatus.status === "CRITICAL") {
    riskFactors.push("CRITICAL_OVERSPEEDING");
    deduction += 35;
  } else if (speedStatus.status === "OVER_LIMIT") {
    riskFactors.push("SPEED_LIMIT_EXCEEDED");
    deduction += 18;
  } else if (speedStatus.status === "NEAR_LIMIT") {
    deduction += 5;
  }

  // 3. Traffic Congestion Factor
  if (trafficCondition === "HEAVY" || trafficDelaySec > 600) {
    riskFactors.push("HEAVY_TRAFFIC_CONGESTION");
    deduction += 12;
  } else if (trafficCondition === "SLOW" || trafficDelaySec > 180) {
    riskFactors.push("SLOW_TRAFFIC_FLOW");
    deduction += 5;
  }

  // 4. Upcoming Road Hazards (within 3 km)
  if (nearestHazard && nearestHazard.distanceKm <= 3) {
    if (nearestHazard.type === "ACCIDENT") {
      riskFactors.push(`ACCIDENT_AHEAD_${nearestHazard.distanceText.toUpperCase()}`);
      deduction += 15;
    } else if (nearestHazard.type === "ROAD_BLOCK") {
      riskFactors.push(`ROAD_BLOCK_AHEAD_${nearestHazard.distanceText.toUpperCase()}`);
      deduction += 10;
    } else if (nearestHazard.type === "SPEED_CAMERA") {
      riskFactors.push(`SPEED_CAMERA_${nearestHazard.distanceText.toUpperCase()}`);
      deduction += 5;
    }
  }

  // Overall Safety Score (0 to 100)
  const overallSafety = Math.max(0, Math.min(100, 100 - deduction));

  // Determine Holistic Risk Level
  let riskLevel = "SAFE";
  if (overallSafety < 40 || riskFactors.includes("CRITICAL_DROWSINESS_DETECTED") || (riskFactors.includes("MODERATE_FATIGUE_WARNING") && riskFactors.includes("SPEED_LIMIT_EXCEEDED"))) {
    riskLevel = "CRITICAL";
  } else if (overallSafety < 65 || riskFactors.includes("MODERATE_FATIGUE_WARNING") || riskFactors.includes("CRITICAL_OVERSPEEDING")) {
    riskLevel = "HIGH";
  } else if (overallSafety < 85 || riskFactors.length > 0) {
    riskLevel = "MODERATE";
  } else {
    riskLevel = "SAFE";
  }

  // Generate Actionable Recommendation
  let recommendation = "You are driving safely. Maintain steady speed and safe following distance.";
  
  if (riskLevel === "CRITICAL") {
    if (dScore >= 50 && nearestRestArea) {
      recommendation = `🔴 High-risk condition: Driver drowsiness detected while moving at ${currentSpeed} km/h. Please reduce speed immediately and pull over at ${nearestRestArea.name} (${nearestRestArea.distanceText} ahead).`;
    } else if (speedStatus.status === "CRITICAL" || speedStatus.status === "OVER_LIMIT") {
      recommendation = `🔴 Critical speed violation: You are driving ${speedStatus.difference} km/h above the ${speedLimit} km/h road limit. Decelerate now to avoid accident risk.`;
    } else {
      recommendation = "🔴 Multiple high-risk factors active. Please reduce vehicle speed and proceed with extreme caution.";
    }
  } else if (riskLevel === "HIGH") {
    if (dScore >= 50) {
      recommendation = `⚠️ Fatigue alert: Eye closure pattern indicates drowsiness. Consider taking a 15-minute break at the next safe rest stop.`;
    } else if (speedStatus.status === "OVER_LIMIT") {
      recommendation = `⚠️ Speed warning: Driving ${speedStatus.difference} km/h over ${speedLimit} km/h posted limit on ${roadName}.`;
    } else if (nearestHazard) {
      recommendation = `⚠️ Incident Ahead: ${nearestHazard.title} reported ${nearestHazard.distanceText} ahead. Prepare to slow down.`;
    }
  } else if (riskLevel === "MODERATE") {
    if (nearestHazard) {
      recommendation = `ℹ️ Notice: ${nearestHazard.title} ${nearestHazard.distanceText} ahead. Drive attentively.`;
    } else if (trafficCondition === "SLOW") {
      recommendation = `ℹ️ Moderate traffic slowdown on ${roadName}. Maintain safe braking distance.`;
    }
  }

  return {
    overallSafety,
    riskLevel,
    riskFactors,
    recommendation,
    driver: {
      drowsinessScore: dScore,
      alertnessState: driverAlertnessState,
    },
    speed: {
      current: currentSpeed,
      limit: speedLimit,
      difference: speedStatus.difference,
      status: speedStatus.status,
      message: speedStatus.message,
      source: "Road Data Model",
    },
    traffic: {
      status: trafficCondition,
      delaySeconds: trafficDelaySec,
      delayText: trafficDelaySec > 0 ? `+${Math.round(trafficDelaySec / 60)} min` : "0 min",
    },
    road: {
      name: roadName,
      state,
      speedLimit,
    },
    hazards: nearbyHazards,
    nearestRestArea,
    applicableRule: applicableRule ? {
      offence_name: applicableRule.offence_name,
      speed_limit: applicableRule.speed_limit,
      penalty_formatted: applicableRule.penalty_formatted,
      legal_section: applicableRule.legal_section,
      source: applicableRule.source,
      source_url: applicableRule.source_url,
    } : null,
    timestamp: new Date().toISOString(),
  };
}
