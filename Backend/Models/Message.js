import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ✅ FOR CHANNEL MESSAGES */
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
    },

    /* ✅ FOR DIRECT MESSAGES */
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // A stable room identifier for both channels and DMs
    roomId: {
      type: String,
      default: null,
    },

    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    
    isEdited: {
      type: Boolean,
      default: false,
    },

    reactions: [
      {
        emoji: String,
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],

    attachment: {
      type: String, // URL or path to the file
      default: null,
    },

    isPinned: {
      type: Boolean,
      default: false,
    },

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Message", messageSchema);