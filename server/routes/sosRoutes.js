import express from "express";
import { SosController } from "../controllers/sosController.js";

export default function createSosRoutes(io) {
  const router = express.Router();

  router.get("/info", SosController.getSosInfo);
  router.post("/trigger", (req, res) => SosController.triggerSos(req, res, io));

  return router;
}
