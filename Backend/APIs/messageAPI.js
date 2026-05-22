import express from "express";
import {
  sendMessage,
  getChannelMessages,
  getDMMessages,
  replyToMessage,
  getThreadReplies,
  editMessage,
  deleteMessage,
  toggleReaction,
  togglePin,
  toggleSave,
  markRoomAsRead,
} from "../controllers/messageController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import multer from "multer";
import path from "path";
import fs from "fs";

import { v2 as cloudinary } from "cloudinary";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Upload route
router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Convert buffer to Data URI
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    // Upload to Cloudinary
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
      folder: "slack_clone_messages",
    });

    const fileUrl = cldRes.secure_url;
    res.json({ fileUrl });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ message: "Error uploading file" });
  }
});

router.get("/thread/:messageId", verifyToken, getThreadReplies);
router.post("/reply", verifyToken, replyToMessage);

// DM messages
router.get("/dm/:receiverId", verifyToken, getDMMessages);

// THEN generic
router.post("/send", verifyToken, sendMessage);
router.get("/:channelId", verifyToken, getChannelMessages);
router.put("/edit/:messageId", verifyToken, editMessage);
router.delete("/delete/:messageId", verifyToken, deleteMessage);
router.post("/react/:messageId", verifyToken, toggleReaction);
router.post("/pin/:messageId", verifyToken, togglePin);
router.post("/save/:messageId", verifyToken, toggleSave);
router.post("/read/:roomId", verifyToken, markRoomAsRead);

export default router;