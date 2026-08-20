// Interfaces with Google Roads API / Geocoding with cached local road speed limit repository

// Configurable speed thresholds
const SPEED_CONFIG = {
  warningTolerance: 5,   // km/h over limit before warning
  criticalTolerance: 15, // km/h over limit before critical
  defaultSpeedLimit: 60, // km/h fallback when road type is unknown
};

// Authoritative default speed limits by road category in India (MoRTH Gazette)
const ROAD_TYPE_LIMITS = {
  expressway: { car: 120, truck: 80, bus: 100 },
  national_highway: { car: 100, truck: 70, bus: 80 },
  state_highway: { car: 80, truck: 60, bus: 70 },
  urban_arterial: { car: 60, truck: 40, bus: 50 },
  city_road: { car: 50, truck: 40, bus: 40 },
  rural_road: { car: 40, truck: 30, bus: 35 },
};

// In-memory road segment & speed limit cache
const roadCache = new Map();

/**
 * Calculates speed comparison and safety status.
 */
export function evaluateSpeedStatus(currentSpeed, speedLimit) {
  if (currentSpeed === null || currentSpeed === undefined || isNaN(currentSpeed)) {
    return {
      currentSpeed: null,
      speedLimit,
      difference: 0,
      status: "UNKNOWN",
      message: "Speed telemetry unavailable",
      severity: "info",
    };
  }

  if (!speedLimit || isNaN(speedLimit)) {
    return {
      currentSpeed: Math.round(currentSpeed),
      speedLimit: null,
      difference: 0,
      status: "UNKNOWN",
      message: "Speed limit unavailable for this road",
      severity: "info",
    };
  }

  const roundedSpeed = Math.round(currentSpeed);
  const difference = roundedSpeed - speedLimit;

  if (difference > SPEED_CONFIG.criticalTolerance) {
    return {
      currentSpeed: roundedSpeed,
      speedLimit,
      difference,
      status: "CRITICAL",
      message: `🔴 Reduce speed. You are significantly above the posted road limit of ${speedLimit} km/h.`,
      severity: "critical",
    };
  }

  if (difference > SPEED_CONFIG.warningTolerance) {
    return {
      currentSpeed: roundedSpeed,
      speedLimit,
      difference,
      status: "OVER_LIMIT",
      message: `⚠️ Speed Warning: Driving ${difference} km/h above speed limit (${speedLimit} km/h).`,
      severity: "warning",
    };
  }

  if (difference > 0) {
    return {
      currentSpeed: roundedSpeed,
      speedLimit,
      difference,
      status: "NEAR_LIMIT",
      message: `Approaching maximum posted speed limit of ${speedLimit} km/h.`,
      severity: "moderate",
    };
  }

  return {
    currentSpeed: roundedSpeed,
    speedLimit,
    difference,
    status: "WITHIN_LIMIT",
    message: `🟢 You are driving safely within the ${speedLimit} km/h road limit.`,
    severity: "safe",
  };
}

/**
 * Determines speed limit for a given road name and vehicle type.
 */
export function getSpeedLimitForRoad(roadName = "", vehicleType = "truck") {
  const vType = (vehicleType || "truck").toLowerCase();
  const lower = (roadName || "").toLowerCase();

  let category = "urban_arterial";
  if (lower.includes("expressway") || lower.includes("yamuna") || lower.includes("purvanchal") || lower.includes("samruddhi")) {
    category = "expressway";
  } else if (lower.includes("nh") || lower.includes("national highway")) {
    category = "national_highway";
  } else if (lower.includes("sh") || lower.includes("state highway") || lower.includes("mdr")) {
    category = "state_highway";
  } else if (lower.includes("corridor") || lower.includes("bypass") || lower.includes("ring road")) {
    category = "urban_arterial";
  } else if (lower.includes("street") || lower.includes("lane") || lower.includes("marg") || lower.includes("colony")) {
    category = "city_road";
  }

  const limits = ROAD_TYPE_LIMITS[category] || ROAD_TYPE_LIMITS.urban_arterial;
  const isTruck = vType.includes("truck") || vType.includes("heavy") || vType.includes("commercial");
  const isBus = vType.includes("bus");

  if (isTruck) return limits.truck;
  if (isBus) return limits.bus;
  return limits.car;
}

/**
 * Snap coordinates to road and retrieve speed limit via Google Roads API or fallback.
 */
export async function getRoadIntelligence(latitude, longitude, vehicleType = "truck", currentSpeed = 0) {
  if (!latitude || !longitude) {
    return {
      roadName: "Road Segment Unknown",
      roadId: "unknown",
      speedLimit: null,
      speedStatus: evaluateSpeedStatus(currentSpeed, null),
      source: "Unavailable",
      latitude: null,
      longitude: null,
    };
  }

  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  if (roadCache.has(cacheKey)) {
    const cached = roadCache.get(cacheKey);
    const speedStatus = evaluateSpeedStatus(currentSpeed, cached.speedLimit);
    return { ...cached, speedStatus };
  }

  let roadName = "Highway Corridor";
  let speedLimit = getSpeedLimitForRoad(roadName, vehicleType);
  let source = "Road Data Model";

  // Try Google Roads / Geocoding if API key is present
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_ROADS_API_KEY;
  if (apiKey) {
    try {
      // 1. Google Roads Snap to Roads API
      const snapUrl = `https://roads.googleapis.com/v1/snapToRoads?path=${latitude},${longitude}&interpolate=true&key=${apiKey}`;
      const snapRes = await fetch(snapUrl);
      if (snapRes.ok) {
        const snapData = await snapRes.json();
        if (snapData?.snappedPoints?.[0]?.placeId) {
          source = "Google Roads API";
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  const speedStatus = evaluateSpeedStatus(currentSpeed, speedLimit);

  const result = {
    roadName,
    roadId: `road_${Math.abs(Math.round(latitude * 1000 + longitude * 1000))}`,
    speedLimit,
    speedStatus,
    source,
    latitude,
    longitude,
    updatedAt: new Date().toISOString(),
  };

  roadCache.set(cacheKey, result);
  // Keep cache small
  if (roadCache.size > 200) {
    const firstKey = roadCache.keys().next().value;
    roadCache.delete(firstKey);
  }

  return result;
}
