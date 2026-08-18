import { HazardModel } from "../models/hazardModel.js";
import { DriverModel } from "../models/driverModel.js";

export const HazardController = {
  getHazards: (req, res) => {
    try {
      const list = HazardModel.findAll();
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hazards", details: error.message });
    }
  },
  createHazard: (req, res, io) => {
    try {
      const { type, title, location, distanceKm, severity, reporter } = req.body;
      if (!type || !title) {
        return res.status(400).json({ error: "Type and title are required" });
      }
      const driver = DriverModel.getProfile();
      const created = HazardModel.create({
        type,
        title,
        location: location || "NH 44 Corridor",
        distanceKm: Number(distanceKm) || 1.5,
        severity: severity || "medium",
        reporter: reporter || driver.name
      });

      if (io) {
        io.emit("hazard:new", created);
      }
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to create hazard", details: error.message });
    }
  },
  upvoteHazard: (req, res, io) => {
    try {
      const updated = HazardModel.upvote(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: "Hazard not found" });
      }
      if (io) {
        io.emit("hazard:upvoted", updated);
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to upvote hazard", details: error.message });
    }
  }
};
