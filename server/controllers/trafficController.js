// Surakha AI - Traffic & Road Intelligence Controller

import { getRoadIntelligence, evaluateSpeedStatus } from "../services/roadsService.js";
import { TrafficRulesService } from "../services/trafficRulesService.js";
import { HazardService } from "../services/hazardService.js";
import { assessDrivingSafety } from "../services/safetyEngine.js";
import { computeTrafficRoute } from "../services/routesService.js";
import { getNearbyServices } from "../services/placesService.js";
import { DriverModel } from "../models/driverModel.js";

// Cached latest live state
let latestTelemetry = {
  latitude: 24.9528,
  longitude: 86.1831,
  speed: 52,
  speedLimit: 60,
  heading: 90,
  road: "Khargour - Amarath Road, Jamui",
  state: "Bihar",
  vehicleType: "truck",
  drowsinessScore: 15,
  driverState: "ALERT",
  updatedAt: new Date().toISOString(),
};

export const TrafficController = {
  /**
   * GET /api/traffic/current
   * Returns unified current road, traffic, speed comparison, and nearest hazards.
   */
  getCurrentTraffic: async (req, res) => {
    try {
      const lat = Number(req.query.lat) || latestTelemetry.latitude;
      const lng = Number(req.query.lng) || latestTelemetry.longitude;
      const speed = req.query.speed !== undefined ? Number(req.query.speed) : latestTelemetry.speed;
      const vehicleType = req.query.vehicleType || latestTelemetry.vehicleType;
      const roadName = req.query.road || latestTelemetry.road;

      const roadInfo = await getRoadIntelligence(lat, lng, vehicleType, speed);
      const hazards = HazardService.getNearbyHazards(lat, lng, 10);
      const nearestHazard = hazards[0] || null;
      const nearbyServices = getNearbyServices(lat, lng, null, 20);

      const response = {
        location: { lat, lng },
        road: {
          name: roadInfo.roadName || roadName,
          id: roadInfo.roadId,
          state: "Bihar",
        },
        speed: roadInfo.speedStatus,
        traffic: {
          status: "NORMAL",
          delaySeconds: 0,
          delayText: "0 min delay",
          congestionIndex: 12,
        },
        hazards,
        nearestHazard,
        nearbyServices,
        updatedAt: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch traffic intelligence", details: error.message });
    }
  },

  /**
   * GET /api/traffic/rules
   */
  getRules: (req, res) => {
    try {
      const { state, vehicle_type, offence_code } = req.query;
      const rules = TrafficRulesService.getRules({ state, vehicle_type, offence_code });
      const allStates = TrafficRulesService.getAvailableStates();
      res.json({ count: rules.length, rules, allStates });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch traffic rules", details: error.message });
    }
  },

  /**
   * GET /api/traffic/hazards
   */
  getHazards: (req, res) => {
    try {
      const lat = Number(req.query.lat) || latestTelemetry.latitude;
      const lng = Number(req.query.lng) || latestTelemetry.longitude;
      const radius = Number(req.query.radius) || 15;
      const hazards = HazardService.getNearbyHazards(lat, lng, radius);
      res.json({ count: hazards.length, hazards });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch road hazards", details: error.message });
    }
  },

  /**
   * POST /api/traffic/report
   */
  reportHazard: (req, res, io) => {
    try {
      const { type, title, description, latitude, longitude, severity, user_id } = req.body;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and Longitude are required for hazard report" });
      }

      const newHazard = HazardService.reportHazard({
        type,
        title,
        description,
        latitude,
        longitude,
        severity,
        user_id,
      });

      if (io) {
        io.emit("hazard:new", newHazard);
      }

      res.status(201).json({ success: true, hazard: newHazard });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit hazard report", details: error.message });
    }
  },

  /**
   * POST /api/traffic/confirm
   */
  confirmHazard: (req, res, io) => {
    try {
      const { hazardId } = req.body;
      if (!hazardId) {
        return res.status(400).json({ error: "hazardId is required" });
      }

      const updated = HazardService.confirmHazard(hazardId);
      if (!updated) {
        return res.status(404).json({ error: "Hazard not found or expired" });
      }

      if (io) {
        io.emit("hazard:confirmed", updated);
      }

      res.json({ success: true, hazard: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to confirm hazard", details: error.message });
    }
  },

  /**
   * GET /api/safety/status
   */
  getSafetyStatus: (req, res) => {
    try {
      const driverTelemetry = DriverModel.getTelemetry();
      const assessment = assessDrivingSafety({
        drowsinessScore: driverTelemetry.drowsinessScore || latestTelemetry.drowsinessScore,
        driverAlertnessState: driverTelemetry.state || latestTelemetry.driverState,
        currentSpeed: driverTelemetry.speed || latestTelemetry.speed,
        speedLimit: driverTelemetry.speedLimit || latestTelemetry.speedLimit,
        latitude: latestTelemetry.latitude,
        longitude: latestTelemetry.longitude,
        roadName: latestTelemetry.road,
        state: latestTelemetry.state,
        vehicleType: latestTelemetry.vehicleType,
      });

      res.json(assessment);
    } catch (error) {
      res.status(500).json({ error: "Failed to assess safety status", details: error.message });
    }
  },

  /**
   * POST /api/safety/assess
   */
  assessRealtimeSafety: (req, res, io) => {
    try {
      const payload = req.body || {};
      const assessment = assessDrivingSafety(payload);

      if (io && (assessment.riskLevel === "CRITICAL" || assessment.riskLevel === "HIGH")) {
        io.emit("safety:riskAlert", assessment);
      }

      res.json(assessment);
    } catch (error) {
      res.status(500).json({ error: "Safety assessment failed", details: error.message });
    }
  },

  /**
   * POST /api/navigation/route
   */
  calculateRoute: async (req, res) => {
    try {
      const { origin, destination } = req.body;
      if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and Destination coordinates required" });
      }

      const routeResult = await computeTrafficRoute(origin, destination);
      res.json(routeResult);
    } catch (error) {
      res.status(500).json({ error: "Route calculation failed", details: error.message });
    }
  },

  /**
   * GET /api/places/nearby
   */
  getPlaces: (req, res) => {
    try {
      const lat = Number(req.query.lat) || latestTelemetry.latitude;
      const lng = Number(req.query.lng) || latestTelemetry.longitude;
      const category = req.query.category || null;
      const radius = Number(req.query.radius) || 30;

      const services = getNearbyServices(lat, lng, category, radius);
      res.json({ count: services.length, services });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nearby places", details: error.message });
    }
  },
};
