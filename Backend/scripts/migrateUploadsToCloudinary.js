import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import File from "../Models/File.js";
import Message from "../Models/Message.js";

// Load env from project root (Backend/.env or parent .env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOADS_DIR = path.resolve(__dirname, "../uploads");

async function uploadFileToCloudinary(filePath) {
  return cloudinary.uploader.upload(filePath, {
    resource_type: "auto",
    folder: "slack_clone/migrated_uploads",
  });
}

async function run() {
  try {
    await connectDB();

    if (!fs.existsSync(UPLOADS_DIR)) {
      console.log("No uploads directory found at", UPLOADS_DIR);
      process.exit(0);
    }

    const files = fs.readdirSync(UPLOADS_DIR).filter((f) => f && f[0] !== ".");
    if (!files.length) {
      console.log("No files to migrate in", UPLOADS_DIR);
      process.exit(0);
    }

    console.log(`Found ${files.length} files to migrate`);

    const summary = [];

    for (const fileName of files) {
      const localPath = path.join(UPLOADS_DIR, fileName);
      if (!fs.statSync(localPath).isFile()) continue;

      console.log("Uploading", fileName);
      let cldRes;
      try {
        cldRes = await uploadFileToCloudinary(localPath);
      } catch (err) {
        console.error("Cloudinary upload failed for", fileName, err.message || err);
        summary.push({ fileName, status: "upload_failed", error: String(err) });
        continue;
      }

      const secureUrl = cldRes.secure_url;

      // Update File documents that reference this local path or filename
      const fileFilter = {
        $or: [
          { url: { $regex: fileName, $options: "i" } },
          { url: { $regex: "/uploads/" + fileName, $options: "i" } },
        ],
      };

      const updatedFiles = await File.updateMany(fileFilter, { $set: { url: secureUrl, mimetype: cldRes.resource_type || undefined } });

      // Update Message attachments referring to this filename
      const msgFilter = { attachment: { $regex: fileName, $options: "i" } };
      const updatedMessages = await Message.updateMany(msgFilter, { $set: { attachment: secureUrl } });

      summary.push({ fileName, status: "ok", url: secureUrl, filesUpdated: updatedFiles.nModified || updatedFiles.modifiedCount || 0, messagesUpdated: updatedMessages.nModified || updatedMessages.modifiedCount || 0 });

      console.log("Migrated", fileName, "->", secureUrl);
    }

    console.log("Migration summary:");
    console.table(summary.map((s) => ({ file: s.fileName, status: s.status, url: s.url || "", filesUpdated: s.filesUpdated || 0, messagesUpdated: s.messagesUpdated || 0 })));
    process.exit(0);
  } catch (err) {
    console.error("Migration error", err);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

export default run;
