import express from "express";
import { verifyToken } from '../middleware/verifyToken.js'
import { createOrGetDM } from "../controllers/channelController.js";

const router = express.Router();

router.post("/create", verifyToken, createOrGetDM);

export default router;