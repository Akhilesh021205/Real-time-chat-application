import mongoose from "mongoose";
import dotenv from "dotenv";
import { Workspace } from "./Models/workspace.js";
import { User } from "./Models/user.js";

dotenv.config();

async function main() {
  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB");

  const shiva = await User.findOne({ email: "[EMAIL_ADDRESS]" });
  if (!shiva) {
    console.error("Shiva user not found!");
    await mongoose.disconnect();
    return;
  }

  const userId = shiva._id.toString();
  console.log(`\nDebugging for Shiva (ID: ${userId}, Email: ${shiva.email})`);

  const workspaces = await Workspace.find({
    $or: [
      { owner: userId },
      { members: userId },
      { admins: userId }
    ]
  }).populate("owner members admins", "username email profileImage status");

  console.log("\n--- Query results BEFORE sorting ---");
  workspaces.forEach((w, idx) => {
    console.log(`[${idx}] ID: ${w._id}, Name: ${w.name}`);
    console.log(`    Owner field type: ${typeof w.owner}`);
    console.log(`    Owner populated Object:`, w.owner);
    console.log(`    Owner ID string: ${w.owner?._id?.toString()}`);
  });

  // Run the sort
  workspaces.sort((a, b) => {
    const aIsOwner = a.owner?._id?.toString() === userId || a.owner?.toString() === userId;
    const bIsOwner = b.owner?._id?.toString() === userId || b.owner?.toString() === userId;
    console.log(`\nComparing ${a.name} vs ${b.name}:`);
    console.log(`  - ${a.name} is owner? ${aIsOwner} (owner ID: ${a.owner?._id?.toString() || a.owner?.toString()})`);
    console.log(`  - ${b.name} is owner? ${bIsOwner} (owner ID: ${b.owner?._id?.toString() || b.owner?.toString()})`);
    if (aIsOwner && !bIsOwner) return -1;
    if (!aIsOwner && bIsOwner) return 1;
    return 0;
  });

  console.log("\n--- Query results AFTER sorting ---");
  workspaces.forEach((w, idx) => {
    console.log(`[${idx}] ID: ${w._id}, Name: ${w.name}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
