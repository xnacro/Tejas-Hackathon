import { DriverModel } from "../models/driverModel.js";

export const DriverController = {
  getProfile: (req, res) => {
    try {
      const profile = DriverModel.getProfile();
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch driver profile", details: error.message });
    }
  },
  getTelemetry: (req, res) => {
    try {
      const telemetry = DriverModel.getTelemetry();
      res.json(telemetry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch telemetry", details: error.message });
    }
  },
  updateTelemetry: (req, res, io) => {
    try {
      const updated = DriverModel.updateTelemetry(req.body);
      if (io) {
        io.emit("telemetry:update", updated);
      }
      res.json({ success: true, telemetry: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update telemetry", details: error.message });
    }
  },
  getCommunity: (req, res) => {
    try {
      const community = DriverModel.getCommunityDrivers();
      res.json(community);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch community data", details: error.message });
    }
  }
};
