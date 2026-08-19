import { SosModel } from "../models/sosModel.js";
import { DriverModel } from "../models/driverModel.js";

let liveDriverLocation = {
  latitude: 28.5355,
  longitude: 77.3910,
  accuracy: 12,
  speed: 52,
  heading: 90,
  road: "NH 44 Expressway",
  updatedAt: new Date().toISOString()
};

export const LocationController = {
  getCurrentLocation: (req, res) => {
    res.json(liveDriverLocation);
  },

  updateCurrentLocation: (req, res, io) => {
    try {
      const { latitude, longitude, accuracy, speed, heading, road } = req.body;
      if (latitude && longitude) {
        liveDriverLocation = {
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracy: accuracy ? Number(accuracy) : liveDriverLocation.accuracy,
          speed: speed !== undefined && speed !== null ? Number(speed) : liveDriverLocation.speed,
          heading: heading !== undefined && heading !== null ? Number(heading) : liveDriverLocation.heading,
          road: road || liveDriverLocation.road,
          updatedAt: new Date().toISOString()
        };

        if (speed !== undefined && speed !== null) {
          DriverModel.updateTelemetry({ speed: Number(speed) });
        }

        if (io) {
          io.emit("location:liveUpdate", liveDriverLocation);
        }
      }
      res.json({ success: true, location: liveDriverLocation });
    } catch (error) {
      res.status(500).json({ error: "Failed to update location", details: error.message });
    }
  },

  getSharingStatus: (req, res) => {
    try {
      const sessions = SosModel.getSharedSessions();
      res.json({
        sharingActive: sessions.some(s => s.active),
        contactsCount: sessions.filter(s => s.active).length,
        sessions,
        liveUrl: "https://surakha.live/track/trk_9921_rajesh",
        currentLocation: liveDriverLocation
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sharing status", details: error.message });
    }
  },

  toggleSharingSession: (req, res, io) => {
    try {
      const { sessionId } = req.body;
      const session = SosModel.toggleSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const allSessions = SosModel.getSharedSessions();
      if (io) {
        io.emit("location:sharingUpdate", allSessions);
      }
      res.json({ success: true, session, allSessions });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle sharing session", details: error.message });
    }
  }
};

