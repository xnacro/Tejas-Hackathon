import express from "express";
import {
  getPerceptionSummary,
  getObjects,
  getTracking,
  getPrediction,
  getRiskAssessment,
  getPathPlan,
  getLidarFrame,
  triggerScenario
} from "../controllers/perceptionController.js";

export default function createPerceptionRoutes(io) {
  const router = express.Router();

  router.get("/summary", getPerceptionSummary);
  router.get("/objects", getObjects);
  router.get("/tracking", getTracking);
  router.get("/prediction", getPrediction);
  router.get("/risk", getRiskAssessment);
  router.get("/planning", getPathPlan);
  router.get("/lidar", getLidarFrame);

  router.post("/scenario", (req, res) => {
    triggerScenario(req, res);
    if (io) {
      io.emit("perception:scenario", req.body);
    }
  });

  return router;
}
