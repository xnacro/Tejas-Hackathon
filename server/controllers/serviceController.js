import { NearbyServiceModel } from "../models/nearbyServiceModel.js";

export const ServiceController = {
  getServices: (req, res) => {
    try {
      const { category } = req.query;
      const services = NearbyServiceModel.findAll(category);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nearby services", details: error.message });
    }
  },
  getNearestRestArea: (req, res) => {
    try {
      const restArea = NearbyServiceModel.findNearestRestArea();
      res.json(restArea);
    } catch (error) {
      res.status(500).json({ error: "Failed to find rest area", details: error.message });
    }
  }
};
