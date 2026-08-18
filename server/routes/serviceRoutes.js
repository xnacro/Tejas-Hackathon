import express from "express";
import { ServiceController } from "../controllers/serviceController.js";

const router = express.Router();

router.get("/nearby", ServiceController.getServices);
router.get("/nearest-rest", ServiceController.getNearestRestArea);

export default router;
