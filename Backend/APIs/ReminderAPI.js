import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { Reminder } from "../Models/Reminder.js";

const router = express.Router();

/* GET MY REMINDERS */
router.get("/", verifyToken, async (req, res) => {
  try {
    const reminders = await Reminder.find({ user: req.userId, completed: false }).sort({ remindAt: 1 });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* CREATE REMINDER */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { message, remindAt, channelId } = req.body;
    const reminder = await Reminder.create({
      user: req.userId,
      message,
      remindAt,
      channelId
    });
    res.status(201).json(reminder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* MARK AS COMPLETED */
router.put("/:id/complete", verifyToken, async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(req.params.id, { completed: true }, { new: true });
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
