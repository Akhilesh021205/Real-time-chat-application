import express from "express";
import { User } from "../Models/user.js";
import { searchUsers } from "../controllers/userController.js";

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* SEARCH USERS */
router.get("/search", searchUsers);

export default router;