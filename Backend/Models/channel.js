import mongoose from "mongoose";
import crypto from "crypto";

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
  },

  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // 🔥 NEW: members for DM or private channels
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  admins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],


  isDM: {
    type: Boolean,
    default: false,
  },

  isPrivate: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  inviteCode: {
    type: String,
    unique: true,
    sparse: true,
    default: () => crypto.randomBytes(4).toString('hex').toUpperCase()
  },
});

export const Channel = mongoose.model("Channel", channelSchema);