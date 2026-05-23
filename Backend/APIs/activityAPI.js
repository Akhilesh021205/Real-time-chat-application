import express from "express";
import {
  getActivityFeed,
  markActivityItemRead,
  markAllActivityRead,
} from "../controllers/activityController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getActivityFeed);
router.put("/read", verifyToken, markActivityItemRead);
router.put("/read-all", verifyToken, markAllActivityRead);

export default router;
