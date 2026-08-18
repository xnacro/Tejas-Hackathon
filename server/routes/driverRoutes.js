import express from "express";
import { DriverController } from "../controllers/driverController.js";

export default function createDriverRoutes(io) {
  const router = express.Router();

  router.get("/profile", DriverController.getProfile);
  router.get("/telemetry", DriverController.getTelemetry);
  router.post("/telemetry", (req, res) => DriverController.updateTelemetry(req, res, io));
  router.get("/community", DriverController.getCommunity);

  return router;
}
