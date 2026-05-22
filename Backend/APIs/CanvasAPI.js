import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { Canvas } from "../Models/Canvas.js";

const router = express.Router();

/* GET ALL CANVAS NOTES */
router.get("/", verifyToken, async (req, res) => {
  try {
    const notes = await Canvas.find().populate("createdBy", "username profilePic");
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* CREATE CANVAS NOTE */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = await Canvas.create({
      title,
      content,
      createdBy: req.userId,
    });
    const populated = await note.populate("createdBy", "username profilePic");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* UPDATE CANVAS NOTE */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const note = await Canvas.findByIdAndUpdate(req.params.id, 
      { title, content }, 
      { new: true }
    ).populate("createdBy", "username profilePic");
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* DELETE CANVAS NOTE */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await Canvas.findByIdAndDelete(req.params.id);
    res.json({ message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
