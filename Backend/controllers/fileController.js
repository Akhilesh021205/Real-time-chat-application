import File from "../Models/File.js";
import { Readable } from "stream";

import { uploadBufferToCloudinary } from "../config/cloudinary.js";

// Upload a file and save to database
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { workspaceId } = req.body;
    
    const cldRes = await uploadBufferToCloudinary(req.file, "slack_clone");

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

// Proxy an external file URL (server-side fetch) to avoid client-side auth/CORS issues.
export const proxyFile = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ message: "Missing url parameter" });

    // Basic host whitelist to avoid open proxy abuse
    const allowedHosts = ["res.cloudinary.com", "cloudinary.com"];
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      return res.status(400).json({ message: "Invalid url" });
    }

    const hostname = parsed.hostname;
    const allowed = allowedHosts.some((h) => hostname.endsWith(h));
    if (!allowed) return res.status(403).json({ message: "Proxy to this host is not allowed" });

    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return res.status(resp.status).send(text || "Failed to fetch resource");
    }

    // Forward relevant headers
    const upstreamContentType =
      resp.headers.get("content-type") || "application/octet-stream";
    const isPdf = parsed.pathname.toLowerCase().split("?")[0].endsWith(".pdf");
    const contentType = isPdf ? "application/pdf" : upstreamContentType;
    res.setHeader("Content-Type", contentType);
    if (isPdf) {
      res.setHeader("Content-Disposition", "inline");
    }
    const contentLength = resp.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    // Stream response body
    const body = resp.body;
    if (!body) return res.status(500).send("No response body from upstream");
    Readable.fromWeb(body).pipe(res);
  } catch (err) {
    console.error("proxyFile error", err);
    res.status(500).json({ message: "Proxy error" });
  }
};
