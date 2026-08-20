// Surakha AI - Traffic & Safety API Routes

import express from "express";
import { TrafficController } from "../controllers/trafficController.js";

export default function createTrafficRoutes(io) {
  const router = express.Router();

  // Traffic & Intelligence
  router.get("/current", TrafficController.getCurrentTraffic);
  router.get("/rules", TrafficController.getRules);
  router.get("/hazards", TrafficController.getHazards);
  router.post("/report", (req, res) => TrafficController.reportHazard(req, res, io));
  router.post("/confirm", (req, res) => TrafficController.confirmHazard(req, res, io));

  // Safety Engine
  router.get("/safety/status", TrafficController.getSafetyStatus);
  router.get("/status", TrafficController.getSafetyStatus);
  router.post("/safety/assess", (req, res) => TrafficController.assessRealtimeSafety(req, res, io));
  router.post("/assess", (req, res) => TrafficController.assessRealtimeSafety(req, res, io));

  // Navigation & Places
  router.post("/navigation/route", TrafficController.calculateRoute);
  router.post("/route", TrafficController.calculateRoute);
  router.get("/places/nearby", TrafficController.getPlaces);

  return router;
}
