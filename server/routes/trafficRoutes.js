import express from "express";
import { TrafficController } from "../controllers/trafficController.js";

const router = express.Router();

router.get("/rules", TrafficController.getRules);
router.get("/rules/:id", TrafficController.getRuleById);

export default router;
