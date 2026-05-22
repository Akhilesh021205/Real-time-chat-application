import express from "express";
import { getActivityFeed } from "../controllers/activityController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getActivityFeed);

export default router;
