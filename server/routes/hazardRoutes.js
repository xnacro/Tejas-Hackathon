import express from "express";
import { HazardController } from "../controllers/hazardController.js";

export default function createHazardRoutes(io) {
  const router = express.Router();

  router.get("/", HazardController.getHazards);
  router.post("/", (req, res) => HazardController.createHazard(req, res, io));
  router.post("/:id/upvote", (req, res) => HazardController.upvoteHazard(req, res, io));

  return router;
}
