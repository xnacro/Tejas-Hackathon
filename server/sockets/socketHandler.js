import { DriverModel } from "../models/driverModel.js";

export function setupSockets(io) {
  io.on("connection", (socket) => {
    // Send initial telemetry state
    socket.emit("telemetry:init", DriverModel.getTelemetry());

    // Broadcast AI drowsiness events from client or Python engine
    socket.on("ai:drowsiness", (data) => {
      socket.broadcast.emit("ai:drowsiness:update", data);
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
