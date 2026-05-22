import mongoose from "mongoose";

const canvasSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String, // Likely rich text or markdown string
    default: "",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isDraft: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

export const Canvas = mongoose.model("Canvas", canvasSchema);
