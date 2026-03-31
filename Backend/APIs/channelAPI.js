import express from "express";
import {
  createOrGetDM,
  getChannels,
  createChannel,
  joinChannel,
} from "../controllers/channelController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getChannels);
router.post("/create", verifyToken, createChannel);
router.post("/:channelId/join", verifyToken, joinChannel);
router.post("/dm", verifyToken, createOrGetDM);

export default router;