import express from "express";
import {
  sendMessage,
  getChannelMessages,
  getDMMessages,
  replyToMessage,
  getThreadReplies,
  editMessage,
  toggleReaction,
  togglePin,
  toggleSave,
  markRoomAsRead,
} from "../controllers/messageController.js";
import { verifyToken } from "../middleware/verifyToken.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync("uploads", { recursive: true });
    } catch {
      // ignore; multer will surface write errors if any
    }
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const router = express.Router();

// Upload route
router.post("/upload", verifyToken, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ fileUrl });
});

router.get("/thread/:messageId", verifyToken, getThreadReplies);
router.post("/reply", verifyToken, replyToMessage);

// DM messages
router.get("/dm/:receiverId", verifyToken, getDMMessages);

// THEN generic
router.post("/send", verifyToken, sendMessage);
router.get("/:channelId", verifyToken, getChannelMessages);
router.put("/edit/:messageId", verifyToken, editMessage);
router.post("/react/:messageId", verifyToken, toggleReaction);
router.post("/pin/:messageId", verifyToken, togglePin);
router.post("/save/:messageId", verifyToken, toggleSave);
router.post("/read/:roomId", verifyToken, markRoomAsRead);

export default router;