import express from "express";
import {
  createOrGetDM,
  getChannels,
  browseChannels,
  createChannel,
  joinChannel,
  addMembers,
  getChannelInviteCode,
  regenerateChannelInviteCode,
  joinChannelByCode,
  getActiveDMs,
} from "../controllers/channelController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getChannels);
router.get("/browse", verifyToken, browseChannels);
router.get("/dms/active", verifyToken, getActiveDMs);
router.post("/create", verifyToken, createChannel);
router.post("/join-by-code", verifyToken, joinChannelByCode);
router.get("/:channelId/invite-code", verifyToken, getChannelInviteCode);
router.post("/:channelId/regenerate-invite-code", verifyToken, regenerateChannelInviteCode);
router.post("/:channelId/join", verifyToken, joinChannel);
router.post("/:channelId/add-members", verifyToken, addMembers);
router.post("/dm", verifyToken, createOrGetDM);

export default router;