import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  remindAt: {
    type: Date,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  channelId: {
    type: String, // Link to the conversation if applicable
  }
}, { timestamps: true });

export const Reminder = mongoose.model("Reminder", reminderSchema);
