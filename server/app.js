import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { configDotenv } from "dotenv";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import createTrafficRoutes from "./routes/trafficRoutes.js";
import createHazardRoutes from "./routes/hazardRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import createDriverRoutes from "./routes/driverRoutes.js";
import createSosRoutes from "./routes/sosRoutes.js";
import createLocationRoutes from "./routes/locationRoutes.js";
import createPerceptionRoutes from "./routes/perceptionRoutes.js";
import { setupSockets } from "./sockets/socketHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configDotenv({ path: path.join(__dirname, ".env") });

const app = express();
const server = http.createServer(app);

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Setup real-time sockets
setupSockets(io);

app.use(cors());
app.use(express.json());

// ----------------- MVC API Routing -----------------
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    architecture: "MVC + Real-Time Perception Stream",
    system: "ADAPT-INDIA — Adaptive Perception-to-Path Planning (SIH26037)",
    organization: "MathWorks",
    team: "Legacy Coderz",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/traffic", createTrafficRoutes(io));
app.use("/api/safety", createTrafficRoutes(io));
app.use("/api/hazards", createHazardRoutes(io));
app.use("/api/services", serviceRoutes);
app.use("/api/places", serviceRoutes);
app.use("/api/driver", createDriverRoutes(io));
app.use("/api/vehicle", createDriverRoutes(io));
app.use("/api/sos", createSosRoutes(io));
app.use("/api/location", createLocationRoutes(io));

// ADAPT-INDIA Perception & Path Planning Service APIs
app.use("/api/perception", createPerceptionRoutes(io));
app.use("/api/lidar", createPerceptionRoutes(io));
app.use("/api/tracking", createPerceptionRoutes(io));
app.use("/api/prediction", createPerceptionRoutes(io));
app.use("/api/risk", createPerceptionRoutes(io));
app.use("/api/planning", createPerceptionRoutes(io));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`ADAPT-INDIA Express & Socket.io server running on http://localhost:${PORT}`);
});

