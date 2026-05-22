import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
    },
    size: {
      type: Number,
      default: 0,
    },
    mimetype: {
      type: String,
      default: "application/octet-stream",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("File", fileSchema);
