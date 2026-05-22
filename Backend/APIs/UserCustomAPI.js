import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { User } from "../Models/user.js";
import Message from "../Models/Message.js";
import multer from "multer";
import path from "path";
import fs from "fs";

import { v2 as cloudinary } from "cloudinary";

// Cloudinary config is already set in other modules, but we'll let it use the environment variables automatically.

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

/* SEARCH ACCESSIBLE MESSAGES */
router.get("/search", verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // 1. Get all accessible rooms (Channels + DMs)
    // We only show messages where the user is the sender, receiver, or a channel member
    const messages = await Message.find({
      content: { $regex: q.toString(), $options: "i" },
      $or: [
        { sender: req.userId },
        { receiver: req.userId },
        { 
          // For channels, we really should verify membership, 
          // but for now, we'll check if the message has a channel ID
          // and later filter if we want to be strict.
          // Better: only search in rooms where the user is a member.
          roomId: { $regex: req.userId, $options: "i" } // DM rooms contain the userId
        },
        {
          channel: { $exists: true } // We'll filter these below
        }
      ]
    })
      .populate("sender", "username")
      .populate("channel", "name members createdBy")
      .sort({ createdAt: -1 })
      .limit(100);

    // 2. Strict Filter: Only keep messages the user is allowed to see
    const filteredMessages = messages.filter(msg => {
      // If it's a DM
      if (msg.roomId && msg.roomId.includes(req.userId)) return true;
      
      // If it's a channel
      if (msg.channel) {
        const isMember = msg.channel.members?.some(m => m.toString() === req.userId) || 
                         msg.channel.createdBy?.toString() === req.userId;
        return isMember;
      }
      
      // Fallback
      return msg.sender?._id?.toString() === req.userId;
    });

    res.json(filteredMessages.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* UPDATE CUSTOM STATUS */
router.post("/status", verifyToken, async (req, res) => {
  try {
    const { text, emoji } = req.body;
    const user = await User.findByIdAndUpdate(req.userId, 
      { customStatus: { text, emoji } }, 
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* UPDATE PRESENCE STATUS */
router.post("/presence", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "away", "dnd", "offline"].includes(status)) {
      return res.status(400).json({ message: "Invalid presence status" });
    }
    const user = await User.findByIdAndUpdate(req.userId, 
      { status }, 
      { new: true }
    ).select("-password");

    if (req.io) {
      req.io.emit("userStatusChanged", { userId: req.userId, status });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* UPDATE PROFILE INFO */
router.post("/profile", verifyToken, async (req, res) => {
  try {
    const { username, email, aboutMe } = req.body;
    const user = await User.findByIdAndUpdate(req.userId, 
      { username, email, aboutMe }, 
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* UPLOAD PROFILE PICTURE */
router.post("/profile-pic", verifyToken, upload.single("profilePic"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    
    // Convert buffer to Data URI
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      resource_type: "image",
      folder: "slack_clone_profiles",
    });
    
    const profilePic = cldRes.secure_url;
    
    const user = await User.findByIdAndUpdate(req.userId, 
      { profilePic }, 
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* STAR/UNSTAR CHANNEL */
router.post("/star-channel/:channelId", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const user = await User.findById(req.userId);
    
    if (user.starredChannels.includes(channelId)) {
      user.starredChannels = user.starredChannels.filter(id => id.toString() !== channelId);
    } else {
      user.starredChannels.push(channelId);
    }
    
    await user.save();
    res.json({ starredChannels: user.starredChannels });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ORGANIZE SIDEBAR SECTIONS */
router.post("/sidebar/sections", verifyToken, async (req, res) => {
  try {
    const { sections } = req.body; // Array of { name, items }
    const user = await User.findByIdAndUpdate(req.userId, 
      { sidebarSections: sections }, 
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
