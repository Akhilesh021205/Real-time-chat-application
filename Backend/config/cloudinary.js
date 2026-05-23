import { v2 as cloudinary } from "cloudinary";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getRawPublicId = (file) => {
  const parsed = path.parse(file.originalname || "attachment");
  const safeName = (parsed.name || "attachment")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeName || "attachment"}-${Date.now()}.pdf`;
};

export const uploadBufferToCloudinary = async (file, folder) => {
  const b64 = Buffer.from(file.buffer).toString("base64");
  const dataURI = `data:${file.mimetype};base64,${b64}`;
  const isPdf = file.mimetype === "application/pdf";

  return cloudinary.uploader.upload(dataURI, {
    resource_type: isPdf ? "raw" : "auto",
    folder,
    public_id: isPdf ? getRawPublicId(file) : undefined,
    use_filename: true,
    unique_filename: true,
  });
};

export default cloudinary;
