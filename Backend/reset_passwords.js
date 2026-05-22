import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { User } from "./Models/user.js";

dotenv.config();

async function main() {
  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB");

  const shiva = await User.findOne({ email: "shivareddy@gmail.com" });
  if (!shiva) {
    console.error("Shiva not found");
  } else {
    const hashedPassword = await bcrypt.hash("password123", 10);
    shiva.password = hashedPassword;
    await shiva.save();
    console.log("Successfully reset shivareddy@gmail.com password to 'password123'");
  }

  const akhilesh = await User.findOne({ email: "akhileshgoud270@gmail.com" });
  if (!akhilesh) {
    console.error("Akhilesh not found");
  } else {
    const hashedPassword = await bcrypt.hash("password123", 10);
    akhilesh.password = hashedPassword;
    await akhilesh.save();
    console.log("Successfully reset akhileshgoud270@gmail.com password to 'password123'");
  }

  await mongoose.disconnect();
}

main().catch(console.error);
