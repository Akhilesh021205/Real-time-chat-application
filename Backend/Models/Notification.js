import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  type: {
    type: String,
    enum: ["invite", "mention", "dm", "reaction", "thread"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  context: {
    type: String, // e.g., "Workspace Invite", "#general", "Direct Message"
  },
  link: {
    type: String, // Optional link to redirect (e.g., /workspaces/join/CODE)
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Notification = mongoose.model("Notification", notificationSchema);
