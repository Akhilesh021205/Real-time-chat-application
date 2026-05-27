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
import { User } from "./Models/user.js";
import { Workspace } from "./Models/workspace.js";

import messageAPI from "./APIs/messageAPI.js";
import dmAPI from "./APIs/dmAPI.js";
import channelAPI from "./APIs/channelAPI.js";
import workspaceAPI from "./APIs/workspaceAPI.js";
import userAPI from "./APIs/userAPI.js";
import botAPI from "./APIs/botAPI.js";
import canvasAPI from "./APIs/CanvasAPI.js";
import customAPI from "./APIs/UserCustomAPI.js";
import reminderAPI from "./APIs/ReminderAPI.js";
import notificationAPI from "./APIs/notificationAPI.js";
import activityAPI from "./APIs/activityAPI.js";
import fileAPI from "./APIs/fileAPI.js";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  googleAuthRedirect,
  googleAuthCallback,
  sendPasswordResetOTP,
  verifyOTPAndReset,
} from "./controllers/authController.js";
import { initCache } from "./utils/cache.js";
import { globalLimiter, authLimiter } from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return origin.endsWith(".vercel.app") || origin.endsWith(".onrender.com");
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  optionsSuccessStatus: 200,
};

/* ================= SOCKET.IO ================= */
const io = new IOServer(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Socket.IO CORS blocked origin: ${origin}`));
    },
    credentials: true,
  },
});

/* MAKE IO GLOBAL */
app.use((req, res, next) => {
  req.io = io;
  next();
});

/* ================= MIDDLEWARE ================= */
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors(corsOptions));
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

// Static folder for uploads (legacy support for local files before Cloudinary migration)
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES ================= */
const v1Router = express.Router();

// Apply global rate limiting to all API v1 endpoints
v1Router.use(globalLimiter);

// Sub-routes mapping
v1Router.use("/messages", messageAPI);
v1Router.use("/dm", dmAPI);
v1Router.use("/channels", channelAPI);
v1Router.use("/workspaces", workspaceAPI);
v1Router.use("/users", userAPI);
v1Router.use("/bot", botAPI);
v1Router.use("/canvas", canvasAPI);
v1Router.use("/custom", customAPI);
v1Router.use("/reminders", reminderAPI);
v1Router.use("/notifications", notificationAPI);
v1Router.use("/activity", activityAPI);
v1Router.use("/files", fileAPI);

/* ================= AUTH ================= */
v1Router.post("/auth/register", authLimiter, registerUser);
v1Router.post("/auth/login", authLimiter, loginUser);
v1Router.post("/auth/logout", verifyToken, logoutUser);
v1Router.get("/auth/me", verifyToken, getCurrentUser);

/* ================= GOOGLE ================= */
v1Router.get("/auth/google", googleAuthRedirect);
v1Router.get("/auth/google/callback", googleAuthCallback);

/* ================= PASSWORD RESET (OTP) ================= */
v1Router.post("/auth/reset-password", async (req, res, next) => {
  // Simple password reset (no OTP). Accepts { email, newPassword } and updates the user's password.
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: "Email and newPassword are required" });
    const { resetPassword } = await import('./controllers/authController.js');
    return resetPassword(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Mount the versioned router
app.use("/api/v1", v1Router);
app.use("/api", v1Router); // Backwards compatibility for frontend

/* ================= SOCKET LOGIC ================= */
const onlineUsers = new Map(); // socket.id -> userId

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const isMemberOfChannel = async (channel, userId) => {
    if (!channel) return false;
    const uid = userId?.toString?.();
    const isOwner = channel.createdBy?.toString?.() === uid;
    const isMember = (channel.members || []).some(
      (m) => m?.toString?.() === uid
    );
    const isAdmin = (channel.admins || []).some(
      (a) => a?.toString?.() === uid
    );
    if (isOwner || isMember || isAdmin) return true;
    if (channel.isPrivate || !channel.workspace) return false;

    const workspace = await Workspace.findById(channel.workspace).select("owner members admins");
    if (!workspace) return false;
    return (
      workspace.owner?.toString() === uid ||
      workspace.members.some((m) => m.toString() === uid) ||
      workspace.admins.some((a) => a.toString() === uid)
    );
  };

  /* ✅ GO ONLINE (Presence) */
  socket.on("goOnline", async ({ userId }) => {
    if (!userId) return;
    onlineUsers.set(socket.id, userId);
    socket.join(`user:${userId}`);
    try {
      const existing = await User.findById(userId).select("status");
      const keepManual =
        existing?.status === "away" || existing?.status === "dnd";
      const nextStatus = keepManual ? existing.status : "active";

      if (!keepManual) {
        await User.findByIdAndUpdate(userId, { status: nextStatus });
      }
      io.emit("userStatusChanged", { userId, status: nextStatus });
      console.log(`User ${userId} presence: ${nextStatus}`);
    } catch (err) {
      console.error("goOnline error", err);
    }
  });

  /* ✅ JOIN CHANNEL (Slack-style) */
  socket.on("joinChannel", async (data) => {
    const { channelId, room, userId } = typeof data === 'string' ? { channelId: data } : data;
    const targetChannelId = channelId || room;
    if (!targetChannelId || !userId) return;

    try {
      const channel = await Channel.findById(targetChannelId);
      if (!(await isMemberOfChannel(channel, userId))) return;

      socket.join(targetChannelId);
      console.log(`Joined channel: ${targetChannelId}`);
    } catch (err) {
      console.error("joinChannel error", err);
    }
  });

  /* ✅ LEAVE CHANNEL */
  socket.on("leaveChannel", (data) => {
    const channelId = typeof data === 'string' ? data : data?.channelId;
    if (!channelId) return;
    socket.leave(channelId);
    console.log(`Left channel: ${channelId}`);
  });

  /* ✅ JOIN DM ROOM */
  socket.on("joinDM", ({ room, userId, username }) => {
    if (!room || !userId) return;

    const roomStr = String(room);
    const uid = String(userId);
    const parts = roomStr.split("_");
    if (parts.length !== 2) return;

    const isSlackbotRoom = parts.includes("slackbot");
    const isParticipant = parts.includes(uid);
    if (!isSlackbotRoom && !isParticipant) return;

    socket.join(roomStr);
    console.log(`${username} joined DM: ${roomStr}`);
  });

  /* ✅ LEAVE DM */
  socket.on("leaveDM", ({ room, username }) => {
    if (!room) return;
    socket.leave(room);
    console.log(`${username} left DM: ${room}`);
  });

  /* ✅ JOIN WORKSPACE (for global team notifications like new channels) */
  socket.on("joinWorkspace", ({ workspaceId }) => {
    if (!workspaceId) return;
    socket.join(workspaceId);
    console.log(`User joined workspace room: ${workspaceId}`);
  });

  /* ✅ HUDDLES (WebRTC signaling) */
  socket.on("huddle:join", ({ roomId, user }) => {
    if (!roomId) return;
    const roomName = `huddle:${roomId}`;
    const room = io.sockets.adapter.rooms.get(roomName);
    const participants = room ? Array.from(room).filter((id) => id !== socket.id) : [];

    socket.join(roomName);
    socket.data.huddleRoom = roomName;
    socket.data.huddleUser = user;

    socket.emit("huddle:participants", { participants });
    socket.to(roomName).emit("huddle:user-joined", {
      socketId: socket.id,
      user,
    });
  });

  socket.on("huddle:offer", ({ to, offer }) => {
    if (!to || !offer) return;
    io.to(to).emit("huddle:offer", {
      from: socket.id,
      offer,
      user: socket.data.huddleUser,
    });
  });

  socket.on("huddle:answer", ({ to, answer }) => {
    if (!to || !answer) return;
    io.to(to).emit("huddle:answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("huddle:ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("huddle:ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("huddle:leave", ({ roomId }) => {
    const roomName = roomId ? `huddle:${roomId}` : socket.data.huddleRoom;
    if (!roomName) return;
    socket.leave(roomName);
    socket.to(roomName).emit("huddle:user-left", { socketId: socket.id });
    if (socket.data.huddleRoom === roomName) {
      delete socket.data.huddleRoom;
      delete socket.data.huddleUser;
    }
  });

  /* ✅ TYPING (CHANNEL OR DM) */
  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("typing", { username });
  });

  socket.on("stop_typing", ({ room, username }) => {
    socket.to(room).emit("stop_typing", { username });
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    if (socket.data.huddleRoom) {
      socket.to(socket.data.huddleRoom).emit("huddle:user-left", { socketId: socket.id });
    }

    const userId = onlineUsers.get(socket.id);
    if (userId) {
      onlineUsers.delete(socket.id);
      
      // Check if user has other active connections before marking offline
      const otherSockets = Array.from(onlineUsers.values()).filter(id => id === userId);
      if (otherSockets.length === 0) {
        try {
          await User.findByIdAndUpdate(userId, { status: "offline" });
          io.emit("userStatusChanged", { userId, status: "offline" });
          console.log(`User ${userId} is now offline`);
        } catch (err) {
          console.error("disconnect presence error", err);
        }
      }
    }
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB();
    await initCache();

    // Reset all statuses to offline on startup to prevent "stuck" active users
    try {
      await User.updateMany({}, { status: "offline" });
      console.log("All user statuses reset to offline.");
    } catch (err) {
      console.error("Status reset error", err);
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
})();
