import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken } from "../middleware/verifyToken.js";
import { uploadFile, getFiles, deleteFile, proxyFile } from "../controllers/fileController.js";
import cloudinary from "../config/cloudinary.js";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.post("/upload", verifyToken, upload.single("file"), uploadFile);
router.get("/", verifyToken, getFiles);
// Allow public access to the proxy endpoint so clients can load
// whitelisted external files (PDFs/images) without needing auth cookies.
// The proxy itself enforces a host whitelist to avoid open proxy abuse.
router.get("/proxy", proxyFile);
router.delete("/:id", verifyToken, deleteFile);

export default router;
