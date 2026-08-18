import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { configDotenv } from "dotenv";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import trafficRoutes from "./routes/trafficRoutes.js";
import createHazardRoutes from "./routes/hazardRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import createDriverRoutes from "./routes/driverRoutes.js";
import createSosRoutes from "./routes/sosRoutes.js";
import createLocationRoutes from "./routes/locationRoutes.js";
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
    architecture: "MVC",
    system: "Surakha AI Driver Safety Gateway",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/traffic", trafficRoutes);
app.use("/api/hazards", createHazardRoutes(io));
app.use("/api/services", serviceRoutes);
app.use("/api/driver", createDriverRoutes(io));
app.use("/api/vehicle", createDriverRoutes(io));
app.use("/api/sos", createSosRoutes(io));
app.use("/api/location", createLocationRoutes(io));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Surakha Express & Socket.io server running on http://localhost:${PORT}`);
});
