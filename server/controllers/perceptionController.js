import { PerceptionService } from "../models/perceptionModel.js";

export const getPerceptionSummary = (req, res) => {
  try {
    const summary = PerceptionService.getPerceptionSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getObjects = (req, res) => {
  try {
    const objects = PerceptionService.getObjects();
    res.json(objects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTracking = (req, res) => {
  try {
    const tracks = PerceptionService.getTrackingData();
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPrediction = (req, res) => {
  try {
    const predictions = PerceptionService.getPredictionData();
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRiskAssessment = (req, res) => {
  try {
    const risk = PerceptionService.getRiskAssessment();
    res.json(risk);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPathPlan = (req, res) => {
  try {
    const pathPlan = PerceptionService.getPathPlan();
    res.json(pathPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLidarFrame = (req, res) => {
  try {
    const frame = PerceptionService.getLidarPoints();
    res.json(frame);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerScenario = (req, res) => {
  try {
    const { scenario } = req.body || {};
    const updated = PerceptionService.triggerScenario(scenario || "PEDESTRIAN_INCURSION");
    res.json({ success: true, state: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
