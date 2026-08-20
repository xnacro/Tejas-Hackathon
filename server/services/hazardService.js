// Surakha AI - Community Road Hazards & Real-Time Incident Service

import { calculateHaversine } from "./routesService.js";

// TTL Durations by hazard type in milliseconds
const HAZARD_TTL_MS = {
  ACCIDENT: 2 * 60 * 60 * 1000,          // 2 hours
  ROAD_BLOCK: 4 * 60 * 60 * 1000,        // 4 hours
  HEAVY_TRAFFIC: 45 * 60 * 1000,         // 45 minutes
  SPEED_CAMERA: 30 * 24 * 60 * 60 * 1000,// 30 days
  POLICE_CHECKPOINT: 3 * 60 * 60 * 1000, // 3 hours
  POTHOLE: 7 * 24 * 60 * 60 * 1000,      // 7 days
  FLOOD: 6 * 60 * 60 * 1000,             // 6 hours
  FOG: 3 * 60 * 60 * 1000,               // 3 hours
  BROKEN_VEHICLE: 90 * 60 * 1000,        // 1.5 hours
  CONSTRUCTION: 48 * 60 * 60 * 1000,     // 48 hours
  OTHER: 2 * 60 * 60 * 1000,
};

let communityHazards = [
  {
    id: "HAZ-JM-01",
    type: "SPEED_CAMERA",
    title: "Automated Speed Interceptor Camera Ahead",
    description: "Radar speed trap active near Malaypur Overbridge",
    locationName: "NH 333 / Malaypur Corridor",
    coordinates: { lat: 24.9560, lng: 86.1890 },
    severity: "medium",
    confirmation_count: 5,
    confidence: "High Confidence (5 drivers confirmed)",
    reportedBy: "Driver Manoj (Truck BR-01)",
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  },
  {
    id: "HAZ-JM-02",
    type: "ACCIDENT",
    title: "Accident Reported: Overturned Tractor on Right Shoulder",
    description: "Single lane blocked, slow down and maintain lane discipline",
    locationName: "NH 333, 1.8 km North of GEC Jamui",
    coordinates: { lat: 24.9620, lng: 86.1950 },
    severity: "high",
    confirmation_count: 3,
    confidence: "Confirmed by 3 drivers",
    reportedBy: "Driver Rajesh (Truck KA-01)",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 105 * 60 * 1000).toISOString(),
    active: true,
  },
  {
    id: "HAZ-JM-03",
    type: "ROAD_BLOCK",
    title: "Culvert Maintenance & Road Construction",
    description: "Diversion in place on left side, speed limit 30 km/h",
    locationName: "Lohra - Jamui MDR Stretch",
    coordinates: { lat: 24.9480, lng: 86.1780 },
    severity: "medium",
    confirmation_count: 8,
    confidence: "High Confidence (Verified)",
    reportedBy: "Highway Patrol Patrol-04",
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  }
];

export const HazardService = {
  /**
   * Retrieves active, non-expired hazards within a given radius (default 15 km).
   */
  getNearbyHazards: (latitude, longitude, radiusKm = 15) => {
    const now = Date.now();
    const userLat = latitude || 24.9528;
    const userLng = longitude || 86.1831;

    return communityHazards
      .filter(h => h.active && new Date(h.expiresAt).getTime() > now)
      .map(h => {
        const distanceKm = calculateHaversine(userLat, userLng, h.coordinates.lat, h.coordinates.lng);
        let distanceText = `${distanceKm} km`;
        if (distanceKm < 1) {
          distanceText = `${Math.round(distanceKm * 1000)} m`;
        }

        return {
          ...h,
          distanceKm,
          distanceText,
        };
      })
      .filter(h => h.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  /**
   * Submits a new community road report.
   */
  reportHazard: ({ type, title, description, latitude, longitude, severity, user_id }) => {
    const hazardType = (type || "OTHER").toUpperCase();
    const ttlMs = HAZARD_TTL_MS[hazardType] || HAZARD_TTL_MS.OTHER;
    const now = new Date();

    const newReport = {
      id: `HAZ-${Date.now().toString().slice(-5)}`,
      type: hazardType,
      title: title || `${hazardType.replace(/_/g, " ")} Ahead`,
      description: description || "Reported by nearby driver on Surakha network",
      locationName: `Near ${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`,
      coordinates: { lat: Number(latitude), lng: Number(longitude) },
      severity: severity || (hazardType === "ACCIDENT" ? "high" : "medium"),
      confirmation_count: 1,
      confidence: "Reported by 1 driver",
      reportedBy: user_id || "Driver Community",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      active: true,
    };

    communityHazards.unshift(newReport);
    return newReport;
  },

  /**
   * Confirms/upvotes an existing hazard.
   */
  confirmHazard: (hazardId) => {
    const hazard = communityHazards.find(h => h.id === hazardId);
    if (hazard) {
      hazard.confirmation_count += 1;
      if (hazard.confirmation_count >= 5) {
        hazard.confidence = `High Confidence (${hazard.confirmation_count} drivers confirmed)`;
      } else if (hazard.confirmation_count >= 3) {
        hazard.confidence = `Confirmed by ${hazard.confirmation_count} drivers`;
      } else {
        hazard.confidence = `Reported (${hazard.confirmation_count} confirmations)`;
      }
      return hazard;
    }
    return null;
  }
};
