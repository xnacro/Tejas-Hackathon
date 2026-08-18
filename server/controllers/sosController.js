import { SosModel } from "../models/sosModel.js";

export const SosController = {
  getSosInfo: (req, res) => {
    try {
      const info = SosModel.getSosInfo();
      res.json(info);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SOS info", details: error.message });
    }
  },
  triggerSos: (req, res, io) => {
    try {
      const incident = SosModel.triggerSos(req.body);
      if (io) {
        io.emit("sos:active", incident);
      }
      res.status(200).json({
        success: true,
        message: "SOS Emergency Triggered & Highway Patrol Dispatched",
        incident
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to trigger SOS", details: error.message });
    }
  }
};
