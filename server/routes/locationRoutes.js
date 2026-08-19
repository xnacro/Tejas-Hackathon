import express from "express";
import { LocationController } from "../controllers/locationController.js";

export default function createLocationRoutes(io) {
  const router = express.Router();

  router.get("/current", LocationController.getCurrentLocation);
  router.post("/current", (req, res) => LocationController.updateCurrentLocation(req, res, io));
  router.get("/share", LocationController.getSharingStatus);
  router.post("/share/toggle", (req, res) => LocationController.toggleSharingSession(req, res, io));

  return router;
}

