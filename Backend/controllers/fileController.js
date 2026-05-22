import File from "../Models/File.js";

import { v2 as cloudinary } from "cloudinary";

// Cloudinary configuration (will pick up from process.env if available, or can be explicitly set)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a file and save to database
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { workspaceId } = req.body;
    
    // Convert buffer to Data URI
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    // Upload to Cloudinary
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      resource_type: "auto",
      folder: "slack_clone",
    });

    const fileUrl = cldRes.secure_url;

    const newFile = new File({
      name: req.file.originalname,
      url: fileUrl,
      uploader: req.userId,
      workspace: workspaceId || null,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    await newFile.save();
    res.status(201).json(newFile);
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ message: "Error uploading file" });
  }
};

// Get files for a workspace
export const getFiles = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    // Only return files for the given workspace, or personal files if no workspace
    const filter = workspaceId ? { workspace: workspaceId } : { workspace: null, uploader: req.userId };

    const files = await File.find(filter)
      .populate("uploader", "username profilePic")
      .sort({ createdAt: -1 });

    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching files" });
  }
};

// Delete a file
export const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    // Only uploader can delete for now
    if (file.uploader.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to delete this file" });
    }

    await File.findByIdAndDelete(req.params.id);
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting file" });
  }
};
