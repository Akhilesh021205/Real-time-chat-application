import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server as IOServer } from "socket.io";
import dotenv from "dotenv";
import session from "express-session";

import passport from "./config/passport.js";
import { connectDB } from "./config/db.js";
import { verifyToken } from "./middleware/verifyToken.js";
import { Channel } from "./Models/channel.js";

import messageAPI from "./APIs/messageAPI.js";
import dmAPI from "./APIs/dmAPI.js";
import channelAPI from "./APIs/channelAPI.js";
import workspaceAPI from "./APIs/workspaceAPI.js";
import userAPI from "./APIs/userAPI.js";
import botAPI from "./APIs/botAPI.js";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  googleAuthRedirect,
  googleAuthCallback,
  forgotPassword,
  resetPassword,
} from "./controllers/authController.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */
const io = new IOServer(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

/* MAKE IO GLOBAL */
app.use((req, res, next) => {
  req.io = io;
  next();
});

/* ================= MIDDLEWARE ================= */
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.JWT_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Static folder for uploads
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES ================= */
app.use("/api/messages", messageAPI);
app.use("/api/dm", dmAPI);
app.use("/api/channels", channelAPI);
app.use("/api/workspaces", workspaceAPI);
app.use("/api/users", userAPI);
app.use("/api/bot", botAPI);

/* ================= AUTH ================= */
app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginUser);
app.post("/api/auth/logout", verifyToken, logoutUser);
app.get("/api/auth/me", verifyToken, getCurrentUser);

/* ================= GOOGLE ================= */
app.get("/api/auth/google", googleAuthRedirect);
app.get("/api/auth/google/callback", googleAuthCallback);

/* ================= PASSWORD ================= */
app.post("/api/auth/forgot-password", forgotPassword);
app.post("/api/auth/reset-password/:token", resetPassword);

/* ================= SOCKET LOGIC ================= */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const isMemberOfChannel = (channel, userId) => {
    if (!channel) return false;
    const uid = userId?.toString?.();
    const isOwner = channel.createdBy?.toString?.() === uid;
    const isMember = (channel.members || []).some(
      (m) => m?.toString?.() === uid
    );
    return isOwner || isMember;
  };

  /* ✅ JOIN CHANNEL (Slack-style) */
  socket.on("joinChannel", async ({ channelId, userId }) => {
    if (!channelId || !userId) return;

    try {
      const channel = await Channel.findById(channelId);
      if (!isMemberOfChannel(channel, userId)) return;

      socket.join(channelId);
      console.log(`Joined channel: ${channelId}`);
    } catch (err) {
      console.error("joinChannel error", err);
    }
  });

  /* ✅ LEAVE CHANNEL */
  socket.on("leaveChannel", (channelId) => {
    if (!channelId) return;
    socket.leave(channelId);
    console.log(`Left channel: ${channelId}`);
  });

  /* ✅ JOIN DM ROOM */
  socket.on("joinDM", ({ room, userId, username }) => {
    if (!room || !userId) return;

    const parts = String(room).split("_");
    if (parts.length !== 2 || !parts.includes(userId)) return;

    socket.join(room);
    console.log(`${username} joined DM: ${room}`);
  });

  /* ✅ LEAVE DM */
  socket.on("leaveDM", ({ room, username }) => {
    if (!room) return;
    socket.leave(room);
    console.log(`${username} left DM: ${room}`);
  });

  /* ✅ TYPING (CHANNEL OR DM) */
  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("typing", { username });
  });

  socket.on("stop_typing", ({ room, username }) => {
    socket.to(room).emit("stop_typing", { username });
  });

  /* ❌ REMOVE THIS (conflicts with DB messages)
  socket.on("message", (msg) => {
    io.to(msg.room).emit("message", msg);
  });
  */

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
})();