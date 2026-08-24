import { DriverModel } from "../models/driverModel.js";
import { PerceptionService } from "../models/perceptionModel.js";

export function setupSockets(io) {
  io.on("connection", (socket) => {
    // Send initial telemetry & perception state
    socket.emit("telemetry:init", DriverModel.getTelemetry());
    socket.emit("perception:init", PerceptionService.getPerceptionSummary());

    // Broadcast AI drowsiness events from client or Python engine
    socket.on("ai:drowsiness", (data) => {
      socket.broadcast.emit("ai:drowsiness:update", data);
    });

    // Broadcast Perception & Path Planning telemetry
    socket.on("perception:update", (data) => {
      socket.broadcast.emit("perception:stream", data);
    });

    // Handle scenario switch
    socket.on("scenario:switch", (scenarioType) => {
      const updated = PerceptionService.triggerScenario(scenarioType);
      io.emit("perception:scenario", updated);
    });

    // Handle real-time speed adjustment simulation
    socket.on("speed:change", (speed) => {
      const updated = DriverModel.updateTelemetry({ speed });
      io.emit("telemetry:update", updated);
    });

    socket.on("disconnect", () => {
      // client disconnected
    });
  });
}

