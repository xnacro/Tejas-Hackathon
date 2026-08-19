import { NearbyServiceModel } from "../models/nearbyServiceModel.js";

export const ServiceController = {
  getServices: (req, res) => {
    try {
      const { category, lat, lng } = req.query;
      const services = NearbyServiceModel.findAll(category, lat, lng);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nearby services", details: error.message });
    }
  },
  getNearestRestArea: (req, res) => {
    try {
      const { lat, lng } = req.query;
      const restArea = NearbyServiceModel.findNearestRestArea(lat, lng);
      res.json(restArea);
    } catch (error) {
      res.status(500).json({ error: "Failed to find rest area", details: error.message });
    }
  }
};

