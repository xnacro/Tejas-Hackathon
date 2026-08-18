import { SosModel } from "../models/sosModel.js";

export const LocationController = {
  getSharingStatus: (req, res) => {
    try {
      const sessions = SosModel.getSharedSessions();
      res.json({
        sharingActive: sessions.some(s => s.active),
        contactsCount: sessions.filter(s => s.active).length,
        sessions,
        liveUrl: "https://surakha.live/track/trk_9921_rajesh"
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
