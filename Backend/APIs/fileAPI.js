import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken } from "../middleware/verifyToken.js";
import { uploadFile, getFiles, deleteFile } from "../controllers/fileController.js";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.post("/upload", verifyToken, upload.single("file"), uploadFile);
router.get("/", verifyToken, getFiles);
router.delete("/:id", verifyToken, deleteFile);

export default router;
