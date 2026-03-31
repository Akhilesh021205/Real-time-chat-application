import { User } from "../Models/user.js";
import mongoose from "mongoose";

export const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;

    console.log("QUERY:", query);
    console.log("USER ID:", req.userId);

    const filter = {
      username: { $regex: query, $options: "i" },
    };

    if (req.userId && mongoose.Types.ObjectId.isValid(req.userId)) {
      filter._id = { $ne: new mongoose.Types.ObjectId(req.userId) };
    }

    const users = await User.find(filter).select("_id username");

    console.log("RESULT:", users);

    res.json(users);
  } catch (err) {
    console.error(err);
    next(err);
  }
};